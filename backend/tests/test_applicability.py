import pytest
from app.schemas.compliance import RuleDefinition, HumanVerifiedExtraction, EvaluationStatus
from app.services.compliance.rule_engine import DeterministicRuleEngine
from app.api.inspections import normalize_context_string

@pytest.fixture
def core_rules():
    return [
        RuleDefinition(
            rule_id="PC_RULE_001",
            rule_name="Mfg Details",
            description="",
            traceability={
                "source_document": "test",
                "source_rule": "test",
                "source_clause": "test",
                "source_amendment_year": "test"
            },
            effective_date="2011-03-07",
            requirement="",
            input_field="manufacturer",
            condition="EXISTS",
            applicability_conditions=[{"field": "package_context", "operator": "EQUALS", "value": "retail"}],
            exemption_conditions=[{"field": "product_category", "operator": "EQUALS", "value": "medical_device"}],
            severity="critical",
            failure_message="",
            evidence_requirement="",
            version="1.0",
            status="human_verified",
            human_verification_required=False
        )
    ]

def test_normalize_context_string():
    assert normalize_context_string("Retail Shelf Pack") == "retail"
    assert normalize_context_string("Packaged Food") == "packaged_food"
    assert normalize_context_string("Medical Device") == "medical_device"
    assert normalize_context_string("Unknown Context") == "unknown_context"
    assert normalize_context_string(None) is None

def test_retail_shelf_pack_applicable(core_rules):
    engine = DeterministicRuleEngine(core_rules)
    extraction = HumanVerifiedExtraction(
        data={"manufacturer": "Test Corp"},
        metadata={
            "package_context": normalize_context_string("Retail Shelf Pack"),
            "product_category": normalize_context_string("Packaged Food")
        }
    )
    summary = engine.evaluate(extraction)
    # Should be PASS, meaning it was applicable and evaluated
    assert summary.results[0].status == EvaluationStatus.PASS
    assert summary.total_rules_evaluated == 1

def test_exemption_works(core_rules):
    engine = DeterministicRuleEngine(core_rules)
    extraction = HumanVerifiedExtraction(
        data={"manufacturer": "Test Corp"},
        metadata={
            "package_context": normalize_context_string("Retail Shelf Pack"),
            "product_category": normalize_context_string("Medical Device")
        }
    )
    summary = engine.evaluate(extraction)
    # Exempted context -> NOT_APPLICABLE
    assert summary.results[0].status == EvaluationStatus.NOT_APPLICABLE
    assert summary.results[0].explanation == "Context meets explicit exemption conditions."

def test_non_applicable_context(core_rules):
    engine = DeterministicRuleEngine(core_rules)
    extraction = HumanVerifiedExtraction(
        data={"manufacturer": "Test Corp"},
        metadata={
            "package_context": normalize_context_string("Wholesale / Bulk Pack"),
            "product_category": normalize_context_string("Packaged Food")
        }
    )
    summary = engine.evaluate(extraction)
    # Wholesale context shouldn't apply to retail rule
    assert summary.results[0].status == EvaluationStatus.NOT_APPLICABLE
    assert summary.results[0].explanation == "Rule not applicable to this context."

def test_unknown_context_safe(core_rules):
    engine = DeterministicRuleEngine(core_rules)
    extraction = HumanVerifiedExtraction(
        data={"manufacturer": "Test Corp"},
        metadata={
            "package_context": normalize_context_string("Random Made Up Pack"),
            "product_category": normalize_context_string("Packaged Food")
        }
    )
    summary = engine.evaluate(extraction)
    # Unknown context shouldn't accidentally evaluate a retail rule
    assert summary.results[0].status == EvaluationStatus.NOT_APPLICABLE
