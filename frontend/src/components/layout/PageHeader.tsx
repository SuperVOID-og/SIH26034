import React from 'react'

export function PageHeader({ title, description, children }: { title: string, description?: string, children?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 space-y-4 md:space-y-0">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">{title}</h1>
        {description && <p className="text-[14px] text-text-secondary mt-1 tracking-wide">{description}</p>}
      </div>
      <div className="flex items-center space-x-3">
        {children}
      </div>
    </div>
  )
}
