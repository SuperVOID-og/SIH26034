"use client"

import React, { useEffect, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { StatCard } from '../components/dashboard/StatCard'
import { InspectionTable } from '../components/inspection/InspectionTable'
import { api } from '../lib/api'
import { DashboardStats } from '../types/api'
import { ErrorState } from '../components/ui/ErrorState'
import { FileText, CheckCircle2, XCircle, AlertCircle, Plus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import Link from 'next/link'

import { PackSureWordmark } from '../components/visual/PackSureWordmark'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getDashboardStats()
      setStats(data)
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
      <div className="space-y-6 relative">
        <PageHeader 
          title="Inspection command center" 
          eyebrow="Compliance intelligence"
          description="Every packaged commodity moves through extraction, human verification and a deterministic rule engine. Nothing is marked compliant by AI."
        >
          <Link href="/inspections/new" tabIndex={-1}>
            <Button className="bg-[#4F8CFF] hover:bg-[#5B9CFF] text-white border-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_15px_rgba(79,140,255,0.25)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_0_20px_rgba(79,140,255,0.4)]">
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      <div className="-mb-4">
        <PackSureWordmark className="justify-start" />
      </div>
      
      <PageHeader 
        title="Inspection command center" 
        eyebrow="Compliance intelligence"
        description="Every packaged commodity moves through extraction, human verification and a deterministic rule engine. Nothing is marked compliant by AI."
      >
        <Link href="/inspections/new" tabIndex={-1}>
          <Button className="bg-[#4F8CFF] hover:bg-[#5B9CFF] text-white border-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_15px_rgba(79,140,255,0.25)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_0_20px_rgba(79,140,255,0.4)]">
            <Plus className="w-4 h-4 mr-2" />
            New inspection
          </Button>
        </Link>
      </PageHeader>
      
      {isLoading || !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total inspections" 
            value={stats.total_inspections} 
            icon={FileText}
            subtitle={stats.drafts > 0 ? `${stats.drafts} Drafts / Unfinished` : undefined}
            className="bg-[#121821] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] bg-gradient-to-br from-info/5 to-transparent"
            iconClassName="text-info group-hover:bg-info/10 group-hover:text-info group-hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          />
          <StatCard 
            title="Compliant" 
            value={stats.compliant} 
            icon={CheckCircle2}
            className="bg-[#121821] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] bg-gradient-to-br from-success/5 to-transparent"
            iconClassName="text-success group-hover:bg-success/10 group-hover:text-success group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />
          <StatCard 
            title="Non-compliant" 
            value={stats.non_compliant} 
            icon={XCircle}
            className="bg-[#121821] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] bg-gradient-to-br from-failure/5 to-transparent"
            iconClassName="text-failure group-hover:bg-failure/10 group-hover:text-failure group-hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          />
          <StatCard 
            title="Review required" 
            value={stats.review_required} 
            icon={AlertCircle}
            className="bg-[#121821] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] bg-gradient-to-br from-warning/5 to-transparent"
            iconClassName="text-warning group-hover:bg-warning/10 group-hover:text-warning group-hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold tracking-tight text-text-primary">Recent Inspections</h2>
        </div>
        <InspectionTable 
          inspections={stats?.recent_inspections || []} 
          isLoading={isLoading} 
          emptyMessage="Your recent packaged commodity inspections will appear here." 
        />
      </div>
    </div>
  )
}
