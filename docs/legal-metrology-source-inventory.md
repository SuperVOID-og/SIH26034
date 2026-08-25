# Legal Metrology Source Inventory

This document serves as the regulatory inventory and analysis for the **PackSure AI** platform. It documents the official source materials from the Department of Consumer Affairs, Government of India, evaluates their relevance to packaged-commodity inspection, and outlines the primary provisions that will drive the deterministic rule engine.

## 1. Source Documents Considered

| Document Title | Document Type | Publication/Amendment Year | Relevance to PackSure AI |
| :--- | :--- | :--- | :--- |
| **The Legal Metrology Act, 2009** | Act | 2009 | **Highly Relevant.** Establishes foundational definitions and mandate (Chapter III, Section 18). |
| **The Legal Metrology (Packaged Commodities) Rules, 2011** | Rule | 2011 | **Core Foundation.** Explicitly details declarations required on every package (Rule 6, Rule 32). |
| **LM (PC) Amendment Rules, 2017** | Amendment | 2017 | **Relevant.** Introduced provisions for e-commerce platforms. |
| **LM (PC) Amendment Rules, 2022** | Amendment | 2022 | **Relevant.** Changes regarding unit sale price and month/year format. |
| **LM (PC) Amendment Rules, 2023** | Amendment | Oct 6, 2023 (Eff. Jan 2024) | **Relevant.** E-commerce loose commodities (Rule 26), unit sale price exemptions (Rule 6(11)), clothing sizes. |
| **Proposed LM (PC) Amendment Rules, 2024**| Proposed Amendment | July 2024 | **Relevant.** Proposed updates to Rule 3 regarding packages over 25 kg. |

## 2. Regulatory Version / Amendment Matrix

To ensure the deterministic rule engine evaluates against the correct legal text, the following matrix distinguishes the original provisions from subsequent amendments.

| Provision | Original Requirement (2011 Rules) | Subsequent Amendment(s) | Current / Consolidated Requirement |
| :--- | :--- | :--- | :--- |
| **Rule 6(11): Unit Sale Price** | Not explicitly detailed in the original base 6(1) list. | **2022:** Required unit sale price declaration.<br>**2023:** Added proviso exempting combination/group packages. | **REQUIRES HUMAN VERIFICATION** (Need official consolidated text to confirm exact phrasing and exemptions). |
| **Rule 26: E-commerce** | N/A (E-commerce not heavily regulated in 2011). | **2017:** E-commerce platforms must display mandatory declarations.<br>**2023:** Inserted clause (g) exempting loose commodities if consumer knows type/qty, but specific info (MRP, origin, etc.) remains mandatory. | **REQUIRES HUMAN VERIFICATION** |
| **Rule 3: Applicability > 25kg** | Exempted packages above 25 kg or 25 liters. | **2024 (Proposed):** Mandate declarations on packages over 25 kg. | **REQUIRES HUMAN VERIFICATION** (Confirm if 2024 proposal was enacted). |
| **Rule 32: Exemptions** | Exempts institutional/industrial consumers and packages under 10g/10ml. | **2024 (Discussion):** Reaffirmed exclusions for industrial/institutional consumers. | Original Rule 32 largely intact, but exact bounds require verification. |

## 3. Unresolved Ambiguities & Software Recommendations

Before converting these provisions into executable rules, the following ambiguities exist. The software must handle this uncertainty gracefully.

### Ambiguity 1: Rule 32 Exemptions (Institutional/Industrial Consumers)
*   **Issue:** The rules do not apply to packages intended for institutional or industrial consumers. AI extracting text from an image cannot reliably determine if the buyer is an "institution" unless explicitly labeled "Not for Retail Sale".
*   **Software Recommendation:** The rule engine should evaluate all packages as "Retail" by default. If a mandatory declaration is missing, the UI should flag a violation but provide an "Override" or "Mark as Institutional Exemption" button for the human inspector.

### Ambiguity 2: Generic Name Interpretation (Rule 6(1)(b))
*   **Issue:** The rule requires the "common or generic names of the commodity". It is unclear if there is a strict, legally approved list of generic names.
*   **Software Recommendation:** Do not use AI to invent or strictly validate the generic name against an arbitrary list. The AI should extract whatever is printed as the product identity. The rule engine will simply check `if extracted_generic_name is not None`. The human inspector will verify if the extracted text sufficiently serves as a generic name.

### Ambiguity 3: Amendment Consolidation
*   **Issue:** The official sources provide the 2011 base rules and isolated amendment PDFs (2017, 2022, 2023), but no official government-stamped consolidated PDF is reliably parseable via simple URL.
*   **Software Recommendation:** The regulatory rules in `backend/rules/` must be constructed manually by a legal domain expert who has synthesized the 2011 + 2023 texts. The JSON rule schema must include a field `source_amendment_year` (e.g., `2023`) to prove traceability for that specific condition.

---
*Document prepared strictly for regulatory-source ingestion and verification. No AI compliance evaluation logic is implemented here.*
