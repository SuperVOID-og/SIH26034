export enum InspectionStatus {
  CREATED = "CREATED",
  IMAGES_UPLOADED = "IMAGES_UPLOADED",
  EXTRACTION_PENDING = "EXTRACTION_PENDING",
  EXTRACTION_COMPLETED = "EXTRACTION_COMPLETED",
  HUMAN_REVIEW_PENDING = "HUMAN_REVIEW_PENDING",
  HUMAN_VERIFIED = "HUMAN_VERIFIED",
  COMPLIANCE_EVALUATED = "COMPLIANCE_EVALUATED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum ConfidenceLevel {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  UNKNOWN = "UNKNOWN",
}

export interface ExtractedField {
  value: string | null;
  raw_text: string | null;
  confidence: ConfidenceLevel;
  source_images: string[];
}

export interface PackageDeclarations {
  manufacturer_packer_importer_details: ExtractedField;
  common_generic_name: ExtractedField;
  net_quantity: ExtractedField;
  mrp: ExtractedField;
  manufacture_or_pack_date: ExtractedField;
  consumer_care: ExtractedField;
  country_of_origin: ExtractedField;
  raw_text_dump?: string | null;
}

export interface HumanVerifiedExtraction {
  data: Record<string, any>;
  metadata: Record<string, any>;
}

export enum OverallAssessment {
  COMPLIANT = "COMPLIANT",
  NON_COMPLIANT = "NON_COMPLIANT",
  REVIEW_REQUIRED = "REVIEW_REQUIRED",
}

export interface ScoringResult {
  score: number;
  assessment: OverallAssessment;
  is_provisional: boolean;
  earned_weight: number;
  applicable_weight: number;
  failed_rule_count: number;
  review_required_count: number;
}

export enum EvaluationStatus {
  PASS = "PASS",
  FAIL = "FAIL",
  NOT_APPLICABLE = "NOT_APPLICABLE",
  REQUIRES_HUMAN_REVIEW = "REQUIRES_HUMAN_REVIEW",
}

export enum RuleSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export interface RegulatoryTraceability {
  source_document: string;
  source_rule: string;
  source_clause: string;
  source_amendment_year: string;
}

export interface RuleEvaluationResult {
  rule_id: string;
  status: EvaluationStatus;
  explanation: string;
  source_reference: RegulatoryTraceability;
  evidence?: any;
  severity: RuleSeverity;
}

export interface ComplianceSummary {
  is_compliant: boolean;
  results: RuleEvaluationResult[];
  total_rules_evaluated: number;
  pending_human_reviews: number;
  scoring?: ScoringResult;
}

export interface InspectionResponse {
  id: number;
  status: InspectionStatus;
  product_category: string | null;
  package_context: string | null;
  image_paths: string[];
  extracted_data: Record<string, any> | null;
  verified_data: Record<string, any> | null;
  compliance_score: number | null;
  violations: Record<string, any> | null;
  compliance_results: Record<string, any> | null; // We can parse this as ComplianceSummary when needed
  created_at: string;
  updated_at: string | null;
}

export interface VerifiedDeclarationsReport {
  manufacturer_packer_importer_details: string | null;
  generic_name: string | null;
  net_quantity: string | null;
  mrp: string | null;
  manufacture_or_pack_date: string | null;
  consumer_care: string | null;
  country_of_origin: string | null;
}

export interface InspectionMetadata {
  id: number;
  product_category: string | null;
  package_context: string | null;
  created_at: string;
  updated_at: string | null;
  status: InspectionStatus;
  image_paths: string[];
}

export interface RuleSummaryCounts {
  passed: number;
  failed: number;
  not_applicable: number;
  requires_human_review: number;
  total_rules: number;
}

export interface StructuredReport {
  report_version: string;
  generated_at: string;
  inspection: InspectionMetadata;
  verified_declarations: VerifiedDeclarationsReport;
  assessment: ScoringResult;
  rule_evaluations: RuleEvaluationResult[];
  summary_counts: RuleSummaryCounts;
  disclaimer: string;
}

export interface RecentInspectionSummary {
  id: number;
  product_category: string | null;
  package_context: string | null;
  status: InspectionStatus;
  created_at: string;
  updated_at: string | null;
  assessment: string | null;
  compliance_score: number | null;
}

export interface DashboardStats {
  total_inspections: number;
  compliant: number;
  non_compliant: number;
  review_required: number;
  drafts: number;
  recent_inspections: RecentInspectionSummary[];
}
