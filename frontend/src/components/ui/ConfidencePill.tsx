import React from 'react'
import { cn } from '../../lib/utils'
import { ConfidenceLevel } from '../../types/api'
import { CheckCircle2, HelpCircle, AlertCircle } from 'lucide-react'

interface ConfidencePillProps {
  level: ConfidenceLevel;
  className?: string;
}

export function ConfidencePill({ level, className }: ConfidencePillProps) {
  let label = level
  let icon = null
  let colorClasses = ""

  switch (level) {
    case ConfidenceLevel.HIGH:
      icon = <CheckCircle2 className="w-3 h-3 mr-1.5" />
      colorClasses = "text-success border-success/30 bg-success-surface"
      break
    case ConfidenceLevel.MEDIUM:
      icon = <HelpCircle className="w-3 h-3 mr-1.5" />
      colorClasses = "text-review border-review/30 bg-review-surface"
      break
    case ConfidenceLevel.LOW:
      icon = <AlertCircle className="w-3 h-3 mr-1.5" />
      colorClasses = "text-failure border-failure/30 bg-failure-surface"
      break
    case ConfidenceLevel.UNKNOWN:
    default:
      icon = <HelpCircle className="w-3 h-3 mr-1.5" />
      colorClasses = "text-text-secondary border-border bg-surface"
      break
  }

  return (
    <div className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase border",
      colorClasses,
      className
    )}>
      {icon}
      {label}
    </div>
  )
}
