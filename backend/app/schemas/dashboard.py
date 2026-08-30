from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.inspection import InspectionStatus

class RecentInspectionSummary(BaseModel):
    id: int
    product_category: Optional[str] = None
    package_context: Optional[str] = None
    status: InspectionStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    assessment: Optional[str] = None
    compliance_score: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class DashboardStats(BaseModel):
    total_inspections: int
    compliant: int
    non_compliant: int
    review_required: int
    drafts: int
    recent_inspections: List[RecentInspectionSummary]
