import pytest
import os
import io
import json
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.schemas.inspection import InspectionStatus
from app.schemas.extraction import PackageDeclarations, ExtractedField, ConfidenceLevel

# Isolated Database
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
def setup_environment(tmp_path):
    app.dependency_overrides[get_db] = override_get_db
    
    original_storage = settings.LOCAL_STORAGE_DIR
    original_api_key = settings.GEMINI_API_KEY
    
    settings.LOCAL_STORAGE_DIR = str(tmp_path)
    settings.GEMINI_API_KEY = "dummy-test-key-for-e2e"
    
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    
    settings.LOCAL_STORAGE_DIR = original_storage
    settings.GEMINI_API_KEY = original_api_key
    app.dependency_overrides.clear()

def create_test_image(size_kb=10, filename="test_e2e.jpg"):
    file_bytes = b"0" * (size_kb * 1024)
    return (filename, io.BytesIO(file_bytes), "image/jpeg")

def get_mock_declarations_e2e():
    return PackageDeclarations(
        manufacturer_packer_importer_details=ExtractedField(value="Test Mfg", raw_text="Mfg: Test Mfg", confidence=ConfidenceLevel.HIGH),
        common_generic_name=ExtractedField(value="Test Product", raw_text="Product", confidence=ConfidenceLevel.HIGH),
        net_quantity=ExtractedField(value="1kg", raw_text="1kg", confidence=ConfidenceLevel.HIGH),
        mrp=ExtractedField(value="100", raw_text="Rs. 100", confidence=ConfidenceLevel.HIGH),
        manufacture_or_pack_date=ExtractedField(value="10/2023", raw_text="Oct 2023", confidence=ConfidenceLevel.HIGH),
        consumer_care=ExtractedField(value="care@test.com", raw_text="care@test.com", confidence=ConfidenceLevel.HIGH),
        country_of_origin=ExtractedField(value="India", raw_text="Made in India", confidence=ConfidenceLevel.HIGH)
    )

