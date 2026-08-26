from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNKNOWN = "UNKNOWN"

class ExtractedField(BaseModel):
    value: Optional[str] = Field(None, description="The cleaned extracted value. Null if strictly missing or unreadable.")
    raw_text: Optional[str] = Field(None, description="The exact raw text visible on the package representing this value.")
    confidence: ConfidenceLevel = Field(default=ConfidenceLevel.UNKNOWN, description="Extraction confidence indicator.")
    source_images: List[str] = Field(default_factory=list, description="Relative paths of the images providing this evidence.")

class PackageDeclarations(BaseModel):
    """
    Structured representation of package declarations extracted from images.
    Matches the deterministic fields required for compliance evaluation.
    """
    manufacturer_packer_importer_details: ExtractedField
    common_generic_name: ExtractedField
    net_quantity: ExtractedField
    mrp: ExtractedField
    manufacture_or_pack_date: ExtractedField
    consumer_care: ExtractedField
    country_of_origin: ExtractedField
    raw_text_dump: Optional[str] = Field(None, description="A general dump of unclassified text found on the package, useful for debugging.")
