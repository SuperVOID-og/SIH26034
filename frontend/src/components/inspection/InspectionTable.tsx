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
            <LoadingSkeleton key={i} className="h-12 w-full bg-border" />
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
      <table className="w-full text-left whitespace-nowrap border-collapse">
        <thead className="text-[11px] font-mono tracking-wider text-text-secondary uppercase bg-background border-b border-border">
          <tr>
            <th className="px-5 py-4 font-medium">Inspection ID</th>
            <th className="px-5 py-4 font-medium">Category</th>
            <th className="px-5 py-4 font-medium">Created</th>
            <th className="px-5 py-4 font-medium">Workflow Status</th>
            <th className="px-5 py-4 font-medium">Assessment</th>
            <th className="px-5 py-4 font-medium text-right">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-[13px]">
          {inspections.map((inspection) => {
            const shortId = `INS-${inspection.id.toString().padStart(4, '0')}`
            const date = new Date(inspection.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric'
            })
            
            const assessment = inspection.compliance_results?.scoring?.assessment
            const score = inspection.compliance_score

            return (
              <tr key={inspection.id} className="hover:bg-surface-raised transition-colors group">
                <td className="px-5 py-4 font-mono text-[12px] font-medium text-text-primary">
                  {shortId}
                </td>
                <td className="px-5 py-4 text-text-secondary">
                  {inspection.product_category || '—'}
                </td>
                <td className="px-5 py-4 text-text-secondary font-mono text-[12px]">
                  {date}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={inspection.status} />
                </td>
                <td className="px-5 py-4">
                  {assessment ? <StatusBadge status={assessment} /> : <span className="text-text-secondary font-mono text-[12px]">—</span>}
                </td>
                <td className="px-5 py-4 font-medium text-text-primary text-right">
                  {score !== null && score !== undefined ? (
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 bg-surface-hover rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 bg-accent" 
                          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} 
                        />
                      </div>
                      <span className="font-mono text-[12px] tabular-nums w-6">{score}</span>
                    </div>
                  ) : <span className="text-text-secondary font-mono text-[12px]">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
