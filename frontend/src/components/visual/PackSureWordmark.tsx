"use client"
import React from 'react'
import { cn } from '../../lib/utils'

interface PackSureWordmarkProps {
  className?: string
  text?: string
}

export function PackSureWordmark({ 
  className, 
  text = "PACKSURE"
}: PackSureWordmarkProps) {
  return (
    <div 
      className={cn(
        "pointer-events-none select-none flex items-center justify-start overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      <div 
        className="font-ibm text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-none -ml-1 text-[#F4F7FB]"
        style={{
          letterSpacing: '-0.03em',
          textShadow: '0 0 12px rgba(45, 212, 191, 0.25), 0 0 25px rgba(59, 130, 246, 0.15)'
        }}
      >
        {text}
      </div>
    </div>
  )
}
