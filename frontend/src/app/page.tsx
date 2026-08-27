"use client"

import React, { useEffect, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { StatCard } from '../components/dashboard/StatCard'
import { InspectionTable } from '../components/inspection/InspectionTable'
import { api } from '../lib/api'
import { InspectionResponse, OverallAssessment } from '../types/api'
import { ErrorState } from '../components/ui/ErrorState'
import { FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const [inspections, setInspections] = useState<InspectionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.listInspections(0, 100)
      
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

  const recentInspections = inspections.slice(0, 5)

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader title="Dashboard" description="Overview of packaged commodity inspections" />
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl bg-border/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Inspections" 
            value={total} 
            icon={FileText}
          />
          <StatCard 
            title="Compliant" 
            value={compliant} 
            icon={CheckCircle2}
            iconClassName="text-success group-hover:bg-success-surface group-hover:text-success"
          />
          <StatCard 
            title="Non-Compliant" 
            value={nonCompliant} 
            icon={XCircle}
            iconClassName="text-failure group-hover:bg-failure-surface group-hover:text-failure"
          />
          <StatCard 
            title="Review Required" 
            value={reviewRequired} 
            icon={AlertCircle}
            iconClassName="text-review group-hover:bg-review-surface group-hover:text-review"
          />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-[15px] font-medium tracking-tight text-text-primary">Recent Inspections</h2>
        <InspectionTable 
          inspections={recentInspections} 
          isLoading={isLoading} 
          emptyMessage="Your recent packaged commodity inspections will appear here." 
        />
      </div>
    </div>
  )
}
