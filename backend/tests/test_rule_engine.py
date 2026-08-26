import os
import json
import pytest
from app.schemas.compliance import (
    RuleDefinition, 
    HumanVerifiedExtraction, 
    EvaluationStatus
)
from app.services.compliance.rule_engine import DeterministicRuleEngine

FIXTURES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "rules", "test_fixtures", "mock_rules.json")

@pytest.fixture
def mock_rules():
    with open(FIXTURES_PATH, "r") as f:
        data = json.load(f)
    return [RuleDefinition(**rule) for rule in data]

def test_engine_pass(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    # package_context="retail" makes it applicable for TEST_001
    # TEST_FIELD is present
    extraction = HumanVerifiedExtraction(
        data={"TEST_FIELD": "exists"},
        metadata={"package_context": "retail", "product_category": "standard"}
    )
    summary = engine.evaluate(extraction)
    
    r1 = next(r for r in summary.results if r.rule_id == "TEST_001_APPLICABLE")
    assert r1.status == EvaluationStatus.PASS

def test_engine_fail(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    # package_context="retail" makes it applicable for TEST_001
    # TEST_FIELD is missing
    extraction = HumanVerifiedExtraction(
        data={},
        metadata={"package_context": "retail", "product_category": "standard"}
    )
    summary = engine.evaluate(extraction)
    
    r1 = next(r for r in summary.results if r.rule_id == "TEST_001_APPLICABLE")
    assert r1.status == EvaluationStatus.FAIL

def test_engine_not_applicable(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    # package_context="wholesale" means TEST_001 is NOT APPLICABLE
    extraction = HumanVerifiedExtraction(
        data={"TEST_FIELD": "exists"},
        metadata={"package_context": "wholesale", "product_category": "standard"}
    )
    summary = engine.evaluate(extraction)
    
    r1 = next(r for r in summary.results if r.rule_id == "TEST_001_APPLICABLE")
    assert r1.status == EvaluationStatus.NOT_APPLICABLE

def test_engine_exempt(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    # product_category="medical_device" hits the exemption in TEST_002
    extraction = HumanVerifiedExtraction(
        data={"TEST_FIELD": "exists"},
        metadata={"package_context": "retail", "product_category": "medical_device"}
    )
    summary = engine.evaluate(extraction)
    
    r2 = next(r for r in summary.results if r.rule_id == "TEST_002_EXEMPT")
    assert r2.status == EvaluationStatus.NOT_APPLICABLE
    assert "exemption" in r2.explanation.lower()

def test_engine_requires_human_review(mock_rules):
    engine = DeterministicRuleEngine(mock_rules)
    extraction = HumanVerifiedExtraction(
        data={"TEST_FIELD": "exists"},
        metadata={"package_context": "retail", "product_category": "standard"}
    )
    summary = engine.evaluate(extraction)
    
    r3 = next(r for r in summary.results if r.rule_id == "TEST_003_REVIEW")
    assert r3.status == EvaluationStatus.REQUIRES_HUMAN_REVIEW
