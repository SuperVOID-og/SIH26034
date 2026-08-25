from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter()

@router.post("/")
def create_inspection(db: Session = Depends(get_db)):
    """
    Endpoint to start a new inspection by uploading images.
    Implementation pending.
    """
    return {"message": "Inspection created"}

@router.get("/{inspection_id}")
def get_inspection(inspection_id: int, db: Session = Depends(get_db)):
    """
    Endpoint to retrieve inspection details.
    Implementation pending.
    """
    return {"message": f"Details for {inspection_id}"}
