from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from enum import Enum

# -----------------------------------------
# Rule Definition Schemas
# -----------------------------------------

class RuleStatus(str, Enum):
    DRAFT = "draft"
    HUMAN_VERIFIED = "human_verified"
    ACTIVE = "active"
    DEPRECATED = "deprecated"

class RuleSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class RegulatoryTraceability(BaseModel):
    source_document: str = Field(..., description="e.g., Legal Metrology (Packaged Commodities) Rules, 2011")
    source_rule: str = Field(..., description="e.g., Rule 6")
    source_clause: str = Field(..., description="e.g., Sub-rule (1)(a)")
    source_amendment_year: str = Field(..., description="e.g., 2011 or 2023 Amendment")

class RuleDefinition(BaseModel):
    rule_id: str
    rule_name: str
    description: str
    applicable_product_category: Optional[List[str]] = Field(default_factory=list)
    
    # Traceability enforcement (Cannot create a rule without these)
    traceability: RegulatoryTraceability
    
    effective_date: str
    requirement: str
    
    # Engine Evaluation Logic
    input_field: str = Field(..., description="The field from the extracted JSON to check")
    condition: str = Field(..., description="The operator (e.g., 'EXISTS', 'NOT_NULL', 'GREATER_THAN')")
    expected_value: Optional[Any] = None
    
    severity: RuleSeverity
    failure_message: str
    evidence_requirement: str
    
    applicability_conditions: Optional[Dict[str, Any]] = None
    exemption_conditions: Optional[Dict[str, Any]] = None
    
    version: str
    status: RuleStatus
    human_verification_required: bool = False

# -----------------------------------------
# Engine Input / Output Schemas
# -----------------------------------------

class EvaluationStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    REQUIRES_HUMAN_REVIEW = "REQUIRES_HUMAN_REVIEW"

class RuleEvaluationResult(BaseModel):
    rule_id: str
    status: EvaluationStatus
    explanation: str
    source_reference: RegulatoryTraceability
    evidence: Optional[Any] = None
    severity: RuleSeverity

class HumanVerifiedExtraction(BaseModel):
    # This is the strictly human-verified data that the engine accepts
    data: Dict[str, Any]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ComplianceSummary(BaseModel):
    is_compliant: bool
    results: List[RuleEvaluationResult]
    # Scoring is deliberately excluded for now; will be aggregated from `results` later
    total_rules_evaluated: int
    pending_human_reviews: int
