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
@router.post("", response_model=InspectionResponse, include_in_schema=False)
@router.post("/", response_model=InspectionResponse)
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

@router.get("", response_model=List[InspectionResponse], include_in_schema=False)
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

@router.delete("/{inspection_id}")
def delete_inspection(inspection_id: int, db: Session = Depends(get_db)):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    # Guard: completed inspections cannot be deleted as drafts
    if db_inspection.status in (InspectionStatus.COMPLIANCE_EVALUATED, InspectionStatus.COMPLETED):
        raise HTTPException(
            status_code=409, 
            detail="Completed inspections cannot be deleted as drafts."
        )
        
    # Storage Cleanup
    import os
    import shutil
    from app.core.config import settings
    
    # Defensively validate path to prevent arbitrary deletion
    storage_root = os.path.abspath(os.path.join(settings.LOCAL_STORAGE_DIR, "inspections"))
    target_dir = os.path.abspath(os.path.join(storage_root, str(inspection_id)))
    
    if not target_dir.startswith(storage_root) or target_dir == storage_root:
        raise HTTPException(status_code=500, detail="Invalid storage path resolution.")
        
    if os.path.exists(target_dir):
        try:
            shutil.rmtree(target_dir)
        except Exception as e:
            # Do not delete DB record if file cleanup fails
            raise HTTPException(status_code=500, detail=f"Failed to delete associated files: {str(e)}")

    # Clean DB record
    db.delete(db_inspection)
    db.commit()
    
    return {"deleted": True, "inspection_id": inspection_id}


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

from app.services.extraction.gemini_service import GeminiExtractionService, GeminiExtractionError

@router.post("/{inspection_id}/extract", response_model=InspectionResponse)
def extract_inspection_data(inspection_id: int, db: Session = Depends(get_db)):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    # Pre-flight state check
    if db_inspection.status not in (
        InspectionStatus.IMAGES_UPLOADED, 
        InspectionStatus.EXTRACTION_PENDING, 
        InspectionStatus.FAILED
    ):
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot extract data from status: {db_inspection.status.value}. Must be IMAGES_UPLOADED, EXTRACTION_PENDING, or FAILED."
        )
        
    # Pre-flight data checks
    if not db_inspection.image_paths:
        raise HTTPException(status_code=400, detail="No images associated with this inspection.")
        
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
        
    # Verify at least one image exists physically
    has_valid_image = False
    for rel_path in db_inspection.image_paths:
        abs_path = os.path.join(settings.LOCAL_STORAGE_DIR, rel_path.replace("/", os.sep))
        if os.path.exists(abs_path):
            has_valid_image = True
            break
            
    if not has_valid_image:
        raise HTTPException(status_code=400, detail="No physical image files found on disk.")

    # Transition to pending
    db_inspection.status = InspectionStatus.EXTRACTION_PENDING
    db.commit()
    
    # Process extraction
    service = GeminiExtractionService()
    try:
        declarations = service.extract_from_images(db_inspection.image_paths)
        
        # Save output
        db_inspection.extracted_data = declarations.model_dump()
        db_inspection.status = InspectionStatus.EXTRACTION_COMPLETED
        db.commit()
        
        # Immediately transition to Human Review Pending
        db_inspection.status = InspectionStatus.HUMAN_REVIEW_PENDING
        db.commit()
        db.refresh(db_inspection)
        return db_inspection
        
    except GeminiExtractionError as e:
        # On any extraction failure, mark FAILED per user instruction
        db_inspection.status = InspectionStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db_inspection.status = InspectionStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Unexpected error during extraction: {str(e)}")

from app.schemas.inspection import ReviewSubmission
from app.schemas.compliance import HumanVerifiedExtraction
from datetime import datetime

@router.get("/{inspection_id}/review")
def get_inspection_review(inspection_id: int, db: Session = Depends(get_db)):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    if db_inspection.status in (InspectionStatus.CREATED, InspectionStatus.IMAGES_UPLOADED, InspectionStatus.EXTRACTION_PENDING):
        raise HTTPException(status_code=400, detail="Extraction has not completed yet.")
        
    return {
        "extracted_data": db_inspection.extracted_data,
        "verified_data": db_inspection.verified_data,
        "status": db_inspection.status
    }

