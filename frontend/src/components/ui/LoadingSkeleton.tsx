import React from 'react'
import { cn } from '../../lib/utils'

export function LoadingSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-hover", className)}
      {...props}
    />
  )
}
