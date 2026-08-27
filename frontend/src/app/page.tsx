"use client"

import React, { useEffect, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { StatCard } from '../components/dashboard/StatCard'
import { InspectionTable } from '../components/inspection/InspectionTable'
import { api } from '../lib/api'
import { InspectionResponse, OverallAssessment } from '../types/api'
import { ErrorState } from '../components/ui/ErrorState'

export default function DashboardPage() {
  const [inspections, setInspections] = useState<InspectionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.listInspections(0, 100)
      
      // Sort by newest first
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setInspections(data)
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.")
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
        <PageHeader title="Dashboard" />
        <ErrorState message={error} onRetry={loadData} />
      </div>
    )
  }

  // Calculate metrics
  const total = inspections.length
  let compliant = 0
  let nonCompliant = 0
  let reviewRequired = 0

  inspections.forEach(i => {
    const assessment = i.compliance_results?.scoring?.assessment
    if (assessment === OverallAssessment.COMPLIANT) compliant++
    else if (assessment === OverallAssessment.NON_COMPLIANT) nonCompliant++
    else if (assessment === OverallAssessment.REVIEW_REQUIRED) reviewRequired++
  })

  // Top 5 for recent
  const recentInspections = inspections.slice(0, 5)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader title="Dashboard" description="Overview of packaged commodity inspections" />
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-xl bg-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Inspections" value={total} />
          <StatCard title="Compliant" value={compliant} />
          <StatCard title="Non-Compliant" value={nonCompliant} className="border-failure/20" />
          <StatCard title="Review Required" value={reviewRequired} className="border-review/20" />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium tracking-tight">Recent Inspections</h2>
        </div>
        <InspectionTable 
          inspections={recentInspections} 
          isLoading={isLoading} 
          emptyMessage="Your recent packaged commodity inspections will appear here." 
        />
      </div>
    </div>
  )
}
