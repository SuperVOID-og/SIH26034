# Compliance Scoring System

This document outlines the design and implementation of the transparent, deterministic compliance scoring system for PackSure AI.

## Disclaimer & Limitations

> [!WARNING]
> **Not a Legal Certification**
> The compliance score is an internal PackSure decision-support metric. It is designed to help prioritize and quickly gauge the relative completeness of package declarations. **It is NOT a legal certification or a statutory compliance metric.** Regulatory `PASS/FAIL` results remain the definitive measure of legal compliance and are vastly more important than the numeric score.

> [!IMPORTANT]
> **Severity Weights**
> The severity weights assigned to rules (e.g., CRITICAL, HIGH) are product-defined priorities used for scoring. They are **NOT** defined by the Legal Metrology Act or Rules, nor do they reflect statutory penalties. The scorer consumes the severity attached to each rule definition and does not infer legal severity itself.

## Scoring Model

The score is calculated as a simple percentage of earned severity weights over applicable severity weights. The score is strictly bounded between 0 and 100.

### Severity Weights

- **CRITICAL** = 4
- **HIGH** = 3
- **MEDIUM** = 2
- **LOW** = 1

### Rule Status Handling

1. **PASS**: 
   - Included in the denominator.
   - Earns full severity weight in the numerator.
2. **FAIL**: 
   - Included in the denominator.
   - Earns 0 weight in the numerator.
   - Forces the overall assessment to `NON_COMPLIANT`.
3. **NOT_APPLICABLE**: 
   - Entirely excluded from the denominator and numerator.
4. **REQUIRES_HUMAN_REVIEW**: 
   - Included in the denominator.
   - Earns 0 weight in the numerator until resolved by a human.
   - Forces the overall assessment to `REVIEW_REQUIRED` (unless a `FAIL` already exists).
   - Marks the score as `is_provisional = True`.

## Overall Assessment Logic

The system provides a human-readable assessment string alongside the numeric score, evaluated in the following precedence:

1. If **ANY** rule evaluates to `FAIL`, the assessment is `NON_COMPLIANT`.
2. Else if **ANY** rule evaluates to `REQUIRES_HUMAN_REVIEW`, the assessment is `REVIEW_REQUIRED`.
3. Else, the assessment is `COMPLIANT`.

*Note: If both a `FAIL` and a `REQUIRES_HUMAN_REVIEW` exist, the assessment is `NON_COMPLIANT`, but the score remains provisional (`is_provisional = True`) because unresolved rules remain.*

## Zero Applicable Rules

If an inspection results in 0 applicable rules (e.g., all rules are explicitly exempt):
- `score` = 0
- `assessment` = `REVIEW_REQUIRED`
- `is_provisional` = True

This safe deterministic fallback prevents division by zero and avoids automatically claiming 100% compliance when no evidence was actually evaluated. It forces a human to verify why no rules applied.
