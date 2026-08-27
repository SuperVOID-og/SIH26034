"use client"

import React, { useEffect, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { InspectionTable } from '../../components/inspection/InspectionTable'
import { api } from '../../lib/api'
import { InspectionResponse } from '../../types/api'
import { ErrorState } from '../../components/ui/ErrorState'

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<InspectionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.listInspections(0, 500) // load a good chunk
      
      // Sort by newest first
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
        <PageHeader title="Inspections" />
        <ErrorState message={error} onRetry={loadData} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Inspections" 
        description="Complete history of all packaged commodity inspections" 
      />
      
      <InspectionTable 
        inspections={inspections} 
        isLoading={isLoading} 
      />
    </div>
  )
}
