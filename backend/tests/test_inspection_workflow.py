import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.schemas.inspection import InspectionStatus
from app.models.inspection import Inspection # Ensure model is registered

# Setup an in-memory SQLite database for testing
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
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    # Create the tables before each test
    Base.metadata.create_all(bind=engine)
    yield
    # Drop the tables after each test
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

def test_create_inspection():
    response = client.post("/api/inspections/", json={"product_category": "food"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == InspectionStatus.CREATED.value
    assert data["package_context"] == "retail"
    assert "id" in data

def test_list_inspections():
    client.post("/api/inspections/", json={"product_category": "food"})
    client.post("/api/inspections/", json={"product_category": "electronics"})
    
    response = client.get("/api/inspections/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

def test_get_inspection():
    create_response = client.post("/api/inspections/", json={"product_category": "food"})
    inspection_id = create_response.json()["id"]
    
    response = client.get(f"/api/inspections/{inspection_id}")
    assert response.status_code == 200
    assert response.json()["id"] == inspection_id

def test_valid_status_transition():
    # CREATE -> IMAGES_UPLOADED -> EXTRACTION_PENDING
    create_response = client.post("/api/inspections/", json={})
    inspection_id = create_response.json()["id"]
    
    res = client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    assert res.status_code == 200
    assert res.json()["status"] == InspectionStatus.IMAGES_UPLOADED.value
    
    res = client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    assert res.status_code == 200
    assert res.json()["status"] == InspectionStatus.EXTRACTION_PENDING.value

def test_invalid_forward_jump():
    create_response = client.post("/api/inspections/", json={})
    inspection_id = create_response.json()["id"]
    
    # Try jumping directly from CREATED to COMPLETED
    res = client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.COMPLETED.value})
    assert res.status_code == 400
    assert "Invalid status transition" in res.json()["detail"]

def test_invalid_backward_transition():
    create_response = client.post("/api/inspections/", json={})
    inspection_id = create_response.json()["id"]
    
    # Move forward properly
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    
    # Try to move backward to CREATED
    res = client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.CREATED.value})
    assert res.status_code == 400
    assert "Invalid status transition" in res.json()["detail"]

def test_invalid_enum_value():
    create_response = client.post("/api/inspections/", json={})
    inspection_id = create_response.json()["id"]
    
    # Try an arbitrary string not in Enum
    res = client.patch(f"/api/inspections/{inspection_id}", json={"status": "ARBITRARY_STATUS"})
    assert res.status_code == 422 # Pydantic validation error

def test_completed_is_terminal():
    create_response = client.post("/api/inspections/", json={})
    inspection_id = create_response.json()["id"]
    
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.IMAGES_UPLOADED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.EXTRACTION_COMPLETED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_REVIEW_PENDING.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.HUMAN_VERIFIED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.COMPLIANCE_EVALUATED.value})
    client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.COMPLETED.value})
    
    # Try moving anywhere else from COMPLETED
    res = client.patch(f"/api/inspections/{inspection_id}", json={"status": InspectionStatus.CREATED.value})
    assert res.status_code == 400
