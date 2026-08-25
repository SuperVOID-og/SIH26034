from pydantic import BaseModel
from typing import Optional, List

class ExtractedDeclaration(BaseModel):
    mrp: Optional[float] = None
    net_quantity: Optional[str] = None
    manufacturer_name: Optional[str] = None
    manufacturer_address: Optional[str] = None
    consumer_care: Optional[str] = None
    # Add other fields as needed based on regulations

class ExtractionResult(BaseModel):
    is_successful: bool
    data: ExtractedDeclaration
    confidence_score: float
    raw_text_detected: Optional[str] = None
