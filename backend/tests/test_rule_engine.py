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

# Path to the mock rules
FIXTURES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "rules", "test_fixtures", "mock_rules.json")

@pytest.fixture
def mock_rules():
    with open(FIXTURES_PATH, "r") as f:
        data = json.load(f)
    return [RuleDefinition(**rule) for rule in data]

def test_rule_loading_and_filtering(mock_rules):
    # DRAFT and DEPRECATED rules should not be loaded by the engine
    engine = DeterministicRuleEngine(mock_rules)
    assert len(engine.rules) == 2  # Only active/human_verified should remain
    loaded_ids = [r.rule_id for r in engine.rules]
    assert "TEST_RULE_001_PASS" in loaded_ids
    assert "TEST_RULE_002_HUMAN_REVIEW" in loaded_ids
    assert "TEST_RULE_003_DRAFT" not in loaded_ids
    assert "TEST_RULE_004_DEPRECATED" not in loaded_ids

def test_engine_pass_condition(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    extraction = HumanVerifiedExtraction(
        data={"TEST_FIELD_A": "This exists", "category": "test_category"}
    )
    
    # Needs a mock for applicability if it's implemented. In our scaffold it returns True.
    summary = engine.evaluate(extraction)
    
    # We should have two results: one PASS (from 001) and one REQUIRES_HUMAN_REVIEW (from 002)
    assert len(summary.results) == 2
    
    rule_1_result = next(r for r in summary.results if r.rule_id == "TEST_RULE_001_PASS")
    assert rule_1_result.status == EvaluationStatus.PASS
    assert rule_1_result.evidence == "This exists"

def test_engine_fail_condition(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    # TEST_FIELD_A is missing
    extraction = HumanVerifiedExtraction(
        data={"category": "test_category"}
    )
    
    summary = engine.evaluate(extraction)
    
    rule_1_result = next(r for r in summary.results if r.rule_id == "TEST_RULE_001_PASS")
    assert rule_1_result.status == EvaluationStatus.FAIL
    assert rule_1_result.explanation == "TEST_FIELD_A is missing"

def test_engine_requires_human_review(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    extraction = HumanVerifiedExtraction(
        data={"TEST_FIELD_B": "Some data", "category": "test_category"}
    )
    
    summary = engine.evaluate(extraction)
    
    rule_2_result = next(r for r in summary.results if r.rule_id == "TEST_RULE_002_HUMAN_REVIEW")
    assert rule_2_result.status == EvaluationStatus.REQUIRES_HUMAN_REVIEW
    assert summary.pending_human_reviews == 1

def test_traceability_validation_failure():
    # Attempt to create a rule without traceability
    bad_rule_data = {
        "rule_id": "TEST_BAD",
        "rule_name": "[TEST_ONLY] Bad Rule",
        "description": "NON_REGULATORY missing traceability",
        "effective_date": "2026-01-01",
        "requirement": "TEST",
        "input_field": "TEST",
        "condition": "EXISTS",
        "severity": "low",
        "failure_message": "Fail",
        "evidence_requirement": "None",
        "version": "1.0",
        "status": "active"
    }
    
    with pytest.raises(ValidationError) as exc_info:
        RuleDefinition(**bad_rule_data)
    
    assert "traceability" in str(exc_info.value)
