import React from 'react'
import { Card } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'
import { InspectionResponse } from '../../types/api'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { FileText } from 'lucide-react'

interface InspectionTableProps {
  inspections: InspectionResponse[]
  isLoading: boolean
  emptyMessage?: string
}

export function InspectionTable({ inspections, isLoading, emptyMessage = "No inspections found" }: InspectionTableProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <LoadingSkeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  if (inspections.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No inspections yet"
        description={emptyMessage}
      />
    )
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-text-secondary uppercase bg-surface-hover border-b border-border">
          <tr>
            <th className="px-6 py-4 font-medium">Inspection ID</th>
            <th className="px-6 py-4 font-medium">Category</th>
            <th className="px-6 py-4 font-medium">Created</th>
            <th className="px-6 py-4 font-medium">Workflow Status</th>
            <th className="px-6 py-4 font-medium">Assessment</th>
            <th className="px-6 py-4 font-medium">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {inspections.map((inspection) => {
            const shortId = `INS-${inspection.id.toString().padStart(4, '0')}`
            const date = new Date(inspection.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric'
            })
            
            // Only pull assessment from the nested scoring result if available
            const assessment = inspection.compliance_results?.scoring?.assessment
            const score = inspection.compliance_score

            return (
              <tr key={inspection.id} className="hover:bg-surface-hover transition-colors group">
                <td className="px-6 py-4 font-medium text-text-primary">
                  {shortId}
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {inspection.product_category || '—'}
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {date}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={inspection.status} />
                </td>
                <td className="px-6 py-4">
                  {assessment ? <StatusBadge status={assessment} /> : <span className="text-text-secondary">—</span>}
                </td>
                <td className="px-6 py-4 font-medium text-text-primary">
                  {score !== null && score !== undefined ? `${score}/100` : <span className="text-text-secondary font-normal">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
