import React from 'react'

export function PageHeader({ title, description, children }: { title: string, description?: string, children?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-text-secondary mt-1">{description}</p>}
      </div>
      <div className="flex items-center space-x-4">
        {children}
      </div>
    </div>
  )
}
