import pytest
from app.services.compliance.scoring import ComplianceScorer
from app.schemas.compliance import (
    ComplianceSummary,
    RuleEvaluationResult,
    EvaluationStatus,
    RuleSeverity,
    RegulatoryTraceability,
    OverallAssessment
)

# Dummy traceability
dummy_trace = RegulatoryTraceability(
    source_document="Test",
    source_rule="Test",
    source_clause="Test",
    source_amendment_year="2026"
)

def create_result(status: EvaluationStatus, severity: RuleSeverity) -> RuleEvaluationResult:
    return RuleEvaluationResult(
        rule_id="test",
        status=status,
        explanation="test",
        source_reference=dummy_trace,
        severity=severity
    )

def test_all_pass_100_percent():
    summary = ComplianceSummary(
        is_compliant=True,
        results=[
            create_result(EvaluationStatus.PASS, RuleSeverity.CRITICAL),
            create_result(EvaluationStatus.PASS, RuleSeverity.HIGH),
            create_result(EvaluationStatus.PASS, RuleSeverity.MEDIUM),
            create_result(EvaluationStatus.PASS, RuleSeverity.LOW),
        ],
        total_rules_evaluated=4,
        pending_human_reviews=0
    )
    score_res = ComplianceScorer.calculate_score(summary)
    assert score_res.score == 100
    assert score_res.assessment == OverallAssessment.COMPLIANT
    assert score_res.is_provisional is False
    assert score_res.earned_weight == 10  # 4 + 3 + 2 + 1
    assert score_res.applicable_weight == 10

def test_one_fail_reduces_score():
    summary = ComplianceSummary(
        is_compliant=False,
        results=[
            create_result(EvaluationStatus.PASS, RuleSeverity.CRITICAL), # 4
            create_result(EvaluationStatus.FAIL, RuleSeverity.HIGH),     # 0 earned, 3 applicable
            create_result(EvaluationStatus.PASS, RuleSeverity.MEDIUM), # 2
            create_result(EvaluationStatus.PASS, RuleSeverity.LOW),    # 1
        ],
        total_rules_evaluated=4,
        pending_human_reviews=0
    )
    score_res = ComplianceScorer.calculate_score(summary)
    assert score_res.score == 70  # (4 + 2 + 1) / 10 * 100
    assert score_res.assessment == OverallAssessment.NON_COMPLIANT
    assert score_res.is_provisional is False
    assert score_res.failed_rule_count == 1

def test_not_applicable_ignored():
    summary = ComplianceSummary(
        is_compliant=True,
        results=[
            create_result(EvaluationStatus.PASS, RuleSeverity.CRITICAL), # 4
            create_result(EvaluationStatus.NOT_APPLICABLE, RuleSeverity.HIGH), # 0 applicable
            create_result(EvaluationStatus.NOT_APPLICABLE, RuleSeverity.MEDIUM), # 0 applicable
        ],
        total_rules_evaluated=3,
        pending_human_reviews=0
    )
    score_res = ComplianceScorer.calculate_score(summary)
    assert score_res.score == 100
    assert score_res.applicable_weight == 4
    assert score_res.earned_weight == 4
    assert score_res.assessment == OverallAssessment.COMPLIANT

def test_requires_human_review():
    summary = ComplianceSummary(
        is_compliant=False,
        results=[
            create_result(EvaluationStatus.PASS, RuleSeverity.CRITICAL), # 4
            create_result(EvaluationStatus.REQUIRES_HUMAN_REVIEW, RuleSeverity.HIGH), # 0 earned, 3 applicable
        ],
        total_rules_evaluated=2,
        pending_human_reviews=1
    )
    score_res = ComplianceScorer.calculate_score(summary)
    assert score_res.score == 57  # 4 / 7 * 100
    assert score_res.assessment == OverallAssessment.REVIEW_REQUIRED
    assert score_res.is_provisional is True
    assert score_res.review_required_count == 1

def test_human_review_with_fail():
    summary = ComplianceSummary(
        is_compliant=False,
        results=[
            create_result(EvaluationStatus.FAIL, RuleSeverity.CRITICAL), # 0 earned, 4 app
            create_result(EvaluationStatus.REQUIRES_HUMAN_REVIEW, RuleSeverity.HIGH), # 0 earned, 3 app
        ],
        total_rules_evaluated=2,
        pending_human_reviews=1
    )
    score_res = ComplianceScorer.calculate_score(summary)
    assert score_res.score == 0
    assert score_res.assessment == OverallAssessment.NON_COMPLIANT  # Fail takes precedence over review
    assert score_res.is_provisional is True # But it is still provisional
    
def test_zero_applicable_rules():
    summary = ComplianceSummary(
        is_compliant=True,
        results=[
            create_result(EvaluationStatus.NOT_APPLICABLE, RuleSeverity.CRITICAL),
            create_result(EvaluationStatus.NOT_APPLICABLE, RuleSeverity.HIGH),
        ],
        total_rules_evaluated=2,
        pending_human_reviews=0
    )
    score_res = ComplianceScorer.calculate_score(summary)
    assert score_res.score == 0
    assert score_res.assessment == OverallAssessment.REVIEW_REQUIRED
    assert score_res.is_provisional is True
    assert score_res.applicable_weight == 0
