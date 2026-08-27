import pytest
import os
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.schemas.inspection import InspectionStatus
from app.models.inspection import Inspection

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
    app.dependency_overrides.clear()

def create_human_verified_inspection(verified_data=None, pkg_context="retail", prod_category=None):
    res = client.post("/api/inspections/", json={
        "package_context": pkg_context,
        "product_category": prod_category
    })
    inspection_id = res.json()["id"]
    
    # Fast track to HUMAN_VERIFIED
    if not verified_data:
        verified_data = {
            "data": {
                "manufacturer_packer_importer_details": "Test Mfg",
                "generic_name": "Test Product",
                "net_quantity": "1kg",
                "mrp": "100"
            },
            "metadata": {
                "reviewed_at": "2026-08-26T00:00:00Z",
                "changed_fields": []
            }
        }
        
    # Fast track through allowed transitions
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_COMPLETED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_REVIEW_PENDING.value})
    
    client.patch(f"/api/inspections/{inspection_id}", json={
        "status": InspectionStatus.HUMAN_VERIFIED.value,
        "verified_data": verified_data,
        "extracted_data": {"test_ai": "untouched"}
    })
    return inspection_id

def test_evaluate_success():
    inspection_id = create_human_verified_inspection()
    res = client.post(f"/api/inspections/{inspection_id}/evaluate")
    
    if res.status_code != 200:
        print("EVALUATE SUCCESS ERROR:", res.json())
        
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == InspectionStatus.COMPLIANCE_EVALUATED.value
    assert data["compliance_results"] is not None
    assert data["compliance_results"]["is_compliant"] is True
    
    # Check that rule evaluations were persisted
    results = data["compliance_results"]["results"]
    assert len(results) == 4
    
    # All 4 rules should PASS because the values exist
    for r in results:
        assert r["status"] == "PASS"
        assert r["evidence"] is not None
        assert "traceability" in r["source_reference"] or "source_document" in r["source_reference"]

    # Verify extracted_data and verified_data remained untouched
    assert data["extracted_data"] == {"test_ai": "untouched"}
    assert data["verified_data"]["data"]["mrp"] == "100"
    
    # Compliance score should be 100
    assert data["compliance_score"] == 100
    assert data["compliance_results"]["scoring"]["assessment"] == "COMPLIANT"

def test_evaluate_fail_persistence():
    # Missing MRP should cause a rule to FAIL
    verified_data = {
        "data": {
            "manufacturer_packer_importer_details": "Test Mfg",
            "generic_name": "Test Product",
            "net_quantity": "1kg",
            "mrp": None
        },
        "metadata": {"changed_fields": []}
    }
    inspection_id = create_human_verified_inspection(verified_data=verified_data)
    res = client.post(f"/api/inspections/{inspection_id}/evaluate")
    
    assert res.status_code == 200
    results = res.json()["compliance_results"]["results"]
    mrp_rule = next(r for r in results if r["rule_id"] == "PC_RULE_004_MRP")
    
    assert mrp_rule["status"] == "FAIL"
    assert res.json()["compliance_results"]["is_compliant"] is False

def test_evaluate_not_applicable_persistence():
    # If it's a medical device, the rules are exempt and return NOT_APPLICABLE
    inspection_id = create_human_verified_inspection(prod_category="medical_device")
    res = client.post(f"/api/inspections/{inspection_id}/evaluate")
    
    assert res.status_code == 200
    results = res.json()["compliance_results"]["results"]
    for r in results:
        assert r["status"] == "NOT_APPLICABLE"
        
    # NOT_APPLICABLE rules still mean it's compliant overall (it didn't fail)
    assert res.json()["compliance_results"]["is_compliant"] is True

def test_evaluate_invalid_status():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    
    res2 = client.post(f"/api/inspections/{inspection_id}/evaluate")
    assert res2.status_code == 400
    assert "Cannot evaluate from status" in res2.json()["detail"]

def test_evaluate_missing_verified_data():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_COMPLETED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_REVIEW_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_VERIFIED.value})
    
    res2 = client.post(f"/api/inspections/{inspection_id}/evaluate")
    assert res2.status_code == 400
    assert "Missing verified_data" in res2.json()["detail"]

def test_evaluate_malformed_verified_data():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_COMPLETED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_REVIEW_PENDING.value})
    
    client.patch(f"/api/inspections/{inspection_id}", json={
        "status": InspectionStatus.HUMAN_VERIFIED.value,
        "verified_data": {"wrong_schema": "yes"}
    })
    
    res2 = client.post(f"/api/inspections/{inspection_id}/evaluate")
    assert res2.status_code == 500
    assert "Compliance evaluation failed" in res2.json()["detail"]
    
    # Should safely transition to FAILED
    res3 = client.get(f"/api/inspections/{inspection_id}")
    assert res3.json()["status"] == InspectionStatus.FAILED.value

def test_duplicate_execution_rejected():
    inspection_id = create_human_verified_inspection()
    res = client.post(f"/api/inspections/{inspection_id}/evaluate")
    assert res.status_code == 200
    
    res2 = client.post(f"/api/inspections/{inspection_id}/evaluate")
    assert res2.status_code == 400
    assert "Cannot evaluate from status" in res2.json()["detail"]
