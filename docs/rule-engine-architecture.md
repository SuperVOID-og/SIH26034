# Rule Engine Architecture

## Overview
The PackSure AI Rule Engine is a strictly deterministic evaluation system. It takes human-verified structured data (extracted via AI) and evaluates it against version-controlled JSON/YAML rules. **No AI is used in the compliance evaluation phase.**

## Workflow 
1. `HumanVerifiedExtraction`: The input to the engine. A JSON payload containing the verified declarations.
2. `Applicable Rules`: The engine filters out rules based on product category and exemption status.
3. `Deterministic Evaluation`: Simple operators (`EXISTS`, `GREATER_THAN`) evaluate the data.
4. `Rule Results`: Each rule yields `PASS`, `FAIL`, `NOT_APPLICABLE`, or `REQUIRES_HUMAN_REVIEW`.
5. `Compliance Summary`: The aggregated results, returning the exact evidence and legal traceability for every single check.

## Enforcing Regulatory Traceability
The `RuleDefinition` Pydantic schema mandates a nested `RegulatoryTraceability` object. 
A developer **cannot** create or load a rule without explicitly defining:
- `source_document`
- `source_rule`
- `source_clause`
- `source_amendment_year`

If these fields are missing, the Pydantic schema will throw a validation error, preventing the engine from starting. This guarantees that every rule output in the final report cites its exact legal origin.

## Handling Uncertainty (`REQUIRES_HUMAN_REVIEW`)
Legal Metrology rules contain ambiguities (e.g., "institutional consumer" exemptions or interpreting "generic names"). 
Instead of forcing an uncertain legal interpretation into a binary `PASS` or `FAIL`, the engine supports a `REQUIRES_HUMAN_REVIEW` status.
- Rules can be explicitly tagged with `human_verification_required = True`.
- If a rule relies on context unavailable in the structured data, the engine halts evaluation for that specific rule and flags it for the inspector on the UI dashboard.
- This maintains the integrity of the engine as a *decision-support* tool rather than a legally binding authority.

## Rule Status Lifecycle
Rules operate under strict statuses:
- `draft`: Being written, ignored by the engine.
- `human_verified`: Reviewed by a domain expert, evaluated by the engine.
- `active`: The standard production status, evaluated by the engine.
- `deprecated`: Replaced by a newer amendment, ignored by the engine.

## Future Scoring Strategy
The `ComplianceSummary` schema deliberately omits a final `score` field for now. 
Scoring will be calculated independently later by aggregating the severity weights (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) of all `FAIL` results returned by the deterministic loop. This keeps the rule evaluation logic cleanly separated from the business logic of "scoring".
