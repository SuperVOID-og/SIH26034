from datetime import datetime, timezone
from fastapi import HTTPException
from app.models.inspection import Inspection
from app.schemas.inspection import InspectionStatus
from app.schemas.compliance import ComplianceSummary, EvaluationStatus
from app.schemas.report import StructuredReport, InspectionMetadata, RuleSummaryCounts

class ReportService:
    @staticmethod
    def generate_report(inspection: Inspection) -> StructuredReport:
        # Strict validation before assembly
        if inspection.status not in (InspectionStatus.COMPLIANCE_EVALUATED, InspectionStatus.COMPLETED):
            raise HTTPException(
                status_code=409, 
                detail="Inspection must be evaluated before a report can be generated."
            )
            
        if not inspection.verified_data or not inspection.compliance_results:
            raise HTTPException(
                status_code=500, 
                detail="Inspection is missing verified data or compliance results required for report generation."
            )
            
        # Parse compliance results
        compliance_summary = ComplianceSummary(**inspection.compliance_results)
        
        # We assume scoring is always present for an evaluated inspection,
        # but defensively raise if somehow missing
        if not compliance_summary.scoring:
            raise HTTPException(
                status_code=500, 
                detail="Compliance results missing scoring data."
            )
            
        # Calculate summary counts
        passed = 0
        failed = 0
        not_applicable = 0
        requires_human_review = 0
        
        for r in compliance_summary.results:
            if r.status == EvaluationStatus.PASS:
                passed += 1
            elif r.status == EvaluationStatus.FAIL:
                failed += 1
            elif r.status == EvaluationStatus.NOT_APPLICABLE:
                not_applicable += 1
            elif r.status == EvaluationStatus.REQUIRES_HUMAN_REVIEW:
                requires_human_review += 1
                
        summary_counts = RuleSummaryCounts(
            passed=passed,
            failed=failed,
            not_applicable=not_applicable,
            requires_human_review=requires_human_review,
            total_rules=len(compliance_summary.results)
        )
        
        # Assemble Metadata
        metadata = InspectionMetadata(
            id=inspection.id,
            product_category=inspection.product_category,
            package_context=inspection.package_context,
            created_at=inspection.created_at,
            updated_at=inspection.updated_at,
            status=inspection.status,
            image_paths=inspection.image_paths or []
        )
        
        # Assemble verified declarations (strictly the data payload from the HumanVerifiedExtraction schema)
        verified_data_payload = inspection.verified_data.get("data", {})
        
        # Ensure canonical schema fields are present even if null, mapping from the dictionary
        # We explicitly preserve whatever the dictionary contains.
        
        return StructuredReport(
            report_version="1.0",
            generated_at=datetime.now(timezone.utc),
            inspection=metadata,
            verified_declarations=verified_data_payload,
            assessment=compliance_summary.scoring,
            rule_evaluations=compliance_summary.results,
            summary_counts=summary_counts
        )
