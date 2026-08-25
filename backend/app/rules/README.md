# Legal Metrology Compliance Rules

This directory will contain the deterministic, executable compliance rules for PackSure AI. 
**No rules have been implemented yet.**

## Architecture Principles
1. **Source of Truth**: All rules here must be strictly traceable to `backend/data/legal_metrology/`.
2. **Format**: Rules will be stored in YAML or JSON format, strictly adhering to the `RuleDefinition` schema defined in `backend/app/schemas/compliance.py`.
3. **Traceability Enforcement**: A rule cannot be loaded by the engine unless it explicitly declares its `source_document`, `source_rule`, `source_clause`, and `source_amendment_year`.
4. **No AI**: These files define deterministic logic. The engine interprets these files and evaluates them against structured JSON data.
5. **Testing**: These rules can and must be unit-tested without any OCR, images, or external AI calls.
