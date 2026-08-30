from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.inspection import Inspection
from app.schemas.inspection import InspectionStatus
from app.schemas.dashboard import DashboardStats, RecentInspectionSummary

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    # Fetch all inspections, ordered for the recent list
    inspections = db.query(Inspection).order_by(
        func.coalesce(Inspection.updated_at, Inspection.created_at).desc(),
        Inspection.id.desc()
    ).all()

    total = len(inspections)
    compliant = 0
    non_compliant = 0
    review_required = 0
    drafts = 0

    recent = []

    draft_statuses = {
        InspectionStatus.CREATED,
        InspectionStatus.IMAGES_UPLOADED,
        InspectionStatus.EXTRACTION_PENDING,
        InspectionStatus.EXTRACTION_COMPLETED,
        InspectionStatus.HUMAN_REVIEW_PENDING,
        InspectionStatus.HUMAN_VERIFIED,
        InspectionStatus.FAILED
    }

    for idx, ins in enumerate(inspections):
        if ins.status in draft_statuses:
            drafts += 1

        # Check compliance results carefully
        assessment_val = None
        if ins.compliance_results and isinstance(ins.compliance_results, dict):
            scoring = ins.compliance_results.get("scoring")
            if scoring and isinstance(scoring, dict):
                assessment_val = scoring.get("assessment")
                
                if assessment_val == "COMPLIANT":
                    compliant += 1
                elif assessment_val == "NON_COMPLIANT":
                    non_compliant += 1
                elif assessment_val == "REVIEW_REQUIRED":
                    review_required += 1

        # Collect recent 5
        if idx < 5:
            recent.append(RecentInspectionSummary(
                id=ins.id,
                product_category=ins.product_category,
                package_context=ins.package_context,
                status=ins.status,
                created_at=ins.created_at,
                updated_at=ins.updated_at,
                assessment=assessment_val,
                compliance_score=ins.compliance_score
            ))

    return DashboardStats(
        total_inspections=total,
        compliant=compliant,
        non_compliant=non_compliant,
        review_required=review_required,
        drafts=drafts,
        recent_inspections=recent
    )
