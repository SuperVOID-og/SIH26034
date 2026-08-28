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
      <div className="flex items-center gap-4 text-sm font-medium">
        <div className={cn(
          "px-3 py-1.5 rounded-md flex items-center gap-2", 
          modifiedCount > 0 ? "bg-accent/10 text-accent" : "bg-surface text-text-secondary"
        )}>
          {modifiedCount > 0 ? <AlertCircle className="w-4 h-4" /> : null}
          {modifiedCount} modified
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-md", 
          missingCount > 0 ? "bg-surface-elevated text-text-secondary" : "bg-surface text-text-secondary"
        )}>
          {missingCount} missing
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
                <Card key={field.canonical} className="p-4 sm:p-5 flex flex-col gap-4">
                  {/* Field Header */}
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-medium text-text-primary">{field.label}</h4>
                    {isModified && (
                      <span className="text-[11px] font-medium uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-sm">
                        Modified
                      </span>
                    )}
                  </div>

                  {/* AI Value Display (Read-Only) */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-surface rounded-md border border-border/50">
                    <span className="text-xs font-mono font-medium text-text-secondary uppercase tracking-widest shrink-0 w-12">
                      AI
                    </span>
                    <div className="flex-1 text-sm text-text-secondary">
                      {aiValue ? (
                        <span className="line-clamp-3">{aiValue}</span>
                      ) : (
                        <span className="italic opacity-50">Not detected on the pack</span>
                      )}
                    </div>
                    <div className="shrink-0">
                      <ConfidencePill level={aiConfidence} />
                    </div>
                  </div>

                  {/* Verified Value Input (Editable) */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <span className="text-xs font-mono font-medium text-accent uppercase tracking-widest shrink-0 w-12 sm:pt-3">
                      YOU
                    </span>
                    <div className="flex-1 relative">
                      {field.isLong ? (
                        <Textarea 
                          value={currentValue}
                          onChange={(e) => handleInputChange(field.canonical, e.target.value)}
                          onFocus={() => setFocusedField(field.canonical)}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Enter the verified value"
                          className={isModified ? "border-accent bg-accent-surface" : ""}
                        />
                      ) : (
                        <Input 
                          value={currentValue}
                          onChange={(e) => handleInputChange(field.canonical, e.target.value)}
                          onFocus={() => setFocusedField(field.canonical)}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Enter the verified value"
                          className={isModified ? "border-accent bg-accent-surface" : ""}
                        />
                      )}
                    </div>
                    {/* Reset button if modified */}
                    {isModified && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReset(field.canonical, aiValue)}
                        className="shrink-0 h-10 w-10 p-0 sm:mt-0 mt-2 self-end sm:self-start"
                        title="Reset to AI value"
                      >
                        <RotateCcw className="h-4 w-4 text-text-secondary" />
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border mt-8">
            <p className="text-sm text-text-secondary">
              Confirming locks these values as the verified record.
            </p>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm & evaluate"
              )}
            </Button>
          </div>
        </div>
        
      </div>
    </div>
  )
}
