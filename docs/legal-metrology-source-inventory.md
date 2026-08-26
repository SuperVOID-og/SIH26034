# Legal Metrology Source Inventory

This document serves as the regulatory inventory and analysis for the **PackSure AI** platform. It documents the official source materials from the Department of Consumer Affairs, Government of India, evaluates their relevance to packaged-commodity inspection, and outlines the primary provisions that will drive the deterministic rule engine.

## 1. Source Documents Considered

| Document Title | Document Type | Publication/Amendment Year | Relevance to PackSure AI |
| :--- | :--- | :--- | :--- |
| **The Legal Metrology Act, 2009** | Act | 2009 | **Highly Relevant.** Establishes foundational definitions and mandate (Chapter III, Section 18). |
| **The Legal Metrology (Packaged Commodities) Rules, 2011** | Rule | 2011 | **Core Foundation.** Explicitly details declarations required on every package (Rule 6, Rule 32). |
| **LM (PC) Amendment Rules, 2017** | Amendment | 2017 | **Relevant.** Introduced provisions for e-commerce platforms. |
| **LM (PC) Amendment Rules, 2022** | Amendment | 2022 | **Relevant.** Changes regarding unit sale price and month/year format. |
| **LM (PC) Amendment Rules, 2023** | Amendment | 2023 | **Relevant.** E-commerce loose commodities (Rule 26), unit sale price exemptions (Rule 6(11)), clothing sizes. |
| **LM (PC) Amendment Rules, 2025** | Amendment | 2025 | **Relevant.** Exempts Medical Devices (governed by Medical Devices Rules, 2017) and specific packages like pan masala. |
| **LM (PC) Amendment Rules, 2026** | Amendment | 2026 | **Relevant.** E-commerce Country of Origin filter requirements, AEO warehouse importer declaration allowances, corporate accountability declarations. |

## 2. Regulatory Version / Amendment Matrix

To ensure the deterministic rule engine evaluates against the correct legal text, the following matrix distinguishes the original provisions from subsequent amendments.

| Provision | Original Requirement (2011 Rules) | Subsequent Amendment(s) | Current / Consolidated Requirement |
| :--- | :--- | :--- | :--- |
| **Rule 6(1)(a): Manufacturer/Packer/Importer** | Must declare name/address. | **2026:** Importers can make declarations at AEO bonded warehouses. | **UNCHANGED** for the package itself (declaration must exist on retail package). |
| **Rule 6(1)(b): Generic Name** | Common/generic name required. | None | **UNCHANGED** |
| **Rule 6(1)(c): Net Quantity** | Standard units required. | None | **UNCHANGED** |
| **Rule 6(1)(e): MRP** | Retail sale price inclusive of taxes. | None | **UNCHANGED** |
| **Rule 6(11): Unit Sale Price** | Not explicitly detailed. | **2022/2023:** Required, but exempts combination/group packages. | **REQUIRES HUMAN VERIFICATION** |
| **Rule 26: E-commerce** | N/A | **2017/2023/2026:** E-commerce platforms must display mandatory declarations, including Country of Origin (deferred to 2027). | **REQUIRES HUMAN VERIFICATION** |
| **Medical Devices (Exemption)** | General applicability. | **2025:** Exempted; now exclusively governed by Medical Devices Rules, 2017. | **SUBJECT TO LATER EXEMPTION** (Must exempt if product_category == 'medical_device'). |
| **Rule 32: Exemptions** | Exempts institutional/industrial consumers. | **2024/2025:** Reaffirmed exclusions; exempted specific products like pan masala. | Original Rule 32 largely intact, but exact bounds require verification. |

## 3. Unresolved Ambiguities & Software Recommendations

Before converting these provisions into executable rules, the following ambiguities exist. The software must handle this uncertainty gracefully.

### Ambiguity 1: Rule 32 Exemptions (Institutional/Industrial Consumers)
*   **Issue:** The rules do not apply to packages intended for institutional or industrial consumers. AI extracting text from an image cannot reliably determine if the buyer is an "institution" unless explicitly labeled "Not for Retail Sale".
*   **Software Recommendation:** The rule engine should evaluate all packages as "Retail" by default. If a mandatory declaration is missing, the UI should flag a violation but provide an "Override" or "Mark as Institutional Exemption" button for the human inspector.

### Ambiguity 2: Generic Name Interpretation (Rule 6(1)(b))
*   **Issue:** The rule requires the "common or generic names of the commodity". It is unclear if there is a strict, legally approved list of generic names.
*   **Software Recommendation:** Do not use AI to invent or strictly validate the generic name against an arbitrary list. The AI should extract whatever is printed as the product identity. The rule engine will simply check `if extracted_generic_name is not None`. The human inspector will verify if the extracted text sufficiently serves as a generic name.

### Ambiguity 3: Amendment Consolidation
*   **Issue:** The official sources provide the 2011 base rules and isolated amendment PDFs up to 2026, but no official government-stamped consolidated PDF is reliably parseable via simple URL.
*   **Software Recommendation:** The regulatory rules in `backend/rules/` must be constructed manually by a legal domain expert who has synthesized texts. The JSON rule schema must include a field `source_amendment_year` to prove traceability for that specific condition.

---
*Document prepared strictly for regulatory-source ingestion and verification. No AI compliance evaluation logic is implemented here.*
