import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export type Stage = "setup" | "upload" | "extract" | "review" | "evaluate" | "results"

const STAGES = [
  { id: "setup", label: "Setup" },
  { id: "upload", label: "Images" },
  { id: "extract", label: "AI Extraction" },
  { id: "review", label: "Human Review" },
  { id: "evaluate", label: "Compliance" },
  { id: "results", label: "Results" },
]

export function StageRail({ current }: { current: Stage }) {
  const currentIndex = STAGES.findIndex(s => s.id === current)

  return (
    <div className="w-full overflow-x-auto pb-4 mb-4" aria-label="Workflow progress">
      <div className="flex items-center min-w-max">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isActive = index === currentIndex
          const isFuture = index > currentIndex

          return (
            <React.Fragment key={stage.id}>
              <div className="flex items-center" aria-current={isActive ? "step" : undefined}>
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-mono font-medium transition-all duration-300 relative z-10",
                  {
                    "bg-accent text-accent-foreground shadow-[0_0_15px_rgba(20,184,166,0.3)] ring-1 ring-accent ring-offset-2 ring-offset-background": isActive,
                    "bg-surface-raised text-text-primary border border-border": isCompleted,
                    "bg-transparent text-text-secondary border border-border/50": isFuture
                  }
                )}>
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : index + 1}
                </div>
                <span className={cn(
                  "ml-2.5 text-[12px] font-medium tracking-wide uppercase transition-colors duration-300",
                  {
                    "text-text-primary": isActive,
                    "text-text-secondary": isCompleted,
                    "text-text-secondary/50": isFuture
                  }
                )}>
                  {stage.label}
                </span>
              </div>

              {index < STAGES.length - 1 && (
                <div className="w-8 mx-3 h-[1px] bg-border relative z-0">
                  <div 
                    className="absolute inset-y-0 left-0 bg-accent transition-all duration-500"
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
