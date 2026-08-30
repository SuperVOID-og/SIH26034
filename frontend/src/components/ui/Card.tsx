import * as React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-surface text-text-primary shadow-lg shadow-black/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden transition-colors duration-base ease-standard", 
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

export { Card }
