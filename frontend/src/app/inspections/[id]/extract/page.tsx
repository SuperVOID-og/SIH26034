"use client"

import React, { useEffect, useState, useRef } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { StageRail } from '../../../../components/inspection/StageRail'
import { Card } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { ArrowRight, AlertCircle, FileImage, ShieldCheck, Loader2 } from 'lucide-react'
import { api } from '../../../../lib/api'
import { InspectionResponse, InspectionStatus, PackageDeclarations } from '../../../../types/api'
import { useRouter } from 'next/navigation'
import { ConfidencePill } from '../../../../components/ui/ConfidencePill'
import { cn, getMediaUrl } from '../../../../lib/utils'
import { ErrorState } from '../../../../components/ui/ErrorState'

const FIELD_LABELS: Record<keyof Omit<PackageDeclarations, 'raw_text_dump'>, string> = {
  manufacturer_packer_importer_details: "Manufacturer / Packer / Importer",
  common_generic_name: "Common / Generic Name",
  net_quantity: "Net Quantity",
  mrp: "MRP",
  manufacture_or_pack_date: "Month / Year of Manufacture",
  consumer_care: "Consumer Care Details",
  country_of_origin: "Country of Origin",
}

export default function ExtractPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const inspectionId = parseInt(params.id, 10)
  
  const [inspection, setInspection] = useState<InspectionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasTriggeredExtraction = useRef(false)
  const [extractionPhase, setExtractionPhase] = useState("Preparing package images...")

  const loadInspection = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getInspection(inspectionId)
      setInspection(data)
      
      // Auto-trigger extraction if needed
      if (
        (data.status === InspectionStatus.IMAGES_UPLOADED || data.status === InspectionStatus.EXTRACTION_PENDING) && 
        !hasTriggeredExtraction.current
      ) {
        hasTriggeredExtraction.current = true
        runExtraction()
      } else {
        setIsLoading(false)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load inspection.")
      setIsLoading(false)
    }
  }

  const runExtraction = async () => {
    try {
      setIsExtracting(true)
      setIsLoading(false)
      setError(null)

      // Cycle phases for UX
      const phases = [
        "Preparing package images...",
        "Reading printed declarations...",
        "Structuring extracted information...",
        "Preparing human review..."
      ]
      let currentPhase = 0
      const phaseInterval = setInterval(() => {
        currentPhase = (currentPhase + 1) % phases.length
        setExtractionPhase(phases[currentPhase])
      }, 3000)

      const result = await api.extractData(inspectionId)
      clearInterval(phaseInterval)
      
      setInspection(result)
      setIsExtracting(false)
    } catch (err: any) {
      setError(err.message || "Extraction failed.")
      setIsExtracting(false)
    }
  }

  useEffect(() => {
    loadInspection()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="AI extraction" 
          eyebrow={`Stage 03 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="The model transcribes what is printed on the pack. It makes no legal determination — that comes later, from the deterministic rule engine."
        />
        <div className="min-w-0 overflow-hidden">
          <StageRail current="extract" />
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    )
  }

  if (error && !inspection) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="AI extraction" 
          eyebrow={`Stage 03 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="The model transcribes what is printed on the pack. It makes no legal determination — that comes later, from the deterministic rule engine."
        />
        <div className="min-w-0 overflow-hidden">
          <StageRail current="extract" />
        </div>
        <ErrorState message={error} onRetry={loadInspection} />
      </div>
    )
  }

  const extractedData = inspection?.extracted_data as PackageDeclarations | undefined
  const isComplete = inspection?.status === InspectionStatus.EXTRACTION_COMPLETED || 
                     inspection?.status === InspectionStatus.HUMAN_REVIEW_PENDING || 
                     inspection?.status === InspectionStatus.HUMAN_VERIFIED ||
                     inspection?.status === InspectionStatus.COMPLIANCE_EVALUATED ||
                     inspection?.status === InspectionStatus.COMPLETED

  const firstImage = getMediaUrl(inspection?.image_paths?.[0])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0">
      <PageHeader 
        title="AI extraction" 
        eyebrow={`Stage 03 · INS-${inspectionId.toString().padStart(4, '0')}`}
        description="The model transcribes what is printed on the pack. It makes no legal determination — that comes later, from the deterministic rule engine."
      />
      
      <div className="min-w-0 overflow-hidden">
        <StageRail current="extract" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-w-0">
        {/* Left Column - Workspace */}
        <div className="flex-1 space-y-6 min-w-0">
          <Card className={cn(
            "p-4 sm:p-6 w-full flex flex-col h-full overflow-hidden transition-colors duration-500",
            isExtracting ? "border-accent shadow-[0_0_20px_rgba(20,184,166,0.05)]" : ""
          )}>
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-[14px] font-medium text-text-primary">Analysis workspace</h3>
              <div className="flex items-center gap-2">
                {isExtracting ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-accent">Reading</span>
                  </>
                ) : isComplete ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-success" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-success">Complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-text-secondary" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Failed</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 relative rounded-lg border border-border bg-surface-raised overflow-hidden min-h-[300px] flex items-center justify-center">
              {firstImage ? (
                <div className={cn(
                  "relative w-full h-full flex items-center justify-center",
                  isExtracting && "animate-pulse opacity-80"
                )}>
                  <img 
                    src={firstImage} 
                    alt="Package reference" 
                    className="max-w-full max-h-[500px] object-contain"
                  />
                  {isExtracting && (
                    <div className="absolute inset-0 bg-accent/5 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
                      <div className="bg-surface/90 px-4 py-2 rounded-full border border-accent/30 shadow-lg mb-2">
                        <span className="text-[12px] font-medium text-accent animate-pulse">{extractionPhase}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-text-secondary">
                  <FileImage className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-[13px]">No reference image available</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-failure-surface border border-failure/30 flex items-start gap-3 shrink-0">
                <AlertCircle className="w-4 h-4 text-failure shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-text-primary mb-2 break-words">{error}</p>
                  <Button size="sm" onClick={() => {
                    hasTriggeredExtraction.current = false
                    runExtraction()
                  }}>
                    Try again
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Extracted Declarations */}
        <div className="w-full lg:w-[1.1fr] shrink-0">
          <Card className="p-4 sm:p-6 h-full flex flex-col min-w-0">
            <h3 className="text-[14px] font-medium text-text-primary mb-1">Extracted declarations</h3>
            <p className="text-[12px] text-text-secondary mb-6">Values as printed — unverified, non-authoritative.</p>
            
            <div className="flex-1 space-y-4">
              {isExtracting ? (
                // Skeletons
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-border bg-background animate-pulse">
                    <div className="h-3 w-32 bg-surface-raised rounded mb-3"></div>
                    <div className="h-4 w-3/4 bg-surface-raised rounded mb-2"></div>
                  </div>
                ))
              ) : extractedData ? (
                // Real Data
                Object.entries(FIELD_LABELS).map(([key, label], index) => {
                  const field = extractedData[key as keyof typeof FIELD_LABELS]
                  const hasValue = field && field.value && field.value.trim() !== ''
                  
                  return (
                    <div 
                      key={key} 
                      className="p-3.5 rounded-lg border border-border bg-background transition-all hover:border-border-strong min-w-0 animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary truncate">{label}</span>
                        {field?.confidence && (
                          <ConfidencePill level={field.confidence} className="shrink-0" />
                        )}
                      </div>
                      
                      {hasValue ? (
                        <p className="text-[13px] font-medium text-text-primary whitespace-pre-wrap break-words">
                          {field.value}
                        </p>
                      ) : (
                        <p className="text-[13px] text-text-secondary italic">
                          Not detected on the pack
                        </p>
                      )}
                    </div>
                  )
                })
              ) : (
                // Not Started or Failed
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <div className="w-10 h-10 rounded-full bg-surface border border-border/50 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-4 h-4 text-text-secondary" />
                  </div>
                  <p className="text-[13px] text-text-secondary">
                    {!isExtracting && !error ? "Waiting to start extraction" : "No declarations extracted"}
                  </p>
                </div>
              )}
            </div>

            {isComplete && (
              <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500 delay-500 fill-mode-both">
                <div className="text-[12px] text-text-secondary">
                  <p className="font-medium text-text-primary mb-0.5">Extraction complete</p>
                  <p>Confidence reflects extraction certainty, not legality.</p>
                </div>
                <Button 
                  onClick={() => router.push(`/inspections/${inspectionId}/review`)}
                  className="w-full sm:w-auto shrink-0"
                >
                  Start human review
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
