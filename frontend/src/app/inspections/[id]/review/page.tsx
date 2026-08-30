"use client"

import React, { useEffect, useState } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { StageRail } from '../../../../components/inspection/StageRail'
import { Card } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { ConfidencePill } from '../../../../components/ui/ConfidencePill'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { api } from '../../../../lib/api'
import { useRouter } from 'next/navigation'
import { cn, getMediaUrl } from '../../../../lib/utils'
import { Loader2, RotateCcw, AlertCircle } from 'lucide-react'
import { ConfidenceLevel, InspectionStatus } from '../../../../types/api'

interface ReviewFieldDef {
  canonical: string;
  aiField: string;
  label: string;
  isLong: boolean;
}

const REVIEW_FIELDS: ReviewFieldDef[] = [
  { canonical: "manufacturer_packer_importer_details", aiField: "manufacturer_packer_importer_details", label: "Manufacturer / Packer / Importer", isLong: true },
  { canonical: "generic_name", aiField: "common_generic_name", label: "Common / Generic Name", isLong: false },
  { canonical: "net_quantity", aiField: "net_quantity", label: "Net Quantity", isLong: false },
  { canonical: "mrp", aiField: "mrp", label: "MRP", isLong: false },
  { canonical: "manufacture_or_pack_date", aiField: "manufacture_or_pack_date", label: "Month / Year of Manufacture", isLong: false },
  { canonical: "consumer_care", aiField: "consumer_care", label: "Consumer Care Details", isLong: true },
  { canonical: "country_of_origin", aiField: "country_of_origin", label: "Country of Origin", isLong: false },
]

