import * as React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border border-border bg-surface text-text-primary shadow-sm backdrop-blur-sm relative overflow-hidden", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

export { Card }
