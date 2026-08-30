import pytest
import os
import io
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.schemas.inspection import InspectionStatus
from app.models.inspection import Inspection
from app.services.extraction.gemini_service import GeminiExtractionError
from app.schemas.extraction import PackageDeclarations

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
    settings.GEMINI_API_KEY = "dummy-test-key"
    
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    
    settings.LOCAL_STORAGE_DIR = original_storage
    settings.GEMINI_API_KEY = original_api_key
    app.dependency_overrides.clear()

def create_inspection_with_images(num_images=1):
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    
    # Upload images
    files = []
    for i in range(num_images):
        files.append(("files", (f"{i}.jpg", io.BytesIO(b"0" * 1024), "image/jpeg")))
        
    client.post(f"/api/inspections/{inspection_id}/images", files=files)
    return inspection_id

# ----------------- Mocking Gemini -----------------

def get_mock_declarations():
    return PackageDeclarations(
        manufacturer_packer_importer_details={"value": "Test Mfg", "raw_text": "Mfg: Test Mfg", "confidence": "HIGH", "source_images": []},
        common_generic_name={"value": "Test Product", "raw_text": "Product", "confidence": "HIGH", "source_images": []},
        net_quantity={"value": "1kg", "raw_text": "1kg", "confidence": "HIGH", "source_images": []},
        mrp={"value": "100", "raw_text": "100", "confidence": "HIGH", "source_images": []},
        manufacture_or_pack_date={"value": "10/2023", "raw_text": "10/2023", "confidence": "HIGH", "source_images": []},
        consumer_care={"value": "care@test.com", "raw_text": "care@test.com", "confidence": "HIGH", "source_images": []},
        country_of_origin={"value": "India", "raw_text": "India", "confidence": "HIGH", "source_images": []}
    )

@patch("app.services.extraction.gemini_service.GeminiExtractionService.extract_from_images")
def test_successful_extraction(mock_extract):
    mock_extract.return_value = get_mock_declarations()
    
    inspection_id = create_inspection_with_images(1)
    res = client.post(f"/api/inspections/{inspection_id}/extract")
    
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == InspectionStatus.HUMAN_REVIEW_PENDING.value
    assert data["extracted_data"]["mrp"]["value"] == "100"
    
    # Ensure compliance is untouched
    assert data["compliance_score"] is None
    assert data["violations"] is None

@patch("app.services.extraction.gemini_service.GeminiExtractionService.extract_from_images")
def test_multiple_images(mock_extract):
    mock_extract.return_value = get_mock_declarations()
    inspection_id = create_inspection_with_images(3)
    
    res = client.post(f"/api/inspections/{inspection_id}/extract")
    assert res.status_code == 200
    # The service will have been called with 3 paths
    mock_extract.assert_called_once()
    args, _ = mock_extract.call_args
    assert len(args[0]) == 3

def test_inspection_not_found():
    res = client.post("/api/inspections/999/extract")
    assert res.status_code == 404

def test_no_image_references():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    # Bypass valid state to test the data check
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    
    res2 = client.post(f"/api/inspections/{inspection_id}/extract")
    assert res2.status_code == 400
    assert "No images associated" in res2.json()["detail"]

def test_image_reference_exists_but_missing_on_disk():
    inspection_id = create_inspection_with_images(1)
    
    # Delete the physical file
    res = client.get(f"/api/inspections/{inspection_id}")
    path = res.json()["image_paths"][0]
    os.remove(os.path.join(settings.LOCAL_STORAGE_DIR, path.replace("/", os.sep)))
    
    res2 = client.post(f"/api/inspections/{inspection_id}/extract")
    assert res2.status_code == 400
    assert "No physical image files found" in res2.json()["detail"]

def test_missing_api_key():
    inspection_id = create_inspection_with_images(1)
    settings.GEMINI_API_KEY = None
    
    res = client.post(f"/api/inspections/{inspection_id}/extract")
    assert res.status_code == 500
    assert "GEMINI_API_KEY is not configured" in res.json()["detail"]

def test_invalid_inspection_status():
    res = client.post("/api/inspections/", json={})
    inspection_id = res.json()["id"]
    # Status is CREATED
    res2 = client.post(f"/api/inspections/{inspection_id}/extract")
    assert res2.status_code == 400
    assert "Cannot extract data from status" in res2.json()["detail"]

@patch("app.services.extraction.gemini_service.GeminiExtractionService.extract_from_images")
def test_gemini_service_failure(mock_extract):
    mock_extract.side_effect = GeminiExtractionError("API offline")
    
    inspection_id = create_inspection_with_images(1)
    res = client.post(f"/api/inspections/{inspection_id}/extract")
    
    assert res.status_code == 500
    # Database status should be transitioned to FAILED
    get_res = client.get(f"/api/inspections/{inspection_id}")
    assert get_res.json()["status"] == InspectionStatus.FAILED.value
    assert get_res.json()["extracted_data"] is None


# ---- Path traversal guard ----

def test_path_traversal_rejected():
    """Gemini service must reject paths that escape the storage root."""
    from app.services.extraction.gemini_service import GeminiExtractionService
    service = GeminiExtractionService()
    # Craft a traversal path
    traversal = "../../etc/passwd"
    with pytest.raises(GeminiExtractionError, match="not found on disk|traversal"):
        service.extract_from_images([traversal])


# ---- Media serving: verify files land in LOCAL_STORAGE_DIR so /media can serve them ----

def test_uploaded_image_lands_in_storage_dir():
    """
    Verifies that after upload, the saved file actually exists under LOCAL_STORAGE_DIR.
    The /media static mount serves this directory, so if the file is here the URL will resolve.
    (StaticFiles mounts bind to the real storage directory at app startup, so HTTP-level
    assertions require an integration test against a live server, not a TestClient unit test.)
    """
    import io
    res = client.post("/api/inspections/", json={})
    iid = res.json()["id"]
    img_bytes = io.BytesIO(b"\xff\xd8\xff" + b"0" * 512)
    upload_res = client.post(
        f"/api/inspections/{iid}/images",
        files=[("files", ("test.jpg", img_bytes, "image/jpeg"))]
    )
    assert upload_res.status_code == 200
    rel_path = upload_res.json()["image_paths"][0]  # e.g. "inspections/1/uuid.jpg"

    # The file must exist on disk so /media can serve it
    abs_path = os.path.join(settings.LOCAL_STORAGE_DIR, rel_path.replace("/", os.sep))
    assert os.path.exists(abs_path), f"Uploaded file not found at: {abs_path}"


