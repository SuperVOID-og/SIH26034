"use client"

import React, { useState } from 'react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { StageRail } from '../../../components/inspection/StageRail'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { ArrowRight, ShoppingCart, ShoppingBag, Layers, Box, Coffee, Droplets, Sparkles, Smartphone, ShieldCheck } from 'lucide-react'
import { api } from '../../../lib/api'
import { useRouter } from 'next/navigation'
import { cn } from '../../../lib/utils'

const CATEGORIES = [
  { id: 'Packaged Food', icon: Coffee },
  { id: 'Beverages', icon: Droplets },
  { id: 'Personal Care', icon: Sparkles },
  { id: 'Household Cleaning', icon: Sparkles },
  { id: 'Cosmetics', icon: Sparkles },
  { id: 'Electronics Accessories', icon: Smartphone },
]

const CONTEXTS = [
  { id: 'Retail Shelf Pack', icon: ShoppingCart },
  { id: 'E-Commerce Listing Pack', icon: ShoppingBag },
  { id: 'Multi-piece Combination Pack', icon: Layers },
  { id: 'Wholesale / Bulk Pack', icon: Box },
]

export default function NewInspectionPage() {
  const router = useRouter()
  const [category, setCategory] = useState<string | null>(null)
  const [context, setContext] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!category || !context) {
      setError("Please select both a product category and a package context.")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const res = await api.createInspection(category, context)
      router.push(`/inspections/${res.id}/upload`)
    } catch (err: any) {
      setError(err.message || "Failed to create inspection.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0">
      <PageHeader 
        title="Set up the inspection" 
        eyebrow="Stage 01"
        description="Two declarations define how the rule engine will interpret this package. Everything else is read from the pack itself."
      />
      
      <div className="min-w-0 overflow-hidden">
        <StageRail current="setup" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-w-0">
        {/* Left Column */}
        <div className="flex-1 space-y-6 min-w-0">
          <Card className="p-4 sm:p-6 w-full">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-surface border border-failure/30 text-[13px] text-text-primary flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-failure-surface shrink-0 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-failure" />
                </div>
                <div className="pt-1.5">{error}</div>
              </div>
            )}

            <div className="space-y-8">
              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-4">Product Category</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CATEGORIES.map(c => {
                    const isSelected = category === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCategory(c.id); setError(null) }}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent min-w-0",
                          isSelected 
                            ? "border-accent bg-accent-surface text-accent glow-subtle" 
                            : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:border-border-strong hover:text-text-primary"
                        )}
                        aria-pressed={isSelected}
                      >
                        <c.icon className="w-4 h-4 shrink-0" />
                        <span className={cn("text-[13px] font-medium leading-tight whitespace-normal break-words", isSelected ? "text-text-primary" : "")}>{c.id}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-[14px] font-medium text-text-primary mb-4">Package Context</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONTEXTS.map(c => {
                    const isSelected = context === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setContext(c.id); setError(null) }}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent min-w-0",
                          isSelected 
                            ? "border-accent bg-accent-surface text-accent glow-subtle" 
                            : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:border-border-strong hover:text-text-primary"
                        )}
                        aria-pressed={isSelected}
                      >
                        <c.icon className="w-4 h-4 shrink-0" />
                        <span className={cn("text-[13px] font-medium leading-tight whitespace-normal break-words", isSelected ? "text-text-primary" : "")}>{c.id}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-border flex justify-end">
              <Button onClick={handleSubmit} isLoading={isSubmitting} className="w-full sm:w-auto">
                Create inspection
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-80 shrink-0">
          <Card className="p-5 bg-surface-raised border-border-strong h-full">
            <h3 className="text-[14px] font-medium text-text-primary mb-1">What happens next</h3>
            <p className="text-[12px] text-text-secondary mb-6">A fixed, auditable sequence — no shortcuts.</p>
            
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="text-[11px] font-mono font-medium text-text-secondary mt-0.5 shrink-0">2</div>
                <div>
                  <h4 className="text-[13px] font-medium text-text-primary mb-1">Images</h4>
                  <p className="text-[12px] text-text-secondary leading-relaxed">Capture the principal display and back panels.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-[11px] font-mono font-medium text-text-secondary mt-0.5 shrink-0">3</div>
                <div>
                  <h4 className="text-[13px] font-medium text-text-primary mb-1">AI extraction</h4>
                  <p className="text-[12px] text-text-secondary leading-relaxed">Printed declarations are read and structured.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-[11px] font-mono font-medium text-text-secondary mt-0.5 shrink-0">4</div>
                <div>
                  <h4 className="text-[13px] font-medium text-text-primary mb-1">Human review</h4>
                  <p className="text-[12px] text-text-secondary leading-relaxed">You confirm or correct each extracted value.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-[11px] font-mono font-medium text-text-secondary mt-0.5 shrink-0">5</div>
                <div>
                  <h4 className="text-[13px] font-medium text-text-primary mb-1">Compliance</h4>
                  <p className="text-[12px] text-text-secondary leading-relaxed">The deterministic engine issues the verdict.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-[11px] font-mono font-medium text-text-secondary mt-0.5 shrink-0">6</div>
                <div>
                  <h4 className="text-[13px] font-medium text-text-primary mb-1">Results</h4>
                  <p className="text-[12px] text-text-secondary leading-relaxed">Rule outcomes and regulatory evidence are shown.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
