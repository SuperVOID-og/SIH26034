import React from 'react'
import { cn } from '../../lib/utils'
import { RuleEvaluationResult, EvaluationStatus, RuleSeverity } from '../../types/api'
import { CheckCircle2, XCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react'

interface RuleResultCardProps {
  result: RuleEvaluationResult
  onViewEvidence: (rule: RuleEvaluationResult) => void
}

export function RuleResultCard({ result, onViewEvidence }: RuleResultCardProps) {
  const getStatusConfig = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.PASS:
        return { color: "text-success", bg: "bg-success/10", border: "border-success/20", icon: CheckCircle2, label: "Pass" }
      case EvaluationStatus.FAIL:
        return { color: "text-failure", bg: "bg-failure/10", border: "border-failure/30", icon: XCircle, label: "Fail" }
      case EvaluationStatus.REQUIRES_HUMAN_REVIEW:
        return { color: "text-review", bg: "bg-review/10", border: "border-review/30", icon: AlertTriangle, label: "Review" }
      case EvaluationStatus.NOT_APPLICABLE:
        return { color: "text-text-secondary", bg: "bg-surface-elevated", border: "border-border", icon: Info, label: "N/A" }
      default:
        return { color: "text-text-secondary", bg: "bg-surface", border: "border-border", icon: Info, label: status }
    }
  }

  const getSeverityLabel = (severity: RuleSeverity) => {
    switch (severity) {
      case RuleSeverity.CRITICAL: return "Critical"
      case RuleSeverity.HIGH: return "High"
      case RuleSeverity.MEDIUM: return "Medium"
      case RuleSeverity.LOW: return "Low"
      default: return severity
    }
  }

  const config = getStatusConfig(result.status)
  const StatusIcon = config.icon
  
  // Format rule ID into a readable title if needed
  const displayTitle = result.rule_id.replace(/^PC_RULE_\d+_/, '').replace(/_/g, ' ')

  return (
    <div className={cn(
      "p-5 rounded-xl border bg-surface-elevated transition-colors duration-200 group flex flex-col sm:flex-row gap-4 sm:items-start",
      config.border,
      result.status === EvaluationStatus.FAIL ? "hover:border-failure/50" : "hover:border-border-hover"
    )}>
      
      {/* Left: Status & Metadata */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-1">
          <div className={cn("px-2.5 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5", config.bg, config.color, config.border)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {config.label}
          </div>
          <span className="text-xs font-mono text-text-secondary truncate">
            {result.rule_id}
          </span>
          {result.severity && (
            <span className="text-[11px] uppercase tracking-wider text-text-secondary/70 border border-border/50 rounded px-1.5 py-0.5 ml-auto sm:ml-0 shrink-0">
              {getSeverityLabel(result.severity)}
            </span>
          )}
        </div>

        <h4 className="text-base font-medium text-text-primary capitalize tracking-tight mt-1">
          {displayTitle}
        </h4>
        
        <p className="text-sm text-text-secondary mt-1 line-clamp-2">
          {result.explanation}
        </p>

        {/* Source Summary */}
        {result.source_reference && (
          <div className="mt-3 text-[13px] text-text-secondary/80 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {result.source_reference.source_document} · {result.source_reference.source_rule}
            </span>
          </div>
        )}
      </div>

      {/* Right: Action */}
      <div className="sm:pl-4 sm:border-l border-border/50 flex sm:flex-col justify-end items-center sm:items-end gap-3 shrink-0 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0">
        <button
          onClick={() => onViewEvidence(result)}
          className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
        >
          View evidence
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

    </div>
  )
}
