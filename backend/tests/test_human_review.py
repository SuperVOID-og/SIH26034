import pytest
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

def create_inspection_at_review():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    
    # Fast track to HUMAN_REVIEW_PENDING
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_COMPLETED.value})
    
    # Inject mock extracted data
    mock_ai = {
        "manufacturer_packer_importer_details": {"value": "Test Mfg", "raw_text": "Mfg: Test Mfg", "confidence": "HIGH", "source_images": []},
        "common_generic_name": {"value": "Test Product", "raw_text": "Product", "confidence": "HIGH", "source_images": []},
        "net_quantity": {"value": "1kg", "raw_text": "1kg", "confidence": "HIGH", "source_images": []},
        "mrp": {"value": "100", "raw_text": "100", "confidence": "HIGH", "source_images": []},
        "manufacture_or_pack_date": {"value": "10/2023", "raw_text": "10/2023", "confidence": "HIGH", "source_images": []},
        "consumer_care": {"value": "care@test.com", "raw_text": "care@test.com", "confidence": "HIGH", "source_images": []},
        "country_of_origin": {"value": None, "raw_text": None, "confidence": "UNKNOWN", "source_images": []}
    }
    client.patch(f"/api/inspections/{inspection_id}", json={"extracted_data": mock_ai})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_REVIEW_PENDING.value})
    return inspection_id

def test_get_review_payload():
    inspection_id = create_inspection_at_review()
    res = client.get(f"/api/inspections/{inspection_id}/review")
    assert res.status_code == 200
    data = res.json()
    assert "extracted_data" in data
    assert data["extracted_data"]["mrp"]["value"] == "100"
    assert data["verified_data"] is None

def test_get_review_not_ready():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    res2 = client.get(f"/api/inspections/{inspection_id}/review")
    assert res2.status_code == 400
    assert "Extraction has not completed" in res2.json()["detail"]

def test_unchanged_submission():
    inspection_id = create_inspection_at_review()
    
    payload = {
        "manufacturer_packer_importer_details": "Test Mfg",
        "generic_name": "Test Product", # maps to common_generic_name
        "net_quantity": "1kg",
        "mrp": "100",
        "manufacture_or_pack_date": "10/2023",
        "consumer_care": "care@test.com",
        "country_of_origin": None
    }
    
    res = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    assert data["status"] == InspectionStatus.HUMAN_VERIFIED.value
    assert data["verified_data"]["metadata"]["changed_fields"] == []
    assert data["extracted_data"]["mrp"]["value"] == "100" # Unchanged AI

def test_corrected_fields():
    inspection_id = create_inspection_at_review()
    
    payload = {
        "manufacturer_packer_importer_details": "Test Mfg",
        "generic_name": "Test Product",
        "net_quantity": "500g", # Changed
        "mrp": "200", # Changed
        "manufacture_or_pack_date": "10/2023",
        "consumer_care": "care@test.com",
        "country_of_origin": None
    }
    
    res = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    changed = data["verified_data"]["metadata"]["changed_fields"]
    assert "net_quantity" in changed
    assert "mrp" in changed
    assert len(changed) == 2
    
    # Original AI remains untouched
    assert data["extracted_data"]["mrp"]["value"] == "100"
    # Compliance untouched
    assert data["compliance_score"] is None

def test_ai_null_to_human_value():
    inspection_id = create_inspection_at_review()
    
    payload = {
        "manufacturer_packer_importer_details": "Test Mfg",
        "generic_name": "Test Product",
        "net_quantity": "1kg",
        "mrp": "100",
        "manufacture_or_pack_date": "10/2023",
        "consumer_care": "care@test.com",
        "country_of_origin": "India" # Changed from None
    }
    
    res = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res.status_code == 200
    changed = res.json()["verified_data"]["metadata"]["changed_fields"]
    assert ["country_of_origin"] == changed

def test_ai_value_to_human_null():
    inspection_id = create_inspection_at_review()
    
    payload = {
        "manufacturer_packer_importer_details": "Test Mfg",
        "generic_name": "Test Product",
        "net_quantity": "1kg",
        "mrp": None, # Changed from "100"
        "manufacture_or_pack_date": "10/2023",
        "consumer_care": "care@test.com",
        "country_of_origin": None
    }
    
    res = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res.status_code == 200
    changed = res.json()["verified_data"]["metadata"]["changed_fields"]
    assert ["mrp"] == changed

def test_invalid_status_rejected():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    
    payload = {"mrp": "100"}
    res2 = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res2.status_code == 400
    assert "Cannot submit review from status" in res2.json()["detail"]

def test_second_submission_rejected():
    inspection_id = create_inspection_at_review()
    
    payload = {"mrp": "100"}
    res = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res.status_code == 200
    
    # Try again
    res2 = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res2.status_code == 400
    assert "Must be HUMAN_REVIEW_PENDING" in res2.json()["detail"]

def test_malformed_payload_rejected():
    inspection_id = create_inspection_at_review()
    
    # Sending a dictionary where a string is expected is handled gracefully by Pydantic (coerces to string),
    # but sending completely wrong structure or fields not in schema are dropped or error.
    # Let's send a list where string expected
    payload = {"mrp": ["100"]}
    res = client.post(f"/api/inspections/{inspection_id}/review", json=payload)
    assert res.status_code == 422
