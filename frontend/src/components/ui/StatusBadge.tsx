import React from 'react'
import { Badge } from './Badge'
import { InspectionStatus, OverallAssessment } from '../../types/api'

export function StatusBadge({ status }: { status: string }) {
  let variant: 'default' | 'success' | 'failure' | 'review' | 'neutral' = 'default'
  let label = status

  switch (status) {
    case OverallAssessment.COMPLIANT:
    case InspectionStatus.COMPLETED:
      variant = 'success'
      break
    case OverallAssessment.NON_COMPLIANT:
    case InspectionStatus.FAILED:
      variant = 'failure'
      break
    case OverallAssessment.REVIEW_REQUIRED:
    case InspectionStatus.HUMAN_REVIEW_PENDING:
      variant = 'review'
      break
    case InspectionStatus.CREATED:
    case InspectionStatus.IMAGES_UPLOADED:
    case InspectionStatus.EXTRACTION_PENDING:
    case InspectionStatus.EXTRACTION_COMPLETED:
    case InspectionStatus.HUMAN_VERIFIED:
    case InspectionStatus.COMPLIANCE_EVALUATED:
      variant = 'neutral'
      break
  }

  // format label
  label = label.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

  return <Badge variant={variant}>{label}</Badge>
}
