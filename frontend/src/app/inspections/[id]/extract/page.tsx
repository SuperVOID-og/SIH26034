"use client"

import React, { useEffect, useState, useRef } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { StageRail } from '../../../../components/inspection/StageRail'
import { Button } from '../../../../components/ui/Button'
import { ArrowRight, AlertCircle, FileImage, ShieldCheck, Loader2 } from 'lucide-react'
import { api } from '../../../../lib/api'
import { InspectionResponse, InspectionStatus, PackageDeclarations } from '../../../../types/api'
import { useRouter } from 'next/navigation'
import { ConfidencePill } from '../../../../components/ui/ConfidencePill'
import { cn, getMediaUrl } from '../../../../lib/utils'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { CancelInspectionAction } from '../../../../components/inspection/CancelInspectionAction'
import { useLeaveGuard } from '../../../../components/inspection/LeaveInspectionGuard'

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
  const [extractionPhase, setExtractionPhase] = useState("Preparing package image")

  const loadInspection = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getInspection(inspectionId)
      setInspection(data)
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
      const phases = [
        "Preparing package image",
        "Reading visible declarations",
        "Structuring extracted fields",
        "Finalizing extraction"
      ]
      let currentPhase = 0
      const phaseInterval = setInterval(() => {
        currentPhase = (currentPhase + 1) % phases.length
        setExtractionPhase(phases[currentPhase])
      }, 2500)
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

  const { registerGuard, unregisterGuard } = useLeaveGuard()

  useEffect(() => {
    if (inspection) {
      registerGuard(inspectionId, inspection.status, false)
    }
    return () => unregisterGuard()
  }, [inspection, inspectionId, registerGuard, unregisterGuard])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI extraction" eyebrow={`Stage 03 · INS-${inspectionId.toString().padStart(4, '0')}`} description="The model transcribes what is printed on the pack. It makes no legal determination — that comes later, from the deterministic rule engine.">
          <CancelInspectionAction inspectionId={inspectionId} status={inspection?.status || "EXTRACTION_PENDING"} />
        </PageHeader>
        <div className="min-w-0 overflow-hidden"><StageRail current="extract" /></div>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      </div>
    )
  }

  if (error && !inspection) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI extraction" eyebrow={`Stage 03 · INS-${inspectionId.toString().padStart(4, '0')}`} description="The model transcribes what is printed on the pack. It makes no legal determination — that comes later, from the deterministic rule engine.">
          <CancelInspectionAction inspectionId={inspectionId} status={"EXTRACTION_PENDING"} />
        </PageHeader>
        <div className="min-w-0 overflow-hidden"><StageRail current="extract" /></div>
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0 pb-20">
      <PageHeader 
        title="AI extraction" 
        eyebrow={`Stage 03 · INS-${inspectionId.toString().padStart(4, '0')}`}
        description="The model transcribes what is printed on the pack. It makes no legal determination — that comes later, from the deterministic rule engine."
      >
        <CancelInspectionAction inspectionId={inspectionId} status={inspection?.status || "EXTRACTION_PENDING"} />
      </PageHeader>
      <div className="min-w-0 overflow-hidden">
        <StageRail current="extract" />
      </div>

      <div className="flex flex-col xl:flex-row gap-8 min-w-0 mt-8">

        {/* ============================================================
            LEFT: SCANNER CHAMBER
            The outer container has overflow-hidden for rounded corners.
            All children are absolute-positioned so they stack cleanly.
            z-index layering:
              image wrapper     → z: 0
              grain             → z: 10  (normal blend — always visible)
              wave              → z: 20  (normal blend — always visible)
              beam              → z: 30  (normal blend — bright white)
              corner markers    → z: 40
              status pill       → z: 50
              error overlay     → z: 60
            ============================================================ */}
        <div className="w-full xl:w-1/2 shrink-0">
          <div
            className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black/60 shadow-xl transition-colors duration-500"
            style={{ border: isExtracting ? '1px solid rgba(45,212,191,0.35)' : '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Corner markers */}
            {(['tl','tr','bl','br'] as const).map(c => (
              <div
                key={c}
                className="absolute pointer-events-none transition-colors duration-500"
                style={{
                  zIndex: 40,
                  top:    c.startsWith('t') ? 16 : undefined,
                  bottom: c.startsWith('b') ? 16 : undefined,
                  left:   c.endsWith('l')   ? 16 : undefined,
                  right:  c.endsWith('r')   ? 16 : undefined,
                  width: 24,
                  height: 24,
                  borderTop:    c.startsWith('t') ? `1px solid ${isExtracting ? 'rgba(45,212,191,0.6)' : 'rgba(255,255,255,0.2)'}` : undefined,
                  borderBottom: c.startsWith('b') ? `1px solid ${isExtracting ? 'rgba(45,212,191,0.6)' : 'rgba(255,255,255,0.2)'}` : undefined,
                  borderLeft:   c.endsWith('l')   ? `1px solid ${isExtracting ? 'rgba(45,212,191,0.6)' : 'rgba(255,255,255,0.2)'}` : undefined,
                  borderRight:  c.endsWith('r')   ? `1px solid ${isExtracting ? 'rgba(45,212,191,0.6)' : 'rgba(255,255,255,0.2)'}` : undefined,
                  borderTopLeftRadius:     c === 'tl' ? 8 : undefined,
                  borderTopRightRadius:    c === 'tr' ? 8 : undefined,
                  borderBottomLeftRadius:  c === 'bl' ? 8 : undefined,
                  borderBottomRightRadius: c === 'br' ? 8 : undefined,
                }}
              />
            ))}

            {/* Package image — z: 0 */}
            {firstImage ? (
              <div className="absolute inset-0 flex items-center justify-center p-8" style={{ zIndex: 0 }}>
                <img
                  src={firstImage}
                  alt="Package reference"
                  className="max-w-full max-h-full object-contain transition-all duration-500"
                  style={isExtracting ? { filter: 'brightness(1.05) contrast(1.08) saturate(0.90)' } : {}}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary" style={{ zIndex: 0 }}>
                <FileImage className="w-10 h-10 mb-4 opacity-40" />
                <p className="text-[14px]">No reference image available</p>
              </div>
            )}

            {/* ---- SCANNING OVERLAYS (only while isExtracting) ---- */}
            {isExtracting && (
              <>
                {/*
                  LAYER 1 — GRAIN (z: 10)
                  SVG fractalNoise rendered as a background-image.
                  mix-blend-mode: NORMAL so it renders on top of any image color.
                  opacity 0.18 — perceptibly grainy over white, yellow, and dark areas.
                  ps-grain-shift moves background-position to animate grain life.
                */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none ps-grain-shift"
                  style={{
                    zIndex: 10,
                    opacity: 0.18,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: '200px 200px',
                  }}
                />

                {/*
                  LAYER 2 — BROAD WAVE (z: 20)
                  A 45%-tall gradient band.
                  mix-blend-mode: NORMAL — always visible regardless of image color.
                  White/teal at ~0.22 opacity makes it clearly visible over
                  bright yellow/white packaging areas.
                  ps-scan-wave moves it from top to bottom via translateY.
                */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 pointer-events-none ps-scan-wave"
                  style={{
                    zIndex: 20,
                    top: 0,
                    height: '45%',
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(45,212,191,0.18) 30%, rgba(255,255,255,0.22) 50%, rgba(45,212,191,0.18) 70%, transparent 100%)',
                  }}
                />

                {/*
                  LAYER 3 — SCAN BEAM (z: 30)
                  A 3px bright white line with strong teal glow.
                  Travels at same speed as the wave via ps-scan-beam.
                  mix-blend-mode: NORMAL — visible on all backgrounds.
                */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 pointer-events-none ps-scan-beam"
                  style={{
                    zIndex: 30,
                    top: 0,
                    height: '3px',
                    background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.9) 20%, white 50%, rgba(255,255,255,0.9) 80%, transparent 100%)',
                    boxShadow: '0 0 12px 4px rgba(45,212,191,0.7), 0 0 30px 10px rgba(45,212,191,0.3)',
                  }}
                />
              </>
            )}

            {/* Status pill — z: 50 */}
            {isExtracting && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{ zIndex: 50 }}>
                <div className="bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-accent/20 flex items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 motion-reduce:animate-none"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </span>
                  <span className="text-[12px] font-mono tracking-wide text-text-primary uppercase" aria-live="polite">
                    {extractionPhase}
                  </span>
                </div>
              </div>
            )}

            {/* Error overlay — z: 60 */}
            {error && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in" style={{ zIndex: 60 }}>
                <AlertCircle className="w-10 h-10 text-failure mb-4" />
                <p className="text-[14px] text-text-primary text-center mb-6 max-w-md">{error}</p>
                <Button variant="secondary" onClick={() => {
                  hasTriggeredExtraction.current = false
                  runExtraction()
                }}>
                  Retry Extraction
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            RIGHT: EXTRACTION STREAM
            ============================================================ */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h3 className="text-[15px] font-medium text-text-primary">Extracted Declarations</h3>
            <p className="text-[13px] text-text-secondary mt-1">Values exactly as transcribed from the packaging. Unverified.</p>
          </div>
          
          <div className="space-y-3 relative">
            {isExtracting ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-surface/30">
                  <div className="h-3 w-32 bg-border/50 rounded-sm mb-4"></div>
                  <div className="h-4 w-3/4 bg-border/50 rounded-sm mb-2"></div>
                </div>
              ))
            ) : extractedData ? (
              Object.entries(FIELD_LABELS).map(([key, label], index) => {
                const field = extractedData[key as keyof typeof FIELD_LABELS]
                const hasValue = field && field.value && field.value.trim() !== ''
                const delay = index * 80

                return (
                  <div key={key} className="relative group">
                    {/*
                      TRACER — desktop only (xl+), hidden on mobile.
                      Absolutely positioned to the LEFT of this card,
                      bridging the scanner gap. Originates from the right side
                      of the gap and travels left→card direction.
                      Does NOT touch the package image. Pure layout decoration.
                    */}
                    <div
                      aria-hidden="true"
                      className="hidden xl:block absolute top-1/2 right-[calc(100%+4px)] -translate-y-1/2 h-px w-14 bg-accent pointer-events-none ps-tracer"
                      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
                    />

                    {/* Declaration card */}
                    <div
                      className={cn(
                        "relative p-4 rounded-xl border border-border/80 bg-surface/60 hover:bg-surface hover:border-border transition-colors",
                        "animate-in fade-in slide-in-from-left-2 motion-reduce:slide-in-from-left-0 motion-reduce:duration-0"
                      )}
                      style={{
                        animationDelay: `${delay}ms`,
                        animationDuration: '280ms',
                        animationFillMode: 'both',
                      }}
                    >
                      {/* Left accent edge */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/5 rounded-l-xl group-hover:bg-white/10 transition-colors" />

                      {/* Field label + confidence pill row */}
                      <div className="flex items-start sm:items-center justify-between gap-4 mb-3">
                        <span className="text-[11px] font-mono font-medium uppercase tracking-[0.05em] text-text-secondary">
                          {label}
                        </span>
                        {field?.confidence && (
                          /* Confidence fades in 120ms after the card */
                          <div
                            className="shrink-0 animate-in fade-in zoom-in-95 motion-reduce:duration-0"
                            style={{
                              animationDelay: `${delay + 120}ms`,
                              animationDuration: '300ms',
                              animationFillMode: 'both',
                            }}
                          >
                            <ConfidencePill level={field.confidence} />
                          </div>
                        )}
                      </div>

                      {/* Value */}
                      <div className="pl-1">
                        {hasValue ? (
                          <p className="text-[14px] font-medium text-text-primary whitespace-pre-wrap leading-relaxed">
                            {field.value}
                          </p>
                        ) : (
                          <p className="text-[14px] text-text-secondary italic">
                            Not detected on the pack
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-border/50 bg-background/50 flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-6 h-6 text-text-secondary/50 mb-3" />
                <p className="text-[13px] text-text-secondary">
                  {!isExtracting && !error ? "Ready for AI extraction" : "No declarations available"}
                </p>
              </div>
            )}
          </div>

          {isComplete && (
            <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-in fade-in duration-700 motion-reduce:duration-0" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <div className="text-[13px] text-text-secondary">
                <p className="font-medium text-text-primary mb-1">Extraction completed successfully.</p>
                <p>Proceed to human review to verify and correct AI outputs.</p>
              </div>
              <Button 
                onClick={() => router.push(`/inspections/${inspectionId}/review`)}
                className="w-full sm:w-auto shrink-0 shadow-lg shadow-accent/10"
              >
                Start human review
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
