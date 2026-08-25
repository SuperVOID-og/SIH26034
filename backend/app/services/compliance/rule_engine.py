from typing import List, Dict, Any
from app.schemas.compliance import (
    RuleDefinition, 
    HumanVerifiedExtraction, 
    ComplianceSummary, 
    RuleEvaluationResult, 
    EvaluationStatus,
    RuleStatus
)

class DeterministicRuleEngine:
    def __init__(self, rule_definitions: List[RuleDefinition]):
        """
        Initializes the engine with a set of version-controlled, traceable rules.
        Filters out any rules that are not ACTIVE or HUMAN_VERIFIED.
        """
        self.rules = [
            rule for rule in rule_definitions 
            if rule.status in (RuleStatus.ACTIVE, RuleStatus.HUMAN_VERIFIED)
        ]

    def evaluate(self, extraction: HumanVerifiedExtraction) -> ComplianceSummary:
        """
        Core deterministic evaluation loop.
        Takes human-verified data and runs it against all active rules.
        NO AI IS USED IN THIS METHOD.
        """
        results: List[RuleEvaluationResult] = []
        pending_reviews = 0
        
        for rule in self.rules:
            # 1. Check Applicability
            if not self._is_applicable(rule, extraction.data):
                results.append(self._create_result(rule, EvaluationStatus.NOT_APPLICABLE, "Rule not applicable to this product category or context."))
                continue

            # 2. Check Exemptions
            if self._is_exempt(rule, extraction.data):
                results.append(self._create_result(rule, EvaluationStatus.NOT_APPLICABLE, "Product meets exemption conditions."))
                continue

            # 3. Check Uncertainty / Human Review Requirement
            if rule.human_verification_required:
                results.append(self._create_result(rule, EvaluationStatus.REQUIRES_HUMAN_REVIEW, "Rule requires manual legal interpretation by an inspector."))
                pending_reviews += 1
                continue

            # 4. Deterministic Condition Evaluation
            evaluation_status, explanation, evidence = self._evaluate_condition(rule, extraction.data)
            results.append(self._create_result(rule, evaluation_status, explanation, evidence))

        # Determine overall compliance (simple boolean for now, scoring deferred)
        is_compliant = all(r.status in (EvaluationStatus.PASS, EvaluationStatus.NOT_APPLICABLE) for r in results)
        
        return ComplianceSummary(
            is_compliant=is_compliant,
            results=results,
            total_rules_evaluated=len(self.rules),
            pending_human_reviews=pending_reviews
        )

    def _is_applicable(self, rule: RuleDefinition, data: Dict[str, Any]) -> bool:
        # Implementation placeholder
        return True

    def _is_exempt(self, rule: RuleDefinition, data: Dict[str, Any]) -> bool:
        # Implementation placeholder
        return False

    def _evaluate_condition(self, rule: RuleDefinition, data: Dict[str, Any]) -> tuple[EvaluationStatus, str, Any]:
        """
        Evaluates the specific condition (e.g., 'EXISTS', 'GREATER_THAN').
        Returns (Status, Explanation, Evidence).
        """
        field_value = data.get(rule.input_field)
        
        if rule.condition == "EXISTS" or rule.condition == "NOT_NULL":
            if field_value is not None and str(field_value).strip() != "":
                return EvaluationStatus.PASS, "Required field is present.", field_value
            else:
                return EvaluationStatus.FAIL, rule.failure_message, None
                
        return EvaluationStatus.REQUIRES_HUMAN_REVIEW, f"Unsupported condition: {rule.condition}", None

    def _create_result(self, rule: RuleDefinition, status: EvaluationStatus, explanation: str, evidence: Any = None) -> RuleEvaluationResult:
        return RuleEvaluationResult(
            rule_id=rule.rule_id,
            status=status,
            explanation=explanation,
            source_reference=rule.traceability,
            evidence=evidence,
            severity=rule.severity
        )
