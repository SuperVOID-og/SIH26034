from typing import List, Dict, Any
from app.schemas.compliance import (
    RuleDefinition, 
    HumanVerifiedExtraction, 
    ComplianceSummary, 
    RuleEvaluationResult, 
    EvaluationStatus,
    RuleStatus,
    DeterministicCondition,
    Operator
)

class DeterministicRuleEngine:
    def __init__(self, rule_definitions: List[RuleDefinition]):
        self.rules = [
            rule for rule in rule_definitions 
            if rule.status in (RuleStatus.ACTIVE, RuleStatus.HUMAN_VERIFIED)
        ]

    def evaluate(self, extraction: HumanVerifiedExtraction) -> ComplianceSummary:
        results: List[RuleEvaluationResult] = []
        pending_reviews = 0
        
        # Merge data and metadata for context checking (e.g. package_type, product_category)
        context = {**extraction.metadata, **extraction.data}
        
        for rule in self.rules:
            # 1. Check Applicability
            if not self._is_applicable(rule, context):
                results.append(self._create_result(rule, EvaluationStatus.NOT_APPLICABLE, "Rule not applicable to this context."))
                continue

            # 2. Check Exemptions
            if self._is_exempt(rule, context):
                results.append(self._create_result(rule, EvaluationStatus.NOT_APPLICABLE, "Context meets explicit exemption conditions."))
                continue

            # 3. Check Uncertainty / Human Review
            if rule.human_verification_required:
                results.append(self._create_result(rule, EvaluationStatus.REQUIRES_HUMAN_REVIEW, "Rule requires manual legal interpretation by an inspector."))
                pending_reviews += 1
                continue

            # 4. Deterministic Condition Evaluation
            evaluation_status, explanation, evidence = self._evaluate_condition(rule, extraction.data)
            results.append(self._create_result(rule, evaluation_status, explanation, evidence))

        is_compliant = all(r.status in (EvaluationStatus.PASS, EvaluationStatus.NOT_APPLICABLE) for r in results)
        
        return ComplianceSummary(
            is_compliant=is_compliant,
            results=results,
            total_rules_evaluated=len(self.rules),
            pending_human_reviews=pending_reviews
        )

    def _evaluate_deterministic_condition(self, condition: DeterministicCondition, context: Dict[str, Any]) -> bool:
        field_value = context.get(condition.field)
        
        if condition.operator == Operator.EQUALS:
            return field_value == condition.value
        elif condition.operator == Operator.NOT_EQUALS:
            return field_value != condition.value
        elif condition.operator == Operator.IN:
            if isinstance(condition.value, list):
                return field_value in condition.value
            return False
        elif condition.operator in (Operator.EXISTS, Operator.NOT_NULL):
            return field_value is not None and str(field_value).strip() != ""
            
        return False

    def _is_applicable(self, rule: RuleDefinition, context: Dict[str, Any]) -> bool:
        if not rule.applicability_conditions:
            return True
        # ALL applicability conditions must be met (AND logic)
        for cond in rule.applicability_conditions:
            if not self._evaluate_deterministic_condition(cond, context):
                return False
        return True

    def _is_exempt(self, rule: RuleDefinition, context: Dict[str, Any]) -> bool:
        if not rule.exemption_conditions:
            return False
        # If ANY exemption condition is met (OR logic)
        for cond in rule.exemption_conditions:
            if self._evaluate_deterministic_condition(cond, context):
                return True
        return False

    def _evaluate_condition(self, rule: RuleDefinition, data: Dict[str, Any]) -> tuple[EvaluationStatus, str, Any]:
        field_value = data.get(rule.input_field)
        
        # Treat the core rule evaluation as a standard deterministic condition
        core_cond = DeterministicCondition(field=rule.input_field, operator=rule.condition, value=rule.expected_value)
        if self._evaluate_deterministic_condition(core_cond, data):
            return EvaluationStatus.PASS, "Required condition met.", field_value
        else:
            return EvaluationStatus.FAIL, rule.failure_message, field_value

    def _create_result(self, rule: RuleDefinition, status: EvaluationStatus, explanation: str, evidence: Any = None) -> RuleEvaluationResult:
        return RuleEvaluationResult(
            rule_id=rule.rule_id,
            status=status,
            explanation=explanation,
            source_reference=rule.traceability,
            evidence=evidence,
            severity=rule.severity
        )