export default function ReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const inspectionId = parseInt(params.id, 10)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  
  // State for editable inputs
  const [formData, setFormData] = useState<Record<string, string>>({})
  
  // Keep track of which fields were focused for subtle image highlight
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch review data (contains extracted and verified)
        const reviewRes = await api.getReviewData(inspectionId)
        setExtractedData(reviewRes.extracted_data)
        
        // Fetch inspection for image
        const insp = await api.getInspection(inspectionId)
        setImagePath(insp.image_paths?.[0] || null)

        // Initialize form data
        const initialForm: Record<string, string> = {}
        REVIEW_FIELDS.forEach(field => {
          const aiObj = reviewRes.extracted_data?.[field.aiField]
          const aiValue = aiObj?.value || ""
          
          // If verified_data exists (e.g. returning to this page), use it. Otherwise default to AI value.
          const verifiedValue = reviewRes.verified_data?.data?.[field.canonical]
          
          if (verifiedValue !== undefined && verifiedValue !== null) {
            initialForm[field.canonical] = verifiedValue
          } else {
            initialForm[field.canonical] = aiValue
          }
        })
        
        setFormData(initialForm)
      } catch (err: any) {
        setError(err.message || "Failed to load review data.")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [inspectionId])

  const handleInputChange = (canonical: string, value: string) => {
    setFormData(prev => ({ ...prev, [canonical]: value }))
  }

  const handleReset = (canonical: string, aiValue: string) => {
    setFormData(prev => ({ ...prev, [canonical]: aiValue }))
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      
      // Submit the form data matching ReviewSubmission shape
      // Convert empty strings to null for the backend if appropriate, but keeping as string is usually fine.
      // We will send empty string as null so it is truly "absent"
      const payload: Record<string, string | null> = {}
      for (const [key, val] of Object.entries(formData)) {
        payload[key] = val.trim() === "" ? null : val
      }
      
      await api.submitReview(inspectionId, payload)
      
      // Navigate to evaluate stage
      router.push(`/inspections/${inspectionId}/evaluate`)
    } catch (err: any) {
      setError(err.message || "Failed to submit review.")
      setIsSubmitting(false)
    }
  }

  // Calculate modified count
  const modifiedCount = REVIEW_FIELDS.reduce((count, field) => {
    const aiValue = extractedData?.[field.aiField]?.value || ""
    const currentValue = formData[field.canonical] || ""
    // Basic normalized string comparison
    if (aiValue.trim() !== currentValue.trim()) {
      return count + 1
    }
    return count
  }, 0)

  // Calculate missing count
  const missingCount = REVIEW_FIELDS.reduce((count, field) => {
    const currentValue = formData[field.canonical] || ""
    if (currentValue.trim() === "") {
      return count + 1
    }
    return count
  }, 0)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Human verification" 
          eyebrow={`Stage 04 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="You are the source of truth. Correct anything the model misread — the rule engine only ever sees your verified values."
        />
        <StageRail current="review" />
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p>Loading review data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !extractedData) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Human verification" 
          eyebrow={`Stage 04 · INS-${inspectionId.toString().padStart(4, '0')}`}
          description="You are the source of truth. Correct anything the model misread — the rule engine only ever sees your verified values."
        />
        <StageRail current="review" />
        <ErrorState 
          title="Failed to load review" 
          message={error} 
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0">
      <PageHeader 
        title="Human verification" 
        eyebrow={`Stage 04 · INS-${inspectionId.toString().padStart(4, '0')}`}
        description="You are the source of truth. Correct anything the model misread — the rule engine only ever sees your verified values."
      />
      
      <StageRail current="review" />

      {/* Summary Stats */}
      <div className="flex items-center gap-4 text-[13px] font-medium border-b border-border/40 pb-4 mb-6">
        <div className="text-text-primary">
          {REVIEW_FIELDS.length} declarations reviewed
        </div>
        <div className="flex items-center gap-3 ml-2">
          <div className={cn(
            "px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors", 
            modifiedCount > 0 ? "bg-accent/10 text-accent" : "bg-surface text-text-secondary"
          )}>
            {modifiedCount > 0 && <AlertCircle className="w-3.5 h-3.5" />}
            {modifiedCount} modified
          </div>
          <div className={cn(
            "px-2.5 py-1 rounded-md transition-colors", 
            missingCount > 0 ? "bg-surface-elevated text-text-secondary" : "bg-surface text-text-secondary"
          )}>
            {missingCount} missing
          </div>
        </div>
      </div>
      
      {/* Optional Top Error (if submit fails) */}
      {error && (
        <div className="p-4 bg-failure/10 border border-failure/20 rounded-lg flex items-start gap-3 text-failure">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Desktop Layout: grid ~0.85fr / 1.15fr */}
      <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-6 lg:gap-8 items-start">
        
        {/* LEFT PANEL: Package Reference */}
        <div className="xl:sticky xl:top-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium text-text-primary">Package reference</h3>
            <p className="text-sm text-text-secondary mt-1">Uploaded package image for verification.</p>
          </div>
          
          <Card className={cn(
            "p-2 bg-surface-elevated overflow-hidden border-2 transition-colors duration-300",
            focusedField ? "border-accent/30" : "border-border/50"
          )}>
            {imagePath ? (
              <div className="relative aspect-[3/4] md:aspect-[4/3] xl:aspect-[3/4] rounded-md overflow-hidden bg-background">
                <img 
                  src={getMediaUrl(imagePath) || undefined} 
                  alt="Package reference" 
                  className="object-contain w-full h-full"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center aspect-[3/4] md:aspect-[4/3] xl:aspect-[3/4] rounded-md bg-surface text-text-secondary/50">
                <p>No image available</p>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT PANEL: Declaration Fields */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-text-primary">Declaration fields</h3>
            <p className="text-sm text-text-secondary mt-1">AI value on the left, your verified value below it</p>
          </div>

          <div className="space-y-4">
            {REVIEW_FIELDS.map((field) => {
              const aiObj = extractedData?.[field.aiField]
              const aiValue = aiObj?.value || ""
              const aiConfidence = aiObj?.confidence || ConfidenceLevel.UNKNOWN
              const currentValue = formData[field.canonical] || ""
              const isModified = aiValue.trim() !== currentValue.trim()
              
              return (
                <Card key={field.canonical} className="p-4 sm:p-5 flex flex-col gap-5 border-border/40 bg-surface/40 hover:border-border/80 transition-colors">
                  {/* Field Header */}
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-medium text-text-primary text-[15px]">{field.label}</h4>
                    {isModified && (
                      <span className="text-[10px] font-medium uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-sm border border-accent/20 shadow-[0_0_10px_rgba(20,184,166,0.1)]">
                        Modified
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 relative">
                    {/* Desktop directional relationship (AI -> Verified) */}
                    <div className="hidden sm:block absolute left-[15px] top-[40px] bottom-[28px] w-[2px] bg-border/40 rounded-full" />
                    
                    {/* AI Value Panel (Read-only, technical) */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-black/40 rounded-lg border border-border/30 relative z-10">
                      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-surface border border-border/50 text-[10px] font-mono font-medium text-text-secondary uppercase tracking-widest">
                        AI
                      </div>
                      <div className="flex-1 text-[13px] text-text-secondary">
                        {aiValue ? (
                          <span className="line-clamp-3 leading-relaxed">{aiValue}</span>
                        ) : (
                          <span className="italic opacity-60">Not detected on the pack</span>
                        )}
                      </div>
                      <div className="shrink-0 self-start sm:self-auto">
                        <ConfidencePill level={aiConfidence} />
                      </div>
                    </div>

                    {/* Verified Value Panel (Interactive, brighter) */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 relative z-10">
                      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-mono font-medium text-accent uppercase tracking-widest">
                        YOU
                      </div>
                      <div className="flex-1 relative group">
                        {field.isLong ? (
                          <Textarea 
                            value={currentValue}
                            onChange={(e) => handleInputChange(field.canonical, e.target.value)}
                            onFocus={() => setFocusedField(field.canonical)}
                            onBlur={() => setFocusedField(null)}
                            placeholder="Enter the verified value"
                            className={cn(
                              "min-h-[80px] bg-surface hover:bg-surface-elevated transition-colors border-border/60 focus:border-accent shadow-sm pr-24",
                              isModified ? "border-accent/40 bg-accent/5" : ""
                            )}
                          />
                        ) : (
                          <Input 
                            value={currentValue}
                            onChange={(e) => handleInputChange(field.canonical, e.target.value)}
                            onFocus={() => setFocusedField(field.canonical)}
                            onBlur={() => setFocusedField(null)}
                            placeholder="Enter the verified value"
                            className={cn(
                              "bg-surface hover:bg-surface-elevated transition-colors border-border/60 focus:border-accent shadow-sm pr-24",
                              isModified ? "border-accent/40 bg-accent/5" : ""
                            )}
                          />
                        )}
                        
                        {/* Reset button if modified */}
                        {isModified && (
                          <div className="absolute right-2 top-2 z-20">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleReset(field.canonical, aiValue)}
                              className="h-7 px-2 text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-elevated flex items-center gap-1.5 opacity-0 sm:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity"
                              title="Reset to AI value"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span className="hidden sm:inline">Reset to AI</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="pt-8 pb-12 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-border mt-10">
            <div className="text-[14px] text-text-secondary">
              <p className="font-medium text-text-primary mb-1">Confirm verified declarations</p>
              <p>This locks these values as the verified record for the rule engine.</p>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[200px] shadow-[0_0_15px_rgba(20,184,166,0.15)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm verified declarations"
              )}
            </Button>
          </div>
        </div>
        
      </div>
    </div>
  )
}
