import pytest
import os
import shutil
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.schemas.inspection import InspectionStatus

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
    original_storage = settings.LOCAL_STORAGE_DIR
    settings.LOCAL_STORAGE_DIR = str(tmp_path)
    
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    
    settings.LOCAL_STORAGE_DIR = original_storage

def test_delete_created_inspection():
    # 1. CREATED inspection can be deleted
    resp = client.post("/api/inspections/", json={"product_category": "Food"})
    assert resp.status_code == 200
    inspection_id = resp.json()["id"]
    
    del_resp = client.delete(f"/api/inspections/{inspection_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True
    
    get_resp = client.get(f"/api/inspections/{inspection_id}")
    assert get_resp.status_code == 404

def test_delete_uploaded_inspection_with_files():
    # 2 & 3. inspection with uploaded images can be deleted, and local files removed
    resp = client.post("/api/inspections/", json={"product_category": "Food"})
    inspection_id = resp.json()["id"]
    
    # Mock creating a physical directory
    inspection_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "inspections", str(inspection_id))
    os.makedirs(inspection_dir, exist_ok=True)
    with open(os.path.join(inspection_dir, "test.jpg"), "w") as f:
        f.write("dummy image data")
        
    assert os.path.exists(inspection_dir)
    
    del_resp = client.delete(f"/api/inspections/{inspection_id}")
    assert del_resp.status_code == 200
    
    assert not os.path.exists(inspection_dir)

def test_missing_local_file_no_crash():
    # 4. missing local file does not crash deletion
    resp = client.post("/api/inspections/", json={"product_category": "Food"})
    inspection_id = resp.json()["id"]
    
    del_resp = client.delete(f"/api/inspections/{inspection_id}")
    assert del_resp.status_code == 200

def test_completed_inspection_protected():
    # 5. completed/evaluated inspection cannot be deleted as a draft
    resp = client.post("/api/inspections/", json={"product_category": "Food"})
    inspection_id = resp.json()["id"]
    
    # Manually update status to COMPLIANCE_EVALUATED
    client.patch(f"/api/inspections/{inspection_id}", json={"status": "IMAGES_UPLOADED"})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": "EXTRACTION_PENDING"})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": "EXTRACTION_COMPLETED"})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": "HUMAN_REVIEW_PENDING"})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": "HUMAN_VERIFIED"})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": "COMPLIANCE_EVALUATED"})
    
    del_resp = client.delete(f"/api/inspections/{inspection_id}")
    assert del_resp.status_code == 409
    assert "Completed inspections cannot be deleted" in del_resp.json()["detail"]

def test_delete_nonexistent_returns_404():
    # 6. nonexistent inspection returns appropriate not-found response
    del_resp = client.delete(f"/api/inspections/999999")
    assert del_resp.status_code == 404

def test_isolation():
    # 7. deleting one inspection does not affect another
    resp1 = client.post("/api/inspections/", json={"product_category": "Food"})
    id1 = resp1.json()["id"]
    
    resp2 = client.post("/api/inspections/", json={"product_category": "Food"})
    id2 = resp2.json()["id"]
    
    dir2 = os.path.join(settings.LOCAL_STORAGE_DIR, "inspections", str(id2))
    os.makedirs(dir2, exist_ok=True)
    
    del_resp = client.delete(f"/api/inspections/{id1}")
    assert del_resp.status_code == 200
    
    # Verify id2 is still there
    get_resp2 = client.get(f"/api/inspections/{id2}")
    assert get_resp2.status_code == 200
    assert os.path.exists(dir2)

def test_storage_deletion_failure_does_not_delete_db():
    # "unexpected filesystem deletion failures must NOT return successful deletion"
    resp = client.post("/api/inspections/", json={"product_category": "Food"})
    inspection_id = resp.json()["id"]
    
    inspection_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "inspections", str(inspection_id))
    os.makedirs(inspection_dir, exist_ok=True)
    
    # Mock shutil.rmtree to raise an exception
    with patch('shutil.rmtree') as mock_rmtree:
        mock_rmtree.side_effect = PermissionError("Cannot delete")
        
        del_resp = client.delete(f"/api/inspections/{inspection_id}")
        assert del_resp.status_code == 500
        assert "Failed to delete associated files" in del_resp.json()["detail"]
        
    # Verify DB record is still there
    get_resp = client.get(f"/api/inspections/{inspection_id}")
    assert get_resp.status_code == 200
