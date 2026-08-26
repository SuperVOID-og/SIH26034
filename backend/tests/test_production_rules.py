import os
import json
import pytest
from pydantic import ValidationError
from app.schemas.compliance import (
    RuleDefinition, 
    HumanVerifiedExtraction, 
    EvaluationStatus
)
from app.services.compliance.rule_engine import DeterministicRuleEngine

RULES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "rules", "packaged_commodities_core.json")

@pytest.fixture
def production_rules():
    with open(RULES_PATH, "r") as f:
        data = json.load(f)
    return [RuleDefinition(**rule) for rule in data]

def test_production_rules_load(production_rules):
    # Ensure all 4 production rules load successfully and trace back to Rule 6
    engine = DeterministicRuleEngine(production_rules)
    assert len(engine.rules) == 4
    for rule in engine.rules:
        assert rule.traceability.source_rule == "Rule 6"
        assert rule.status == "human_verified"

def test_production_rules_pass(production_rules):
    engine = DeterministicRuleEngine(production_rules)
    extraction = HumanVerifiedExtraction(
        data={
            "manufacturer_packer_importer_details": "ABC Corp, Delhi",
            "generic_name": "Biscuits",
            "net_quantity": "100g",
            "mrp": "Rs. 20.00"
        },
        metadata={"package_context": "retail", "product_category": "food"}
    )
    summary = engine.evaluate(extraction)
    
    # All 4 rules should PASS
    assert len(summary.results) == 4
    for result in summary.results:
        assert result.status == EvaluationStatus.PASS

def test_production_rules_fail_missing_mrp(production_rules):
    engine = DeterministicRuleEngine(production_rules)
    extraction = HumanVerifiedExtraction(
        data={
            "manufacturer_packer_importer_details": "ABC Corp, Delhi",
            "generic_name": "Biscuits",
            "net_quantity": "100g"
            # mrp is deliberately missing
        },
        metadata={"package_context": "retail", "product_category": "food"}
    )
    summary = engine.evaluate(extraction)
    
    mrp_result = next(r for r in summary.results if r.rule_id == "PC_RULE_004_MRP")
    assert mrp_result.status == EvaluationStatus.FAIL
    assert mrp_result.explanation == "The Maximum Retail Price (MRP) declaration is missing."
    
    qty_result = next(r for r in summary.results if r.rule_id == "PC_RULE_003_NET_QUANTITY")
    assert qty_result.status == EvaluationStatus.PASS

def test_production_rules_not_applicable_wholesale(production_rules):
    engine = DeterministicRuleEngine(production_rules)
    extraction = HumanVerifiedExtraction(
        data={
            "manufacturer_packer_importer_details": "ABC Corp",
            "mrp": "Rs. 200"
        },
        metadata={"package_context": "wholesale"} # Non-retail
    )
    summary = engine.evaluate(extraction)
    
    for result in summary.results:
        assert result.status == EvaluationStatus.NOT_APPLICABLE
        assert "not applicable" in result.explanation.lower()

def test_production_rules_exempt_medical_device(production_rules):
    engine = DeterministicRuleEngine(production_rules)
    extraction = HumanVerifiedExtraction(
        data={
            "manufacturer_packer_importer_details": "MedCorp",
            "mrp": "Rs. 500"
        },
        metadata={"package_context": "retail", "product_category": "medical_device"}
    )
    summary = engine.evaluate(extraction)
    
    for result in summary.results:
        assert result.status == EvaluationStatus.NOT_APPLICABLE
        assert "exemption" in result.explanation.lower()

def test_traceability_validation_rejection():
    # Construct an invalid production rule missing traceability
    bad_data = {
        "rule_id": "PC_RULE_BAD",
        "rule_name": "Bad Rule",
        "description": "Missing traceability",
        "effective_date": "2024-01-01",
        "requirement": "Must exist",
        "input_field": "mrp",
        "condition": "EXISTS",
        "severity": "critical",
        "failure_message": "Missing",
        "evidence_requirement": "None",
        "version": "1.0",
        "status": "human_verified"
    }
    
    with pytest.raises(ValidationError) as exc_info:
        RuleDefinition(**bad_data)
    
    assert "traceability" in str(exc_info.value)
