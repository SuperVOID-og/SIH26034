import { InspectionStatus } from "../types/api";

export function getInspectionResumeRoute(status: string, id: number): string | null {
  switch (status) {
    case InspectionStatus.CREATED:
      return `/inspections/${id}/upload`;
    
    case InspectionStatus.IMAGES_UPLOADED:
    case InspectionStatus.EXTRACTION_PENDING:
    case InspectionStatus.FAILED:
      return `/inspections/${id}/extract`;
      
    case InspectionStatus.EXTRACTION_COMPLETED:
    case InspectionStatus.HUMAN_REVIEW_PENDING:
      return `/inspections/${id}/review`;
      
    case InspectionStatus.HUMAN_VERIFIED:
      return `/inspections/${id}/evaluate`;
      
    case InspectionStatus.COMPLIANCE_EVALUATED:
    case InspectionStatus.COMPLETED:
      return `/inspections/${id}/results`;
      
    default:
      return null;
  }
}

export function isDeletableDraftStatus(status: string): boolean {
  const deletableStatuses = [
    InspectionStatus.CREATED,
    InspectionStatus.IMAGES_UPLOADED,
    InspectionStatus.EXTRACTION_PENDING,
    InspectionStatus.EXTRACTION_COMPLETED,
    InspectionStatus.HUMAN_REVIEW_PENDING,
    InspectionStatus.HUMAN_VERIFIED,
    InspectionStatus.FAILED
  ];
  
  return deletableStatuses.includes(status as InspectionStatus);
}
