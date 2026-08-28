"use client"

import React, { useEffect, useState, useRef } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { StageRail } from '../../../../components/inspection/StageRail'
import { Card } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { api } from '../../../../lib/api'
import { useRouter } from 'next/navigation'
import { cn } from '../../../../lib/utils'
import { 
  InspectionResponse, 
  InspectionStatus, 
  ComplianceSummary, 
  EvaluationStatus,
  OverallAssessment
} from '../../../../types/api'
import { 
  ShieldCheck, 
  Scale, 
  Loader2, 
  ArrowRight, 
  Server, 
  FileSearch, 
  Gavel, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lock
} from 'lucide-react'

export default function EvaluatePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const inspectionId = parseInt(params.id, 10)
  
  const [inspection, setInspection] = useState<InspectionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasTriggeredEval = useRef(false)
  const [evalPhase, setEvalPhase] = useState("Loading active rule set...")

  const loadInspection = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getInspection(inspectionId)
      
      // If ready to evaluate, auto-trigger
      if (data.status === InspectionStatus.HUMAN_VERIFIED && !hasTriggeredEval.current) {
        hasTriggeredEval.current = true
        // Set inspection locally first so we can render the running state
        setInspection(data)
        runEvaluation()
      } else {
        // Either already evaluated or in wrong state
        setInspection(data)
        setIsLoading(false)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load inspection.")
      setIsLoading(false)
    }
  }

  const runEvaluation = async () => {
    try {
      setIsEvaluating(true)
      setIsLoading(false)
      setError(null)

      // Cycle deterministic phases for UI
      const phases = [
        "Loading active rule set...",
        "Checking rule applicability...",
        "Evaluating verified declarations...",
        "Calculating compliance assessment...",
        "Preparing rule evidence..."
      ]
      let currentPhase = 0
      const phaseInterval = setInterval(() => {
        currentPhase = (currentPhase + 1) % phases.length
        setEvalPhase(phases[currentPhase])
      }, 2500)

      const result = await api.evaluateCompliance(inspectionId)
      clearInterval(phaseInterval)
      
      setInspection(result)
      setIsEvaluating(false)
    } catch (err: any) {
      setError(err.message || "Evaluation failed.")
      setIsEvaluating(false)
    }
  }

  useEffect(() => {
    loadInspection()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Compliance evaluation" 
          eyebrow={`Stage 05 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="The deterministic rule engine evaluates the human-verified declarations against the active Legal Metrology rule set."
        />
        <StageRail current="evaluate" />
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p>Loading inspection state...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !inspection) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Compliance evaluation" 
          eyebrow={`Stage 05 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="The deterministic rule engine evaluates the human-verified declarations against the active Legal Metrology rule set."
        />
        <StageRail current="evaluate" />
        <ErrorState 
          title="Failed to load inspection" 
          message={error} 
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!inspection) return null

  // Guard: Not ready for evaluation
  if (
    inspection.status === InspectionStatus.CREATED ||
    inspection.status === InspectionStatus.IMAGES_UPLOADED ||
    inspection.status === InspectionStatus.EXTRACTION_PENDING ||
    inspection.status === InspectionStatus.EXTRACTION_COMPLETED ||
    inspection.status === InspectionStatus.HUMAN_REVIEW_PENDING
  ) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0">
        <PageHeader 
          title="Compliance evaluation" 
          eyebrow={`Stage 05 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="The deterministic rule engine evaluates the human-verified declarations against the active Legal Metrology rule set."
        />
        <StageRail current="evaluate" />
        <ErrorState 
          title="Not ready for evaluation" 
          message="Human verification must be completed before the rule engine can evaluate the package."
        />
      </div>
    )
  }

  const isEvaluated = 
    inspection.status === InspectionStatus.COMPLIANCE_EVALUATED || 
    inspection.status === InspectionStatus.COMPLETED

  const complianceResults = inspection.compliance_results as ComplianceSummary | null
  const scoring = complianceResults?.scoring
  const ruleResults = complianceResults?.results || []

  // Calculate counts strictly from the array
  const counts = {
    pass: 0,
    fail: 0,
    na: 0,
    review: 0
  }
  
  ruleResults.forEach(r => {
    if (r.status === EvaluationStatus.PASS) counts.pass++
    if (r.status === EvaluationStatus.FAIL) counts.fail++
    if (r.status === EvaluationStatus.NOT_APPLICABLE) counts.na++
    if (r.status === EvaluationStatus.REQUIRES_HUMAN_REVIEW) counts.review++
  })

  // Assessment styling map
  const getAssessmentStyles = (assessment?: OverallAssessment) => {
    switch (assessment) {
      case OverallAssessment.COMPLIANT:
        return { color: "text-success", bg: "bg-success/10", border: "border-success/20", icon: CheckCircle2 }
      case OverallAssessment.NON_COMPLIANT:
        return { color: "text-failure", bg: "bg-failure/10", border: "border-failure/20", icon: XCircle }
      case OverallAssessment.REVIEW_REQUIRED:
        return { color: "text-review", bg: "bg-review/10", border: "border-review/20", icon: AlertTriangle }
      default:
        return { color: "text-text-secondary", bg: "bg-surface", border: "border-border", icon: ShieldCheck }
    }
  }

  const AssessmentIcon = getAssessmentStyles(scoring?.assessment).icon

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0">
      <PageHeader 
        title="Compliance evaluation" 
        eyebrow={`Stage 05 · INS-${inspectionId.toString().padStart(4, '0')}`}
        description="The deterministic rule engine evaluates the human-verified declarations against the active Legal Metrology rule set."
      />
      
      <StageRail current="evaluate" />

      {error && !isEvaluating && (
        <div className="p-4 bg-failure/10 border border-failure/20 rounded-lg flex items-start gap-3 text-failure mb-6">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Engine Card */}
        <Card className="lg:col-span-2 p-6 md:p-8 flex flex-col items-center justify-center min-h-[360px] text-center relative overflow-hidden bg-surface">
          
          {/* Subtle grid background for deterministic feel */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }} />

          {isEvaluating ? (
            <div className="flex flex-col items-center relative z-10 w-full max-w-sm">
              <div className="w-16 h-16 bg-surface-elevated border border-border/50 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(20,184,166,0.15)] relative">
                {/* Simulated scanner line */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/20 to-transparent h-full animate-[scan_2s_ease-in-out_infinite]" />
                <Server className="w-8 h-8 text-accent animate-pulse" />
              </div>
              <h3 className="text-xl font-medium tracking-tight mb-2">Evaluating verified declarations</h3>
              <p className="text-sm text-text-secondary mb-8">Active Legal Metrology rules are being applied to the human-verified inspection record.</p>
              
              <div className="w-full bg-surface-elevated rounded-md border border-border/50 p-4 flex items-center justify-between font-mono text-xs">
                <span className="text-accent truncate pr-4">{evalPhase}</span>
                <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
              </div>
            </div>
          ) : isEvaluated && complianceResults ? (
            <div className="flex flex-col relative z-10 w-full animate-in zoom-in-95 duration-500">
              <div className="text-xs font-mono font-medium tracking-widest text-text-secondary uppercase mb-6 mx-auto bg-surface-elevated px-3 py-1 rounded-full border border-border">
                Evaluation Complete
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                
                {/* Assessment Panel */}
                <div className={cn(
                  "p-5 rounded-xl border flex flex-col gap-3",
                  getAssessmentStyles(scoring?.assessment).bg,
                  getAssessmentStyles(scoring?.assessment).border
                )}>
                  <div className="text-xs font-mono font-medium uppercase tracking-widest text-text-secondary">
                    Assessment
                  </div>
                  <div className={cn("flex items-center gap-2", getAssessmentStyles(scoring?.assessment).color)}>
                    <AssessmentIcon className="w-6 h-6" />
                    <span className="text-xl font-semibold tracking-tight">
                      {scoring?.assessment?.replace(/_/g, ' ') || 'UNKNOWN'}
                    </span>
                  </div>
                  {scoring?.is_provisional && (
                    <div className="mt-auto pt-2 border-t border-border/30 text-[13px] text-text-secondary flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      Provisional result. Further human review is required for one or more rules.
                    </div>
                  )}
                </div>

                {/* Score Panel */}
                <div className="p-5 rounded-xl border border-border bg-surface-elevated flex flex-col gap-3">
                  <div className="text-xs font-mono font-medium uppercase tracking-widest text-text-secondary">
                    PackSure Score
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-text-primary">
                      {scoring?.score !== null && scoring?.score !== undefined ? scoring.score : '—'}
                    </span>
                    <span className="text-sm font-medium text-text-secondary">/ 100</span>
                  </div>
                  <div className="mt-auto pt-2 text-[13px] text-text-secondary flex gap-2">
                    <Scale className="w-4 h-4 shrink-0 mt-0.5" />
                    Deterministic rule-engine result
                  </div>
                </div>

              </div>

              {/* Rule Summary */}
              {ruleResults.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm font-medium">
                  {counts.pass > 0 && (
                    <div className="px-3 py-1.5 bg-success/10 text-success rounded-md border border-success/20">
                      {counts.pass} Pass
                    </div>
                  )}
                  {counts.fail > 0 && (
                    <div className="px-3 py-1.5 bg-failure/10 text-failure rounded-md border border-failure/20">
                      {counts.fail} Fail
                    </div>
                  )}
                  {counts.review > 0 && (
                    <div className="px-3 py-1.5 bg-review/10 text-review rounded-md border border-review/20">
                      {counts.review} Review
                    </div>
                  )}
                  {counts.na > 0 && (
                    <div className="px-3 py-1.5 bg-surface-elevated text-text-secondary rounded-md border border-border">
                      {counts.na} N/A
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8">
                <Button 
                  onClick={() => router.push(`/inspections/${inspectionId}/results`)}
                  className="w-full sm:w-auto"
                >
                  View results
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center relative z-10 w-full">
              <Gavel className="w-10 h-10 text-text-secondary/50 mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Engine standing by</h3>
              <p className="text-sm text-text-secondary mb-6 max-w-sm">No evaluation results are available.</p>
              {inspection.status === InspectionStatus.HUMAN_VERIFIED && !error && (
                <Button onClick={runEvaluation}>
                  Start evaluation
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Secondary Context Card */}
        <div className="lg:col-span-1">
          <Card className="p-5 bg-surface border border-border h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-text-primary">
              <Lock className="w-5 h-5 text-accent" />
              <h3 className="font-medium">Verified input locked</h3>
            </div>
            
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              The rule engine evaluates only the human-verified record. AI extraction is no longer authoritative at this stage.
            </p>

            <div className="mt-auto space-y-3 pt-4 border-t border-border/50 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Inspection ID</span>
                <span className="font-mono text-text-primary">INS-{inspectionId.toString().padStart(4, '0')}</span>
              </div>
              {inspection.product_category && (
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Category</span>
                  <span className="text-text-primary capitalize">{inspection.product_category}</span>
                </div>
              )}
              {inspection.package_context && (
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Context</span>
                  <span className="text-text-primary capitalize">{inspection.package_context}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
      `}} />
    </div>
  )
}
