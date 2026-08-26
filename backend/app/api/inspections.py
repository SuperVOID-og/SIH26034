from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.inspection import Inspection
from app.schemas.inspection import InspectionCreate, InspectionUpdate, InspectionResponse, InspectionStatus

router = APIRouter()

# Transition map enforcing linear state changes
ALLOWED_TRANSITIONS = {
    InspectionStatus.CREATED: [InspectionStatus.IMAGES_UPLOADED, InspectionStatus.FAILED],
    InspectionStatus.IMAGES_UPLOADED: [InspectionStatus.EXTRACTION_PENDING, InspectionStatus.FAILED],
    InspectionStatus.EXTRACTION_PENDING: [InspectionStatus.EXTRACTION_COMPLETED, InspectionStatus.FAILED],
    InspectionStatus.EXTRACTION_COMPLETED: [InspectionStatus.HUMAN_REVIEW_PENDING, InspectionStatus.FAILED],
    InspectionStatus.HUMAN_REVIEW_PENDING: [InspectionStatus.HUMAN_VERIFIED, InspectionStatus.FAILED],
    InspectionStatus.HUMAN_VERIFIED: [InspectionStatus.COMPLIANCE_EVALUATED, InspectionStatus.FAILED],
    InspectionStatus.COMPLIANCE_EVALUATED: [InspectionStatus.COMPLETED, InspectionStatus.FAILED],
    InspectionStatus.COMPLETED: [],  # Terminal state
    InspectionStatus.FAILED: []      # Terminal state
}

@router.post("/", response_model=InspectionResponse)
def create_inspection(inspection_in: InspectionCreate, db: Session = Depends(get_db)):
    db_inspection = Inspection(
        status=InspectionStatus.CREATED,
        product_category=inspection_in.product_category,
        package_context=inspection_in.package_context
    )
    db.add(db_inspection)
    db.commit()
    db.refresh(db_inspection)
    return db_inspection

@router.get("/", response_model=List[InspectionResponse])
def list_inspections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    inspections = db.query(Inspection).offset(skip).limit(limit).all()
    return inspections

@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(inspection_id: int, db: Session = Depends(get_db)):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return db_inspection

@router.patch("/{inspection_id}", response_model=InspectionResponse)
def update_inspection(inspection_id: int, inspection_in: InspectionUpdate, db: Session = Depends(get_db)):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    update_data = inspection_in.model_dump(exclude_unset=True)
    
    # Deterministic Status Transition Validation
    if "status" in update_data:
        new_status = update_data["status"]
        current_status = db_inspection.status
        
        if new_status != current_status:
            allowed_next_states = ALLOWED_TRANSITIONS.get(current_status, [])
            if new_status not in allowed_next_states:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid status transition from {current_status.value} to {new_status.value}"
                )

    for key, value in update_data.items():
        setattr(db_inspection, key, value)

    db.commit()
    db.refresh(db_inspection)
    return db_inspection

import os
import uuid
import shutil
from fastapi import UploadFile, File
from app.core.config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

@router.post("/{inspection_id}/images", response_model=InspectionResponse)
def upload_inspection_images(
    inspection_id: int, 
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db)
):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Status validation
    if db_inspection.status not in (InspectionStatus.CREATED, InspectionStatus.IMAGES_UPLOADED):
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot upload images in current status: {db_inspection.status.value}"
        )

    # 1. Validate all files first
    for file in files:
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
            
    # 2. Process and save files
    inspection_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "inspections", str(inspection_id))
    os.makedirs(inspection_dir, exist_ok=True)
    
    saved_files = []
    relative_paths = []
    
    try:
        for file in files:
            # Check size by reading chunks
            file_bytes = file.file.read()
            if len(file_bytes) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds the 5MB size limit")
            
            ext = file.content_type.split("/")[1]
            if ext == "jpeg":
                ext = "jpg"
                
            safe_filename = f"{uuid.uuid4()}.{ext}"
            absolute_path = os.path.join(inspection_dir, safe_filename)
            relative_path = f"inspections/{inspection_id}/{safe_filename}"
            
            with open(absolute_path, "wb") as f:
                f.write(file_bytes)
                
            saved_files.append(absolute_path)
            relative_paths.append(relative_path)
            
    except Exception as e:
        # Cleanup saved files on any failure
        for saved_file in saved_files:
            if os.path.exists(saved_file):
                os.remove(saved_file)
        raise e

    # 3. Update database
    current_images = db_inspection.image_paths or []
    current_images.extend(relative_paths)
    
    # We must explicitly force SQLAlchemy to recognize the JSON mutation
    from sqlalchemy.orm.attributes import flag_modified
    db_inspection.image_paths = current_images
    flag_modified(db_inspection, "image_paths")
    
    if db_inspection.status == InspectionStatus.CREATED:
        db_inspection.status = InspectionStatus.IMAGES_UPLOADED
        
    db.commit()
    db.refresh(db_inspection)
    return db_inspection
