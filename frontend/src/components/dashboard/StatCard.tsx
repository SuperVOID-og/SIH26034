import React from 'react'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon?: LucideIcon
  subtitle?: string
  className?: string
  iconClassName?: string
}

export function StatCard({ title, value, icon: Icon, subtitle, className, iconClassName }: StatCardProps) {
  return (
    <Card className={cn(
      "p-5 flex flex-col group transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 border-border/60",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-text-secondary tracking-wide">{title}</h3>
        {Icon && (
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md bg-surface-hover text-text-secondary transition-colors group-hover:bg-surface",
            iconClassName
          )}>
            <Icon className="w-4 h-4 stroke-[1.5]" />
          </div>
        )}
      </div>
      <div className="mt-auto flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-text-primary">{value}</span>
      </div>
      {subtitle && (
        <p className="mt-1 text-[13px] text-text-secondary">{subtitle}</p>
      )}
    </Card>
  )
}
