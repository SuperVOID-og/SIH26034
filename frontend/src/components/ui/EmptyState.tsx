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
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl bg-background">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-hover text-text-secondary mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
