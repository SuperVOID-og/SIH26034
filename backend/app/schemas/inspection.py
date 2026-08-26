from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class InspectionStatus(str, Enum):
    CREATED = "CREATED"
    IMAGES_UPLOADED = "IMAGES_UPLOADED"
    EXTRACTION_PENDING = "EXTRACTION_PENDING"
    EXTRACTION_COMPLETED = "EXTRACTION_COMPLETED"
    HUMAN_REVIEW_PENDING = "HUMAN_REVIEW_PENDING"
    HUMAN_VERIFIED = "HUMAN_VERIFIED"
    COMPLIANCE_EVALUATED = "COMPLIANCE_EVALUATED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class InspectionCreate(BaseModel):
    product_category: Optional[str] = None
    package_context: Optional[str] = "retail"

class InspectionUpdate(BaseModel):
    status: Optional[InspectionStatus] = None
    product_category: Optional[str] = None
    package_context: Optional[str] = None
    image_paths: Optional[List[str]] = None
    extracted_data: Optional[Dict[str, Any]] = None
    verified_data: Optional[Dict[str, Any]] = None
    compliance_score: Optional[int] = None
    violations: Optional[Dict[str, Any]] = None
    compliance_results: Optional[Dict[str, Any]] = None

class InspectionResponse(BaseModel):
    id: int
    status: InspectionStatus
    product_category: Optional[str]
    package_context: Optional[str]
    image_paths: List[str]
    extracted_data: Optional[Dict[str, Any]]
    verified_data: Optional[Dict[str, Any]]
    compliance_score: Optional[int]
    violations: Optional[Dict[str, Any]]
    compliance_results: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class ReviewSubmission(BaseModel):
    """
    Canonical fields for the deterministic rule engine.
    This schema dictates the final shape of verified_data.data.
    """
    manufacturer_packer_importer_details: Optional[str] = None
    generic_name: Optional[str] = None
    net_quantity: Optional[str] = None
    mrp: Optional[str] = None
    manufacture_or_pack_date: Optional[str] = None
    consumer_care: Optional[str] = None
    country_of_origin: Optional[str] = None
