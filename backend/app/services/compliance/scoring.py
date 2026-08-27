import math
from app.schemas.compliance import (
    ComplianceSummary,
    ScoringResult,
    RuleSeverity,
    EvaluationStatus,
    OverallAssessment
)

# Severity weights purely for decision-support scoring.
# These are NOT defined by the Legal Metrology Act or Rules, but rather
# serve as a prioritization mechanism for PackSure AI.
SEVERITY_WEIGHTS = {
    RuleSeverity.CRITICAL: 4,
    RuleSeverity.HIGH: 3,
    RuleSeverity.MEDIUM: 2,
    RuleSeverity.LOW: 1,
}

class ComplianceScorer:
    """
    Transparent, deterministic compliance scoring system.
    Generates a 0-100 score based on applicable rules and severity weights.
    """
    
    @staticmethod
    def calculate_score(summary: ComplianceSummary) -> ScoringResult:
        earned_weight = 0
        applicable_weight = 0
        failed_rule_count = 0
        review_required_count = 0
        
        for result in summary.results:
            # NOT_APPLICABLE rules are entirely excluded from scoring
            if result.status == EvaluationStatus.NOT_APPLICABLE:
                continue
                
            weight = SEVERITY_WEIGHTS.get(result.severity, 0)
            applicable_weight += weight
            
            if result.status == EvaluationStatus.PASS:
                earned_weight += weight
            elif result.status == EvaluationStatus.FAIL:
                failed_rule_count += 1
            elif result.status == EvaluationStatus.REQUIRES_HUMAN_REVIEW:
                review_required_count += 1
                
        # Overall Assessment Precedence
        if failed_rule_count > 0:
            assessment = OverallAssessment.NON_COMPLIANT
        elif review_required_count > 0:
            assessment = OverallAssessment.REVIEW_REQUIRED
        else:
            assessment = OverallAssessment.COMPLIANT
            
        # If there are unresolved manual reviews, the score is provisional
        is_provisional = review_required_count > 0
        
        # Zero Applicable Rules edge case
        if applicable_weight == 0:
            return ScoringResult(
                score=0,
                assessment=OverallAssessment.REVIEW_REQUIRED,
                is_provisional=True,
                earned_weight=0,
                applicable_weight=0,
                failed_rule_count=failed_rule_count,
                review_required_count=review_required_count
            )
            
        score = round((earned_weight / applicable_weight) * 100)
        
        return ScoringResult(
            score=score,
            assessment=assessment,
            is_provisional=is_provisional,
            earned_weight=earned_weight,
            applicable_weight=applicable_weight,
            failed_rule_count=failed_rule_count,
            review_required_count=review_required_count
        )
