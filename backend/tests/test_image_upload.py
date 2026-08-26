import pytest
import os
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.schemas.inspection import InspectionStatus
from app.models.inspection import Inspection

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
def setup_environment(tmp_path):
    app.dependency_overrides[get_db] = override_get_db
    # Override local storage to a temp directory to isolate files
    original_storage = settings.LOCAL_STORAGE_DIR
    settings.LOCAL_STORAGE_DIR = str(tmp_path)
    
    # Create the tables before each test
    Base.metadata.create_all(bind=engine)
    yield
    # Drop the tables after each test
    Base.metadata.drop_all(bind=engine)
    
    settings.LOCAL_STORAGE_DIR = original_storage
    app.dependency_overrides.clear()

def create_test_image(size_kb=10, filename="test.jpg"):
    """Helper to create a dummy image file object."""
    file_bytes = b"0" * (size_kb * 1024)
    return (filename, io.BytesIO(file_bytes), "image/jpeg")

def test_successful_single_image_upload():
    # Create inspection
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    # Upload image
    files = {"files": create_test_image()}
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == InspectionStatus.IMAGES_UPLOADED.value
    assert len(data["image_paths"]) == 1
    assert data["image_paths"][0].startswith(f"inspections/{inspection_id}/")
    assert data["image_paths"][0].endswith(".jpg")
    
    # Verify file physically exists
    physical_path = os.path.join(settings.LOCAL_STORAGE_DIR, data["image_paths"][0].replace("/", os.sep))
    assert os.path.exists(physical_path)

def test_successful_multiple_image_upload():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    files = [
        ("files", create_test_image(filename="1.jpg")),
        ("files", create_test_image(filename="2.jpg"))
    ]
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    
    assert res.status_code == 200
    data = res.json()
    assert len(data["image_paths"]) == 2

def test_inspection_not_found():
    files = {"files": create_test_image()}
    res = client.post("/api/inspections/999/images", files=files)
    assert res.status_code == 404

def test_empty_upload():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    # Send request without files
    res = client.post(f"/api/inspections/{inspection_id}/images", files=[])
    assert res.status_code == 422 # FastAPI File(...) validation catches this

def test_unsupported_mime_type():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    files = {"files": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    
    assert res.status_code == 400
    assert "Unsupported file type" in res.json()["detail"]

def test_oversized_file():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    # Create a 6MB file (limit is 5MB)
    files = {"files": create_test_image(size_kb=6000)}
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    
    assert res.status_code == 400
    assert "exceeds the 5MB size limit" in res.json()["detail"]

def test_created_to_images_uploaded_transition():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    assert create_res.json()["status"] == InspectionStatus.CREATED.value
    
    files = {"files": create_test_image()}
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    
    assert res.status_code == 200
    assert res.json()["status"] == InspectionStatus.IMAGES_UPLOADED.value

def test_repeat_upload_while_already_images_uploaded():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    # First upload
    client.post(f"/api/inspections/{inspection_id}/images", files={"files": create_test_image()})
    
    # Second upload
    files2 = {"files": create_test_image(filename="second.jpg")}
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files2)
    
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == InspectionStatus.IMAGES_UPLOADED.value
    assert len(data["image_paths"]) == 2

def test_upload_rejected_after_extraction_has_started():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    # Move to EXTRACTION_PENDING via valid transitions
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    
    files = {"files": create_test_image()}
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    assert res.status_code == 400
    assert "Cannot upload images in current status" in res.json()["detail"]

def test_upload_rejected_from_completed():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    # Fast track transitions to completed
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_COMPLETED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_REVIEW_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_VERIFIED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.COMPLIANCE_EVALUATED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.COMPLETED.value})
    
    res = client.post(f"/api/inspections/{inspection_id}/images", files={"files": create_test_image()})
    assert res.status_code == 400

def test_upload_rejected_from_failed():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.FAILED.value})
    
    res = client.post(f"/api/inspections/{inspection_id}/images", files={"files": create_test_image()})
    assert res.status_code == 400

def test_partial_save_failure_cleans_up():
    create_res = client.post("/api/inspections/", json={})
    inspection_id = create_res.json()["id"]
    
    # One valid file, one oversized file
    files = [
        ("files", create_test_image(filename="valid.jpg")),
        ("files", create_test_image(size_kb=6000, filename="invalid.jpg"))
    ]
    
    res = client.post(f"/api/inspections/{inspection_id}/images", files=files)
    assert res.status_code == 400
    
    # Ensure database is unchanged
    get_res = client.get(f"/api/inspections/{inspection_id}")
    assert get_res.json()["status"] == InspectionStatus.CREATED.value
    assert len(get_res.json()["image_paths"]) == 0
    
    # Ensure physical files are deleted
    inspection_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "inspections", str(inspection_id))
    if os.path.exists(inspection_dir):
        assert len(os.listdir(inspection_dir)) == 0
