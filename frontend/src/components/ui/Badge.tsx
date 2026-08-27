import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'failure' | 'review' | 'neutral'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent",
        {
          'border-transparent bg-neutral text-white': variant === 'default',
          'border-transparent bg-success-surface text-success': variant === 'success',
          'border-transparent bg-failure-surface text-failure': variant === 'failure',
          'border-transparent bg-review-surface text-review': variant === 'review',
          'border-border bg-surface text-text-secondary': variant === 'neutral',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
