import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "group inline-flex items-center justify-center rounded-md font-medium transition-all duration-base ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          {
            'bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_15px_rgba(20,184,166,0.15)] hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]': variant === 'primary',
            'bg-surface-raised text-text-primary hover:bg-surface-hover hover:border-border-strong border border-border': variant === 'secondary',
            'border border-border bg-transparent hover:bg-surface-hover hover:border-border-strong text-text-primary': variant === 'outline',
            'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary': variant === 'ghost',
            'bg-failure/10 text-failure hover:bg-failure/20': variant === 'danger',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2 text-sm': size === 'md',
            'h-12 px-8 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
