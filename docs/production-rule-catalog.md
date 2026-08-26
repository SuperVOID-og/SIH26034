# Production Rule Catalog

This catalog documents the human-verified, deterministic production rules implemented in the PackSure AI Rule Engine. 

These rules are strictly derived from the official *Legal Metrology (Packaged Commodities) Rules, 2011* and its amendments.

---

## Rule 6: Mandatory Declarations on Retail Packages

### `PC_RULE_001_MFG_DETAILS`
*   **Requirement:** Every package shall bear the name and address of the manufacturer, packer, or importer.
*   **Input Field:** `manufacturer_packer_importer_details`
*   **Source Document:** Legal Metrology (Packaged Commodities) Rules, 2011
*   **Rule / Clause:** Rule 6, Sub-rule (1)(a)
*   **Amendment / Version:** 2011 (Base)
*   **Applicability:** `package_context EQUALS retail`
*   **Exemptions:** `product_category EQUALS medical_device`
*   **Status:** `human_verified`
*   **Human Review Notes:** The rule engine checks for the existence of the declaration. Semantic validation of the address completeness is performed by the human inspector.

### `PC_RULE_002_GENERIC_NAME`
*   **Requirement:** The common or generic names of the commodity contained in the package must be declared.
*   **Input Field:** `generic_name`
*   **Source Document:** Legal Metrology (Packaged Commodities) Rules, 2011
*   **Rule / Clause:** Rule 6, Sub-rule (1)(b)
*   **Amendment / Version:** 2011 (Base)
*   **Applicability:** `package_context EQUALS retail`
*   **Exemptions:** `product_category EQUALS medical_device`
*   **Status:** `human_verified`
*   **Human Review Notes:** It is unclear if there is a strict, legally approved list of generic names. The engine checks if *a* name was extracted; the inspector verifies if it's legally sufficient.

### `PC_RULE_003_NET_QUANTITY`
*   **Requirement:** The net quantity, in terms of the standard unit of weight or measure, must be declared.
*   **Input Field:** `net_quantity`
*   **Source Document:** Legal Metrology (Packaged Commodities) Rules, 2011
*   **Rule / Clause:** Rule 6, Sub-rule (1)(c)
*   **Amendment / Version:** 2011 (Base)
*   **Applicability:** `package_context EQUALS retail`
*   **Exemptions:** `product_category EQUALS medical_device`
*   **Status:** `human_verified`
*   **Human Review Notes:** Currently checks for existence. Future improvements may validate the unit string (e.g., 'g', 'ml') against Rule 13 standard units.

### `PC_RULE_004_MRP`
*   **Requirement:** The retail sale price of the package shall clearly indicate that it is the maximum retail price inclusive of all taxes.
*   **Input Field:** `mrp`
*   **Source Document:** Legal Metrology (Packaged Commodities) Rules, 2011
*   **Rule / Clause:** Rule 6, Sub-rule (1)(e)
*   **Amendment / Version:** 2011 (Base)
*   **Applicability:** `package_context EQUALS retail`
*   **Exemptions:** `product_category EQUALS medical_device`
*   **Status:** `human_verified`
*   **Human Review Notes:** Requires the inspector to verify if the extracted MRP matches the physical label visually.
