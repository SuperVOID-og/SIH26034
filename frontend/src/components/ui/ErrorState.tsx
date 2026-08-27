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
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-failure-surface border border-failure/20">
      <AlertCircle className="w-8 h-8 text-failure mb-3" />
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-failure mb-4 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} size="sm">
          Try Again
        </Button>
      )}
    </div>
  )
}
