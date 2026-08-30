import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.inspection import Inspection
from app.schemas.inspection import InspectionStatus
from app.schemas.compliance import EvaluationStatus, OverallAssessment
from app.core.database import Base, get_db

# Setup in-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_environment():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_inspection(db_session):
    # Setup a base inspection
    inspection = Inspection(
        status=InspectionStatus.COMPLIANCE_EVALUATED,
        product_category="retail",
        package_context="retail",
        image_paths=["fake.jpg"],
        extracted_data={"mrp": {"value": "₹10", "confidence": "HIGH"}},
        verified_data={
            "data": {"mrp": "₹20", "net_quantity": "500g"},
            "metadata": {"reviewed_at": datetime.utcnow().isoformat(), "changed_fields": ["mrp"]}
        },
        compliance_results={
            "is_compliant": False,
            "results": [
                {
                    "rule_id": "rule_1",
                    "status": "FAIL",
                    "explanation": "Missing required field",
                    "source_reference": {
                        "source_document": "Packaged Commodities Rules",
                        "source_rule": "Rule 6",
                        "source_clause": "1(a)",
                        "source_amendment_year": "2011"
                    },
                    "evidence": None,
                    "severity": "high"
                },
                {
                    "rule_id": "rule_2",
                    "status": "REQUIRES_HUMAN_REVIEW",
                    "explanation": "Needs human check",
                    "source_reference": {
                        "source_document": "Packaged Commodities Rules",
                        "source_rule": "Rule 7",
                        "source_clause": "2",
                        "source_amendment_year": "2011"
                    },
                    "evidence": None,
                    "severity": "medium"
                }
            ],
            "total_rules_evaluated": 2,
            "pending_human_reviews": 1,
            "scoring": {
                "score": 40,
                "assessment": "NON_COMPLIANT",
                "is_provisional": True,
                "earned_weight": 4,
                "applicable_weight": 10,
                "failed_rule_count": 1,
                "review_required_count": 1
            }
        },
        compliance_score=40
    )
    db_session.add(inspection)
    db_session.commit()
    db_session.refresh(inspection)
    return inspection

@pytest.fixture
def compliant_inspection(db_session):
    inspection = Inspection(
        status=InspectionStatus.COMPLIANCE_EVALUATED,
        product_category="retail",
        package_context="retail",
        image_paths=["fake.jpg"],
        extracted_data={"mrp": {"value": "₹10", "confidence": "HIGH"}},
        verified_data={
            "data": {"mrp": "₹10", "net_quantity": "500g"},
            "metadata": {"reviewed_at": datetime.utcnow().isoformat(), "changed_fields": []}
        },
        compliance_results={
            "is_compliant": True,
            "results": [
                {
                    "rule_id": "rule_1",
                    "status": "PASS",
                    "explanation": "Field present",
                    "source_reference": {
                        "source_document": "Packaged Commodities Rules",
                        "source_rule": "Rule 6",
                        "source_clause": "1(a)",
                        "source_amendment_year": "2011"
                    },
                    "evidence": None,
                    "severity": "high"
                }
            ],
            "total_rules_evaluated": 1,
            "pending_human_reviews": 0,
            "scoring": {
                "score": 100,
                "assessment": "COMPLIANT",
                "is_provisional": False,
                "earned_weight": 10,
                "applicable_weight": 10,
                "failed_rule_count": 0,
                "review_required_count": 0
            }
        },
        compliance_score=100
    )
    db_session.add(inspection)
    db_session.commit()
    db_session.refresh(inspection)
    return inspection

@pytest.fixture
def unevaluated_inspection(db_session):
    inspection = Inspection(
        status=InspectionStatus.HUMAN_VERIFIED,
        product_category="retail",
        package_context="retail",
        image_paths=["fake.jpg"],
        verified_data={
            "data": {"mrp": "₹10"},
            "metadata": {}
        }
    )
    db_session.add(inspection)
    db_session.commit()
    db_session.refresh(inspection)
    return inspection

def test_report_compliant_inspection(compliant_inspection):
    """Test #1: evaluated compliant inspection returns report"""
    response = client.get(f"/api/inspections/{compliant_inspection.id}/report")
    assert response.status_code == 200
    data = response.json()
    assert data["assessment"]["assessment"] == "COMPLIANT"

