"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { StageRail } from '../../../../components/inspection/StageRail'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Button } from '../../../../components/ui/Button'
import { api } from '../../../../lib/api'
import { 
  InspectionResponse, 
  InspectionStatus, 
  ComplianceSummary, 
  RuleEvaluationResult,
  EvaluationStatus
} from '../../../../types/api'
import { ScoreDial } from '../../../../components/compliance/ScoreDial'
import { RuleResultCard } from '../../../../components/compliance/RuleResultCard'
import { EvidenceDrawer } from '../../../../components/inspection/EvidenceDrawer'
import { Loader2, ArrowLeft, Plus, ShieldCheck, Scale, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '../../../../lib/utils'

export default function ResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const inspectionId = parseInt(params.id, 10)
  
  const [inspection, setInspection] = useState<InspectionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Drawer state
  const [selectedRule, setSelectedRule] = useState<RuleEvaluationResult | null>(null)

  useEffect(() => {
    const loadInspection = async () => {
      try {
        setIsLoading(true)
        const data = await api.getInspection(inspectionId)
        setInspection(data)
      } catch (err: any) {
        setError(err.message || "Failed to load inspection.")
      } finally {
        setIsLoading(false)
      }
    }
    loadInspection()
  }, [inspectionId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Compliance results" 
          eyebrow={`Stage 06 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="A deterministic assessment based on the human-verified package record and the active Legal Metrology rule set."
        />
        <StageRail current="results" />
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p>Loading deterministic results...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Compliance results" 
          eyebrow={`Stage 06 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="A deterministic assessment based on the human-verified package record and the active Legal Metrology rule set."
        />
        <StageRail current="results" />
        <ErrorState 
          title="Failed to load results" 
          message={error || "Inspection not found"} 
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  // Guard: Must be evaluated
  if (
    inspection.status !== InspectionStatus.COMPLIANCE_EVALUATED && 
    inspection.status !== InspectionStatus.COMPLETED
  ) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0">
        <PageHeader 
          title="Compliance results" 
          eyebrow={`Stage 06 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="A deterministic assessment based on the human-verified package record and the active Legal Metrology rule set."
        />
        <StageRail current="results" />
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-border bg-surface-elevated rounded-xl text-center">
          <ShieldCheck className="w-12 h-12 text-text-secondary/50 mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Results not available yet</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-md">
            The deterministic rule engine must evaluate the human-verified record before results can be displayed.
          </p>
          <Button onClick={() => router.push(`/inspections/${inspectionId}/evaluate`)}>
            Go to Evaluation
          </Button>
        </div>
      </div>
    )
  }

  // Extract results strictly from backend
  const complianceResults = inspection.compliance_results as ComplianceSummary | null
  
  if (!complianceResults || !complianceResults.scoring) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Compliance results" 
          eyebrow={`Stage 06 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="A deterministic assessment based on the human-verified package record and the active Legal Metrology rule set."
        />
        <StageRail current="results" />
        <ErrorState 
          title="Missing result data" 
          message="The inspection is marked as evaluated, but the compliance result payload is missing or malformed."
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const scoring = complianceResults.scoring
  const ruleResults = complianceResults.results || []

  // Count exactly what is returned in the array
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

  // Badges rendering
  const renderAssessmentBadge = () => {
    switch (scoring.assessment) {
      case "COMPLIANT":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20 text-sm font-semibold tracking-wide">
            <CheckCircle2 className="w-4 h-4" />
            COMPLIANT
          </div>
        )
      case "NON_COMPLIANT":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-failure/10 text-failure border border-failure/20 text-sm font-semibold tracking-wide">
            <XCircle className="w-4 h-4" />
            NON-COMPLIANT
          </div>
        )
      case "REVIEW_REQUIRED":
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-review/10 text-review border border-review/20 text-sm font-semibold tracking-wide">
            <AlertTriangle className="w-4 h-4" />
            REVIEW REQUIRED
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface text-text-secondary border border-border text-sm font-semibold tracking-wide">
            {scoring.assessment}
          </div>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0 pb-12">
      <PageHeader 
        title="Compliance results" 
        eyebrow={`Stage 06 · INS-${inspectionId.toString().padStart(4, '0')}`}
        description="A deterministic assessment based on the human-verified package record and the active Legal Metrology rule set."
      />
      
      <StageRail current="results" />

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: Score & Overall Assessment */}
        <div className="xl:col-span-5 flex flex-col gap-6 sticky top-6">
          <div className="border border-border bg-surface-elevated rounded-2xl overflow-hidden flex flex-col">
            
            <div className="p-8 flex flex-col items-center justify-center border-b border-border/50 relative bg-surface">
              {/* Subtle background grid */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
                backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }} />
              
              <ScoreDial score={scoring.score} assessment={scoring.assessment} />
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center z-10">
                {renderAssessmentBadge()}
                {scoring.is_provisional && (
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-surface text-text-secondary border border-border border-dashed text-sm font-semibold tracking-wide">
                    PROVISIONAL
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-surface-elevated">
              {scoring.is_provisional && (
                <div className="mb-6 p-4 rounded-lg bg-review/5 border border-review/20 flex gap-3 text-review">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-sm leading-relaxed">
                    <strong>Provisional result</strong> — one or more rules require further human review before this assessment can be treated as complete.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border/50 bg-surface flex flex-col gap-1">
                  <span className="text-2xl font-semibold tracking-tight text-failure">{counts.fail}</span>
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Failed rules</span>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-surface flex flex-col gap-1">
                  <span className="text-2xl font-semibold tracking-tight text-review">{counts.review}</span>
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Needs review</span>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-surface flex flex-col gap-1">
                  <span className="text-2xl font-semibold tracking-tight text-success">{counts.pass}</span>
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Passed</span>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-surface flex flex-col gap-1">
                  <span className="text-2xl font-semibold tracking-tight text-text-secondary">{counts.na}</span>
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Not applicable</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                <div className="flex items-start gap-2 text-sm text-text-secondary">
                  <Scale className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Determined by codified Legal Metrology rules — not by the extraction model.</p>
                </div>
                <div className="flex items-start gap-2 text-sm text-text-secondary">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>PackSure provides decision-support and traceable rule evaluation; it is not legal certification.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => router.push('/inspections')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to inspections
            </Button>
            <Button 
              className="flex-1"
              onClick={() => router.push('/inspections/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              New inspection
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL: Rule Results List */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <div className="mb-2">
            <h3 className="text-lg font-medium text-text-primary">Rule evaluation</h3>
            <p className="text-sm text-text-secondary">Every outcome includes its deterministic result and regulatory source.</p>
          </div>

          <div className="flex flex-col gap-3">
            {ruleResults.map((result) => (
              <RuleResultCard 
                key={result.rule_id} 
                result={result} 
                onViewEvidence={setSelectedRule} 
              />
            ))}
            
            {ruleResults.length === 0 && (
              <div className="p-8 text-center border border-border rounded-xl bg-surface-elevated text-text-secondary">
                No rules were evaluated for this inspection.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer overlay */}
      <EvidenceDrawer 
        isOpen={selectedRule !== null} 
        onClose={() => setSelectedRule(null)} 
        rule={selectedRule}
        inspectionId={inspectionId}
      />
    </div>
  )
}