@patch("app.services.extraction.gemini_service.GeminiExtractionService.extract_from_images")
def test_backend_e2e_happy_path(mock_extract):
    """
    Primary happy-path E2E test verifying a compliant product moving through the entire workflow.
    """
    mock_extract.return_value = get_mock_declarations_e2e()
    
    # ---------------------------------------------------------
    # STEP 1 - CREATE INSPECTION
    # ---------------------------------------------------------
    res_create = client.post("/api/inspections/", json={
        "product_category": "food",
        "package_context": "retail"
    })
    assert res_create.status_code == 200, res_create.text
    inspection_id = res_create.json()["id"]
    assert res_create.json()["status"] == InspectionStatus.CREATED.value

    # ---------------------------------------------------------
    # STEP 2 - UPLOAD PACKAGE IMAGE
    # ---------------------------------------------------------
    files = {"files": create_test_image()}
    res_upload = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    assert res_upload.status_code == 200, res_upload.text
    assert res_upload.json()["status"] == InspectionStatus.IMAGES_UPLOADED.value
    image_paths = res_upload.json()["image_paths"]
    assert len(image_paths) == 1
    
    # Verify isolated temporary storage used
    physical_path = os.path.join(settings.LOCAL_STORAGE_DIR, image_paths[0].replace("/", os.sep))
    assert os.path.exists(physical_path)

    # ---------------------------------------------------------
    # STEP 3 - EXTRACTION
    # ---------------------------------------------------------
    res_extract = client.post(f"/api/inspections/{inspection_id}/extract")
    assert res_extract.status_code == 200, res_extract.text
    assert res_extract.json()["status"] == InspectionStatus.HUMAN_REVIEW_PENDING.value
    
    extracted_data = res_extract.json()["extracted_data"]
    assert extracted_data["mrp"]["value"] == "100"
    
    # ---------------------------------------------------------
    # STEP 4 - HUMAN REVIEW
    # ---------------------------------------------------------
    # Fetch current review data
    res_get_review = client.get(f"/api/inspections/{inspection_id}/review")
    assert res_get_review.status_code == 200, res_get_review.text
    assert res_get_review.json()["extracted_data"]["net_quantity"]["value"] == "1kg"
    
    # Submit review (modify one field to verify auditing)
    review_payload = {
        "manufacturer_packer_importer_details": "Test Mfg",
        "generic_name": "Test Product",
        "net_quantity": "500g", # Intentionally changed
        "mrp": "100",
        "manufacture_or_pack_date": "10/2023",
        "consumer_care": "care@test.com",
        "country_of_origin": "India"
    }
    res_review = client.post(f"/api/inspections/{inspection_id}/review", json=review_payload)
    assert res_review.status_code == 200, res_review.text
    assert res_review.json()["status"] == InspectionStatus.HUMAN_VERIFIED.value
    
    verified_data = res_review.json()["verified_data"]
    assert verified_data["data"]["net_quantity"] == "500g"
    assert "net_quantity" in verified_data["metadata"]["changed_fields"]
    
    # AI data untouched
    assert res_review.json()["extracted_data"]["net_quantity"]["value"] == "1kg"

    # ---------------------------------------------------------
    # STEP 5 - COMPLIANCE EXECUTION
    # ---------------------------------------------------------
    # The real deterministic rule engine runs here using real JSON rules
    res_eval = client.post(f"/api/inspections/{inspection_id}/evaluate")
    assert res_eval.status_code == 200, res_eval.text
    assert res_eval.json()["status"] == InspectionStatus.COMPLIANCE_EVALUATED.value
    
    compliance_results = res_eval.json()["compliance_results"]
    assert compliance_results["is_compliant"] is True
    
    for r in compliance_results["results"]:
        assert r["status"] == "PASS"
        assert "source_document" in r["source_reference"]
        
    assert res_eval.json()["compliance_score"] == 100

    # ---------------------------------------------------------
    # STEP 6 - FINAL RETRIEVAL
    # ---------------------------------------------------------
    res_final = client.get(f"/api/inspections/{inspection_id}")
    assert res_final.status_code == 200, res_final.text
    
    final_data = res_final.json()
    assert final_data["status"] == InspectionStatus.COMPLIANCE_EVALUATED.value
    assert len(final_data["image_paths"]) == 1
    assert final_data["extracted_data"]["mrp"]["value"] == "100"
    assert final_data["verified_data"]["data"]["net_quantity"] == "500g"
    assert final_data["compliance_results"]["is_compliant"] is True
    assert final_data["compliance_score"] == 100

@patch("app.services.extraction.gemini_service.GeminiExtractionService.extract_from_images")
def test_backend_e2e_non_compliant(mock_extract):
    """
    Second E2E Scenario representing a non-compliant package (missing MRP).
    """
    # Mock AI extracting null MRP
    mock_declarations = get_mock_declarations_e2e()
    mock_declarations.mrp.value = None
    mock_extract.return_value = mock_declarations

    # 1. Create
    res = client.post("/api/inspections/", json={"package_context": "retail", "product_category": "food"})
    inspection_id = res.json()["id"]
    
    # 2. Upload
    client.post(f"/api/inspections/{inspection_id}/images", files={"files": create_test_image()})
    
    # 3. Extract
    client.post(f"/api/inspections/{inspection_id}/extract")
    
    # 4. Review (human agrees MRP is missing)
    review_payload = {
        "manufacturer_packer_importer_details": "Test Mfg",
        "generic_name": "Test Product",
        "net_quantity": "1kg",
        "mrp": None, # Missing field
        "manufacture_or_pack_date": "10/2023",
        "consumer_care": "care@test.com",
        "country_of_origin": "India"
    }
    client.post(f"/api/inspections/{inspection_id}/review", json=review_payload)
    
    # 5. Evaluate
    res_eval = client.post(f"/api/inspections/{inspection_id}/evaluate")
    assert res_eval.status_code == 200, res_eval.text
    assert res_eval.json()["status"] == InspectionStatus.COMPLIANCE_EVALUATED.value
    
    compliance_results = res_eval.json()["compliance_results"]
    assert compliance_results["is_compliant"] is False
    
    # Verify at least one FAIL and traceability
    results = compliance_results["results"]
    failures = [r for r in results if r["status"] == "FAIL"]
    assert len(failures) >= 1
    
    for r in results:
        assert "source_document" in r["source_reference"]
        assert r["source_reference"]["source_document"] != ""
