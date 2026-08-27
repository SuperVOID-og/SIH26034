import React from 'react'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

export function StatCard({ title, value, subtitle, trend, trendValue, className }: StatCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-text-primary">{value}</span>
        {trend && trendValue && (
          <span className={cn(
            "text-xs font-medium",
            trend === 'up' && "text-success",
            trend === 'down' && "text-failure",
            trend === 'neutral' && "text-text-secondary"
          )}>
            {trendValue}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      )}
    </Card>
  )
}