def test_report_non_compliant_inspection(test_inspection):
    """Test #2: evaluated non-compliant inspection returns report"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    assert response.status_code == 200
    data = response.json()
    assert data["assessment"]["assessment"] == "NON_COMPLIANT"

def test_report_score_match(test_inspection):
    """Test #3: report score exactly matches stored compliance scoring"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    assert data["assessment"]["score"] == test_inspection.compliance_score

def test_report_assessment_match(test_inspection):
    """Test #4: report assessment exactly matches stored assessment"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    assert data["assessment"]["assessment"] == test_inspection.compliance_results["scoring"]["assessment"]

def test_report_verified_declarations(test_inspection):
    """Test #5 & #6: verified declarations come from verified_data, AI value does not replace human value, canonical keys exist"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    
    # Assert canonical values
    assert data["verified_declarations"]["mrp"] == "₹20" # Not the AI's ₹10
    assert data["verified_declarations"]["net_quantity"] == "500g"
    
    # Assert ALL canonical keys exist (null if missing)
    canonical_keys = [
        "manufacturer_packer_importer_details",
        "generic_name",
        "net_quantity",
        "mrp",
        "manufacture_or_pack_date",
        "consumer_care",
        "country_of_origin"
    ]
    for key in canonical_keys:
        assert key in data["verified_declarations"]
    assert data["verified_declarations"]["generic_name"] is None

def test_report_rule_preservation(test_inspection):
    """Test #7: all rule results are preserved"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    assert len(data["rule_evaluations"]) == 2
    assert data["rule_evaluations"][0]["rule_id"] == "rule_1"

def test_report_source_reference_preservation(test_inspection):
    """Test #8: source_reference is preserved exactly"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    ref = data["rule_evaluations"][0]["source_reference"]
    assert ref["source_document"] == "Packaged Commodities Rules"
    assert ref["source_rule"] == "Rule 6"

def test_report_null_evidence(test_inspection):
    """Test #9: null evidence remains null"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    assert data["rule_evaluations"][0]["evidence"] is None

def test_report_summary_counts(test_inspection):
    """Test #10: rule counts are correct"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    counts = data["summary_counts"]
    assert counts["passed"] == 0
    assert counts["failed"] == 1
    assert counts["requires_human_review"] == 1
    assert counts["not_applicable"] == 0
    assert counts["total_rules"] == 2

def test_report_provisional_state(test_inspection):
    """Test #11: provisional state is preserved"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    assert data["assessment"]["is_provisional"] is True

def test_report_unevaluated_refusal(unevaluated_inspection):
    """Test #12: unevaluated inspection cannot generate report"""
    response = client.get(f"/api/inspections/{unevaluated_inspection.id}/report")
    assert response.status_code == 409
    assert "must be evaluated" in response.json()["detail"]

def test_report_nonexistent():
    """Test #13: nonexistent inspection returns 404"""
    response = client.get("/api/inspections/99999/report")
    assert response.status_code == 404

def test_report_no_side_effects(db_session, test_inspection):
    """Test #14: GET report does not mutate inspection/status/results"""
    original_status = test_inspection.status
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    assert response.status_code == 200
    db_session.refresh(test_inspection)
    assert test_inspection.status == original_status
    assert test_inspection.compliance_score == 40

def test_report_idempotent(test_inspection):
    """Test #15: repeated GET calls preserve compliance content"""
    r1 = client.get(f"/api/inspections/{test_inspection.id}/report").json()
    r2 = client.get(f"/api/inspections/{test_inspection.id}/report").json()
    
    assert r1["assessment"] == r2["assessment"]
    assert r1["verified_declarations"] == r2["verified_declarations"]
    assert r1["rule_evaluations"] == r2["rule_evaluations"]
    
def test_report_disclaimer_present(test_inspection):
    """Ensure disclaimer is properly attached"""
    response = client.get(f"/api/inspections/{test_inspection.id}/report")
    data = response.json()
    assert "PackSure provides traceable decision-support" in data["disclaimer"]
