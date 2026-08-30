import React, { useEffect } from 'react'
import { X, ExternalLink, Info, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'
import { RuleEvaluationResult, EvaluationStatus, RuleSeverity } from '../../types/api'
import { getMediaUrl } from '../../lib/utils'

interface EvidenceDrawerProps {
  isOpen: boolean
  onClose: () => void
  rule: RuleEvaluationResult | null
  inspectionId: number
}

export function EvidenceDrawer({ isOpen, onClose, rule, inspectionId }: EvidenceDrawerProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !rule) return null

  const getStatusConfig = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.PASS:
        return { color: "text-success", icon: CheckCircle2, label: "Pass" }
      case EvaluationStatus.FAIL:
        return { color: "text-failure", icon: XCircle, label: "Fail" }
      case EvaluationStatus.REQUIRES_HUMAN_REVIEW:
        return { color: "text-review", icon: AlertTriangle, label: "Review Required" }
      case EvaluationStatus.NOT_APPLICABLE:
        return { color: "text-text-secondary", icon: Info, label: "Not Applicable" }
      default:
        return { color: "text-text-secondary", icon: Info, label: status }
    }
  }

  const StatusIcon = getStatusConfig(rule.status).icon
  const displayTitle = rule.rule_id.replace(/^PC_RULE_\d+_/, '').replace(/_/g, ' ')
  
  // Extract package image path if it exists in evidence
  const packageImagePath = typeof rule.evidence === 'string' && rule.evidence.endsWith('.png') 
    ? rule.evidence 
    : (rule.evidence?.image_path || null)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div 
        className="relative w-full sm:w-[500px] h-full bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 transform"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 id="drawer-title" className="text-lg font-medium text-text-primary tracking-tight">
            Evidence & Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: Rule Summary */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-medium bg-surface-elevated border border-border px-2 py-1 rounded text-text-secondary">
                {rule.rule_id}
              </span>
              {rule.severity && (
                <span className="text-[11px] uppercase tracking-wider text-text-secondary/80 border border-border/50 rounded px-1.5 py-0.5">
                  {rule.severity} Severity
                </span>
              )}
            </div>
            
            <h3 className="text-xl font-medium text-text-primary capitalize tracking-tight">
              {displayTitle}
            </h3>
            
            <div className={cn("inline-flex items-center gap-1.5 text-sm font-medium", getStatusConfig(rule.status).color)}>
              <StatusIcon className="w-4 h-4" />
              {getStatusConfig(rule.status).label}
            </div>
          </section>

          {/* Section 2: Deterministic Explanation */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Info className="w-4 h-4 text-text-secondary" />
              Evaluation Explanation
            </h4>
            <div className="p-4 rounded-lg bg-surface-elevated border border-border/50 text-sm text-text-secondary leading-relaxed">
              {rule.explanation}
            </div>
          </section>

          {/* Section 3: Regulatory Source */}
          {rule.source_reference && (
            <section className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-text-secondary" />
                Regulatory Traceability
              </h4>
              <div className="p-4 rounded-lg bg-surface-elevated border border-border/50 text-sm space-y-3">
                <div>
                  <div className="text-xs text-text-secondary/70 uppercase tracking-wider mb-1">Source Document</div>
                  <div className="font-medium text-text-primary">{rule.source_reference.source_document}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-text-secondary/70 uppercase tracking-wider mb-1">Rule</div>
                    <div className="text-text-secondary">{rule.source_reference.source_rule}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary/70 uppercase tracking-wider mb-1">Clause</div>
                    <div className="text-text-secondary">{rule.source_reference.source_clause}</div>
                  </div>
                </div>
                {rule.source_reference.source_amendment_year && (
                  <div>
                    <div className="text-xs text-text-secondary/70 uppercase tracking-wider mb-1">Version / Amendment</div>
                    <div className="text-text-secondary">{rule.source_reference.source_amendment_year}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 4: Evidence */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-text-secondary" />
              Recorded Evidence
            </h4>
            
            {rule.evidence ? (
              <div className="space-y-4">
                {packageImagePath && (
                  <div className="rounded-lg border border-border overflow-hidden bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getMediaUrl(packageImagePath as string) || undefined} 
                      alt="Evidence" 
                      className="w-full h-auto object-contain max-h-[300px]"
                    />
                  </div>
                )}
                <div className="p-4 rounded-lg bg-surface-elevated border border-border/50 overflow-x-auto">
                  <pre className="text-[13px] font-mono text-text-secondary whitespace-pre-wrap">
                    {typeof rule.evidence === 'string' && rule.evidence !== packageImagePath
                      ? rule.evidence 
                      : JSON.stringify(rule.evidence, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border/30 bg-surface-elevated border-dashed text-sm text-text-secondary/80 text-center">
                No specific evidence payload was recorded for this rule.
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
