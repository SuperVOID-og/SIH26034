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
