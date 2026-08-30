from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime
from app.schemas.inspection import InspectionStatus
from app.schemas.compliance import (
    ScoringResult,
    RuleEvaluationResult
)

class InspectionMetadata(BaseModel):
    id: int
    product_category: Optional[str]
    package_context: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    status: InspectionStatus
    image_paths: List[str]

class RuleSummaryCounts(BaseModel):
    passed: int
    failed: int
    not_applicable: int
    requires_human_review: int
    total_rules: int

class VerifiedDeclarationsReport(BaseModel):
    manufacturer_packer_importer_details: Optional[str] = None
    generic_name: Optional[str] = None
    net_quantity: Optional[str] = None
    mrp: Optional[str] = None
    manufacture_or_pack_date: Optional[str] = None
    consumer_care: Optional[str] = None
    country_of_origin: Optional[str] = None

class StructuredReport(BaseModel):
    report_version: str = Field(default="1.0")
    generated_at: datetime
    
    inspection: InspectionMetadata
    
    verified_declarations: VerifiedDeclarationsReport
    
    assessment: ScoringResult
    
    rule_evaluations: List[RuleEvaluationResult]
    
    summary_counts: RuleSummaryCounts
    
    disclaimer: str = Field(
        default="PackSure provides traceable decision-support based on codified Legal Metrology rules and human-verified package declarations. It does not constitute statutory inspection, legal certification, or legal advice."
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "report_version": "1.0",
                "generated_at": "2026-08-30T10:00:00Z",
                "inspection": {
                    "id": 101,
                    "product_category": "retail",
                    "package_context": "retail",
                    "created_at": "2026-08-30T09:00:00Z",
                    "updated_at": "2026-08-30T10:00:00Z",
                    "status": "COMPLIANCE_EVALUATED",
                    "image_paths": ["inspections/101/front.jpg"]
                },
                "verified_declarations": {
                    "manufacturer_packer_importer_details": "Acme Corp, Mumbai",
                    "generic_name": "Premium Biscuits",
                    "net_quantity": "500g",
                    "mrp": "₹150.00",
                    "manufacture_or_pack_date": "10/08/2026",
                    "consumer_care": "1800-123-456",
                    "country_of_origin": "India"
                },
                "assessment": {
                    "score": 100,
                    "assessment": "COMPLIANT",
                    "is_provisional": False,
                    "earned_weight": 10,
                    "applicable_weight": 10,
                    "failed_rule_count": 0,
                    "review_required_count": 0
                },
                "rule_evaluations": [],
                "summary_counts": {
                    "passed": 7,
                    "failed": 0,
                    "not_applicable": 0,
                    "requires_human_review": 0,
                    "total_rules": 7
                },
                "disclaimer": "PackSure provides traceable decision-support based on codified Legal Metrology rules and human-verified package declarations. It does not constitute statutory inspection, legal certification, or legal advice."
            }
        }
    )
