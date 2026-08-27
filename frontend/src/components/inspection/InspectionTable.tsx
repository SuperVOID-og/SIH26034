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
      <Card className="overflow-hidden border-border/60">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <LoadingSkeleton key={i} className="h-10 w-full bg-border/40" />
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
    <Card className="overflow-x-auto border-border/60">
      <table className="w-full text-left whitespace-nowrap">
        <thead className="text-[11px] font-semibold tracking-wider text-text-secondary uppercase bg-surface-hover/50 border-b border-border/60">
          <tr>
            <th className="px-5 py-3">Inspection ID</th>
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3">Created</th>
            <th className="px-5 py-3">Workflow Status</th>
            <th className="px-5 py-3">Assessment</th>
            <th className="px-5 py-3">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-[13px]">
          {inspections.map((inspection) => {
            const shortId = `INS-${inspection.id.toString().padStart(4, '0')}`
            const date = new Date(inspection.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric'
            })
            
            const assessment = inspection.compliance_results?.scoring?.assessment
            const score = inspection.compliance_score

            return (
              <tr key={inspection.id} className="hover:bg-surface-hover/50 transition-colors group">
                <td className="px-5 py-3.5 font-medium text-text-primary">
                  {shortId}
                </td>
                <td className="px-5 py-3.5 text-text-secondary">
                  {inspection.product_category || '—'}
                </td>
                <td className="px-5 py-3.5 text-text-secondary">
                  {date}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={inspection.status} />
                </td>
                <td className="px-5 py-3.5">
                  {assessment ? <StatusBadge status={assessment} /> : <span className="text-text-secondary">—</span>}
                </td>
                <td className="px-5 py-3.5 font-medium text-text-primary">
                  {score !== null && score !== undefined ? (
                    <span className="tabular-nums">{score}<span className="text-text-secondary font-normal text-[11px] ml-[2px]">/100</span></span>
                  ) : <span className="text-text-secondary font-normal">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
