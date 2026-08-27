import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-surface border border-border">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-failure-surface mb-3">
        <AlertCircle className="w-5 h-5 text-failure" />
      </div>
      <h3 className="text-[15px] font-medium text-text-primary mb-1 tracking-tight">{title}</h3>
      <p className="text-[13px] text-text-secondary mb-5 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} size="sm">
          Try Again
        </Button>
      )}
    </div>
  )
}
