import React from 'react'

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, eyebrow, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 space-y-5 lg:space-y-0">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-[11px] font-mono font-medium tracking-[0.2em] text-accent uppercase mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-text-primary leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[15px] text-text-secondary mt-3 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-3 shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