@router.post("/{inspection_id}/review", response_model=InspectionResponse)
def submit_human_review(inspection_id: int, review: ReviewSubmission, db: Session = Depends(get_db)):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    if db_inspection.status != InspectionStatus.HUMAN_REVIEW_PENDING:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot submit review from status {db_inspection.status.value}. Must be HUMAN_REVIEW_PENDING."
        )

    ai_data = db_inspection.extracted_data or {}
    changed_fields = []
    
    # Mapping AI schema names to canonical compliance engine names
    ai_mapping = {
        "manufacturer_packer_importer_details": "manufacturer_packer_importer_details",
        "generic_name": "common_generic_name",
        "net_quantity": "net_quantity",
        "mrp": "mrp",
        "manufacture_or_pack_date": "manufacture_or_pack_date",
        "consumer_care": "consumer_care",
        "country_of_origin": "country_of_origin"
    }
    
    for canonical_field, human_value in review.model_dump().items():
        ai_field = ai_mapping.get(canonical_field)
        ai_val_obj = ai_data.get(ai_field, {}) if ai_data else {}
        ai_value = ai_val_obj.get("value")
        
        if human_value != ai_value:
            changed_fields.append(canonical_field)

    verified = HumanVerifiedExtraction(
        data=review.model_dump(),
        metadata={
            "reviewed_at": datetime.utcnow().isoformat(),
            "changed_fields": changed_fields
        }
    )
    
    # We must explicitly force SQLAlchemy to recognize the JSON mutation
    from sqlalchemy.orm.attributes import flag_modified
    db_inspection.verified_data = verified.model_dump()
    flag_modified(db_inspection, "verified_data")
    
    db_inspection.status = InspectionStatus.HUMAN_VERIFIED
    db.commit()
    db.refresh(db_inspection)
    return db_inspection

import json
from copy import deepcopy
from app.schemas.compliance import RuleDefinition
from app.services.compliance.rule_engine import DeterministicRuleEngine
from app.services.compliance.scoring import ComplianceScorer
import os

def normalize_context_string(value: str | None) -> str | None:
    """
    Normalizes frontend-friendly context strings into deterministic
    canonical values required by the compliance rule engine.
    """
    if not value:
        return None
    val = value.strip().lower()
    
    if val in ["retail shelf pack", "retail", "retail_package"]:
        return "retail"
    if val in ["e-commerce listing pack", "e-commerce", "ecommerce"]:
        return "ecommerce"
    if val in ["wholesale / bulk pack", "wholesale", "bulk"]:
        return "wholesale"
        
    if val in ["medical device", "medical_device", "medical equipment"]:
        return "medical_device"
    if val in ["packaged food", "food", "packaged_food"]:
        return "packaged_food"
        
    return val.replace(" ", "_")

@router.post("/{inspection_id}/evaluate", response_model=InspectionResponse)
def evaluate_compliance(inspection_id: int, db: Session = Depends(get_db)):
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    if db_inspection.status != InspectionStatus.HUMAN_VERIFIED:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot evaluate from status: {db_inspection.status.value}. Must be HUMAN_VERIFIED."
        )
        
    if not db_inspection.verified_data:
        raise HTTPException(status_code=400, detail="Missing verified_data for evaluation.")
        
    try:
        # Validate stored verified_data
        verified_extraction = HumanVerifiedExtraction(**db_inspection.verified_data)
        
        # Inject normalized package_context and product_category into a COPY of the metadata
        metadata_copy = deepcopy(verified_extraction.metadata)
        metadata_copy["package_context"] = normalize_context_string(db_inspection.package_context)
        metadata_copy["product_category"] = normalize_context_string(db_inspection.product_category)
        
        # We create a new copy with the updated metadata for the engine
        extraction_for_engine = HumanVerifiedExtraction(
            data=verified_extraction.data,
            metadata=metadata_copy
        )
        
        # Load production rules ONLY
        rules_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            "rules", 
            "packaged_commodities_core.json"
        )
        
        if not os.path.exists(rules_path):
            raise FileNotFoundError(f"Production rule file not found at {rules_path}")
            
        with open(rules_path, 'r', encoding='utf-8') as f:
            rules_json = json.load(f)
            
        rule_definitions = [RuleDefinition(**r) for r in rules_json]
        
        engine = DeterministicRuleEngine(rule_definitions)
        compliance_summary = engine.evaluate(extraction_for_engine)
        
        scoring_result = ComplianceScorer.calculate_score(compliance_summary)
        compliance_summary.scoring = scoring_result
        
        # Persist complete ComplianceSummary into compliance_results
        db_inspection.compliance_results = compliance_summary.model_dump()
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(db_inspection, "compliance_results")
        
        db_inspection.compliance_score = scoring_result.score
        
        db_inspection.status = InspectionStatus.COMPLIANCE_EVALUATED
        db.commit()
        db.refresh(db_inspection)
        return db_inspection
        
    except Exception as e:
        db_inspection.status = InspectionStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Compliance evaluation failed: {str(e)}")

from app.schemas.report import StructuredReport
from app.services.report_service import ReportService

@router.get("/{inspection_id}/report", response_model=StructuredReport, summary="Generate structured inspection report")
def get_inspection_report(inspection_id: int, db: Session = Depends(get_db)):
    """
    Generates an authoritative, structured JSON report from a finalized inspection.
    The report combines inspection metadata, human-verified declarations, deterministic scoring,
    rule evaluations, and full regulatory traceability. No AI generation is performed at this stage.
    """
    db_inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not db_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    # The ReportService handles all strict validation, extraction, and assembly without mutating the DB record.
    report = ReportService.generate_report(db_inspection)
    
    return report
