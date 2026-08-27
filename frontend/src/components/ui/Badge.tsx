import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'failure' | 'review' | 'neutral'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono font-medium tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-accent",
        {
          'border-transparent bg-neutral/20 text-text-primary': variant === 'default',
          'border-success/20 bg-success-surface text-success': variant === 'success',
          'border-failure/20 bg-failure-surface text-failure': variant === 'failure',
          'border-review/20 bg-review-surface text-review': variant === 'review',
          'border-border bg-surface text-text-secondary': variant === 'neutral',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
