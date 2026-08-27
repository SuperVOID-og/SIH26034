import React from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-background border border-border/50">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-hover text-text-secondary mb-3 shadow-sm ring-1 ring-border/50 animate-in zoom-in-95 duration-500">
        <Icon className="w-5 h-5 stroke-[1.5]" />
      </div>
      <h3 className="text-[15px] font-medium text-text-primary mb-1 tracking-tight">{title}</h3>
      <p className="text-[13px] text-text-secondary mb-5 max-w-sm leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
