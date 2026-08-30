import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.inspection import Inspection
from app.schemas.inspection import InspectionStatus

# Test Database setup
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
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

def test_empty_database():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_inspections"] == 0
    assert data["compliant"] == 0
    assert data["non_compliant"] == 0
    assert data["review_required"] == 0
    assert data["drafts"] == 0
    assert len(data["recent_inspections"]) == 0

def test_draft_and_evaluated_counts():
    db = TestingSessionLocal()
    
    # 1 Compliant
    db.add(Inspection(
        status=InspectionStatus.COMPLIANCE_EVALUATED,
        compliance_results={"scoring": {"assessment": "COMPLIANT"}}
    ))
    
    # 1 Non-compliant
    db.add(Inspection(
        status=InspectionStatus.COMPLIANCE_EVALUATED,
        compliance_results={"scoring": {"assessment": "NON_COMPLIANT"}}
    ))

    # 1 Review Required
    db.add(Inspection(
        status=InspectionStatus.COMPLIANCE_EVALUATED,
        compliance_results={"scoring": {"assessment": "REVIEW_REQUIRED"}}
    ))

    # 1 Draft (CREATED)
    db.add(Inspection(
        status=InspectionStatus.CREATED
    ))

    # 1 FAILED (should count as draft/unfinished)
    db.add(Inspection(
        status=InspectionStatus.FAILED
    ))

    db.commit()

    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["total_inspections"] == 5
    assert data["compliant"] == 1
    assert data["non_compliant"] == 1
    assert data["review_required"] == 1
    # CREATED + FAILED = 2 drafts
    assert data["drafts"] == 2

def test_malformed_legacy_records():
    db = TestingSessionLocal()
    
    # Missing compliance_results completely but status is evaluated
    db.add(Inspection(status=InspectionStatus.COMPLIANCE_EVALUATED, compliance_results=None))
    
    # Malformed compliance_results (not a dict)
    db.add(Inspection(status=InspectionStatus.COMPLETED, compliance_results="some string"))
    
    # Missing assessment
    db.add(Inspection(status=InspectionStatus.COMPLETED, compliance_results={"scoring": {}}))
    
    db.commit()

    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["total_inspections"] == 3
    # They don't have valid assessments, so they shouldn't increment counts
    assert data["compliant"] == 0
    assert data["non_compliant"] == 0
    assert data["review_required"] == 0
    # Evaluated statuses do not count as drafts
    assert data["drafts"] == 0

def test_recent_inspections_ordering_and_limit():
    db = TestingSessionLocal()
    
    # Create 6 inspections (id 1 to 6)
    for i in range(6):
        db.add(Inspection(status=InspectionStatus.CREATED, product_category=f"Item {i}"))
        
    db.commit()

    response = client.get("/api/dashboard/stats")
    data = response.json()
    
    assert data["total_inspections"] == 6
    assert len(data["recent_inspections"]) == 5
    
    # Should be ordered descending (since updated_at is None, fallback to created_at/id desc)
    # The first one should be id 6
    assert data["recent_inspections"][0]["id"] == 6
    assert data["recent_inspections"][4]["id"] == 2

def test_deleting_draft_updates_stats():
    db = TestingSessionLocal()
    
    # Add a draft
    ins = Inspection(status=InspectionStatus.CREATED)
    db.add(ins)
    db.commit()
    db.refresh(ins)
    
    response = client.get("/api/dashboard/stats")
    assert response.json()["drafts"] == 1
    
    # Delete it via endpoint
    delete_response = client.delete(f"/api/inspections/{ins.id}")
    assert delete_response.status_code == 200
    
    response2 = client.get("/api/dashboard/stats")
    assert response2.json()["drafts"] == 0
    assert response2.json()["total_inspections"] == 0
