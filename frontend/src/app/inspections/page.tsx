"use client"

import React, { useEffect, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { InspectionTable } from '../../components/inspection/InspectionTable'
import { api } from '../../lib/api'
import { InspectionResponse } from '../../types/api'
import { ErrorState } from '../../components/ui/ErrorState'
import { Button } from '../../components/ui/Button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<InspectionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.listInspections(0, 500)
      
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setInspections(data)
    } catch (err: any) {
      setError(err.message || "Failed to load inspections.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Inspections" 
          eyebrow="History"
          description="Every package that has entered the compliance pipeline, with its current stage and verdict."
        >
          <Link href="/inspections/new" tabIndex={-1}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New inspection
            </Button>
          </Link>
        </PageHeader>
        <ErrorState message={error} onRetry={loadData} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader 
        title="Inspections" 
        eyebrow="History"
        description="Every package that has entered the compliance pipeline, with its current stage and verdict."
      >
        <Link href="/inspections/new" tabIndex={-1}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New inspection
          </Button>
        </Link>
      </PageHeader>
      
      <InspectionTable 
        inspections={inspections} 
        isLoading={isLoading} 
      />
    </div>
  )
}
