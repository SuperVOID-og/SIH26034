"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import { StructuredReport } from '../../../../types/api'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Button } from '../../../../components/ui/Button'
import { Loader2, ArrowLeft, Printer, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { getMediaUrl } from '../../../../lib/utils'
import { VerifiedDeclarations } from '../../../../components/report/VerifiedDeclarations'
import { ReportRuleCard } from '../../../../components/report/ReportRuleCard'

export default function ReportPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const inspectionId = parseInt(params.id, 10)
  
  const [report, setReport] = useState<StructuredReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadReport = async () => {
      try {
        setIsLoading(true)
        const data = await api.getInspectionReport(inspectionId)
        setReport(data)
      } catch (err: any) {
        setErrorStatus(err.status || 500)
        setErrorMessage(err.message || "Failed to load report.")
      } finally {
        setIsLoading(false)
      }
    }
    loadReport()
  }, [inspectionId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-text-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p>Loading inspection report...</p>
      </div>
    )
  }

  if (errorStatus === 404) {
    return (
      <div className="pt-8">
        <ErrorState 
          title="Inspection Not Found" 
          message="This inspection could not be found. It may have been deleted."
          onRetry={() => router.push('/inspections')}
        />
      </div>
    )
  }

  if (errorStatus === 409) {
    return (
      <div className="pt-8">
        <ErrorState 
          title="Report Not Ready" 
          message="This inspection has not completed compliance evaluation yet. A report cannot be generated."
          onRetry={() => router.push(`/inspections/${inspectionId}/evaluate`)}
        />
      </div>
    )
  }

  if (errorMessage || !report) {
    return (
      <div className="pt-8">
        <ErrorState 
          title="Failed to load report" 
          message={errorMessage || "An unexpected error occurred."} 
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const { inspection, assessment, verified_declarations, rule_evaluations, summary_counts, disclaimer } = report

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12 w-full max-w-4xl mx-auto print:max-w-none print:m-0 print:p-0">
      {/* Top Actions (Screen only) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 no-print">
        <Button variant="ghost" onClick={() => router.push(`/inspections/${inspectionId}/results`)} className="pl-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to results
        </Button>
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="bg-surface-elevated text-text-primary border border-border hover:bg-surface-hover">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT */}
      <div className="bg-[#F2F4F7] print:bg-[#FFFFFF] text-[#161B24] sm:border border-[#D4DAE3] sm:rounded-xl p-4 sm:p-10 shadow-xl print:shadow-none print:border-none print:px-10 print:py-0 box-border">
        
        {/* Document Header */}
        <div className="border-b border-[#D4DAE3] pb-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#161B24] mb-1 font-sora">PackSure AI</h1>
              <h2 className="text-lg text-[#667085] font-sora">Inspection Compliance Report</h2>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-semibold tracking-widest bg-[#ECEFF3] text-[#161B24] px-3 py-1 rounded border border-[#D4DAE3]">
                INS-{inspection.id.toString().padStart(4, '0')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">Generated At</span>
              <span className="text-sm font-medium text-[#161B24]">{new Date(report.generated_at).toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">Category</span>
              <span className="text-sm font-medium capitalize text-[#161B24]">{inspection.product_category || 'Unspecified'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">Context</span>
              <span className="text-sm font-medium capitalize text-[#161B24]">{inspection.package_context || 'Retail'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">Format</span>
              <span className="text-sm font-medium text-[#161B24]">Report v{report.report_version}</span>
            </div>
          </div>
        </div>

        {/* Assessment Summary Block */}
        <div className="bg-[#FAFAFB] print:bg-white border border-[#D4DAE3] rounded-xl p-6 sm:p-8 mb-10 print-avoid-break">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#667085] mb-6">Overall Assessment</h3>
          
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-[#667085] uppercase tracking-wider font-semibold">PackSure Score</span>
              <div className="text-5xl font-bold tracking-tighter flex items-baseline gap-2 text-[#161B24]">
                {assessment.score} <span className="text-2xl text-[#667085]">/ 100</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {assessment.assessment === "COMPLIANT" && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 font-bold tracking-wide">
                    <CheckCircle2 className="w-5 h-5" /> COMPLIANT
                  </div>
                )}
                {assessment.assessment === "NON_COMPLIANT" && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold tracking-wide">
                    <XCircle className="w-5 h-5" /> NON-COMPLIANT
                  </div>
                )}
                {assessment.assessment === "REVIEW_REQUIRED" && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold tracking-wide">
                    <AlertTriangle className="w-5 h-5" /> REVIEW REQUIRED
                  </div>
                )}
                {assessment.is_provisional && (
                  <div className="px-3 py-2 rounded-lg bg-[#ECEFF3] text-[#667085] border border-[#D4DAE3] border-dashed text-sm font-bold tracking-wide">
                    PROVISIONAL
                  </div>
                )}
              </div>
              <div className="text-xs font-medium text-[#667085] tracking-wider flex gap-4">
                <span>{summary_counts.passed} Passed</span>
                <span>{summary_counts.failed} Failed</span>
                <span>{summary_counts.requires_human_review} Review</span>
                <span>{summary_counts.not_applicable} N/A</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-[#667085] leading-relaxed border-t border-[#D4DAE3] pt-4">
            <strong>Note:</strong> The PackSure Score is a transparent internal decision-support metric. It represents rule satisfaction weighted by severity, but is not a statutory government score.
          </p>
        </div>

        {/* Declarations */}
        <div className="mb-12">
          <VerifiedDeclarations declarations={verified_declarations} />
        </div>

        {/* Rules */}
        <div className="mb-12">
          <div className="border-b border-[#D4DAE3] pb-2 mb-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#161B24] font-sora">Deterministic rule evaluation</h3>
            <p className="text-sm text-[#667085] mt-1">
              Results based on the codified Legal Metrology rules applied to the verified declarations.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {rule_evaluations.length > 0 ? (
              rule_evaluations.map(rule => (
                <ReportRuleCard key={rule.rule_id} result={rule} />
              ))
            ) : (
              <p className="text-sm text-text-secondary italic">No rules were evaluated.</p>
            )}
          </div>
        </div>

        {/* Images Preview */}
        {inspection.image_paths && inspection.image_paths.length > 0 && (
          <div className="mb-12 print-avoid-break">
            <h3 className="text-xl font-semibold tracking-tight text-[#161B24] mb-4 font-sora">Package Images</h3>
            <div className="flex gap-4 overflow-hidden flex-wrap">
              {inspection.image_paths.slice(0, 4).map((path, index) => (
                <div key={index} className="w-40 sm:w-56 h-40 sm:h-56 rounded-lg border border-[#D4DAE3] overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getMediaUrl(path) || undefined} alt={`Package ${index + 1}`} className="max-w-full max-h-full object-contain opacity-100 mix-blend-normal" />
                </div>
              ))}
              {inspection.image_paths.length > 4 && (
                <div className="w-40 sm:w-56 h-40 sm:h-56 rounded-lg border border-[#D4DAE3] bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-sm text-[#667085] font-medium">+{inspection.image_paths.length - 4} more</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer Footer */}
        <div className="border-t-2 border-[#D4DAE3] pt-6 mt-16 text-center print-avoid-break text-[#667085]">
          <ShieldCheck className="w-6 h-6 mx-auto mb-3 opacity-50" />
          <p className="text-sm max-w-3xl mx-auto leading-relaxed">
            {disclaimer}
          </p>
          <div className="mt-6 text-[10px] uppercase tracking-widest opacity-50 font-sora font-semibold">
            PackSure AI · Decision-support report
          </div>
        </div>

      </div>
    </div>
  )
}
