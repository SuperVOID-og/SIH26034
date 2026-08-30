"use client"
import React from 'react'
import { cn } from '../../lib/utils'

interface CursorRevealMarkProps {
  className?: string
  text?: string
}

export function CursorRevealMark({ 
  className, 
  text = "PACKSURE"
}: CursorRevealMarkProps) {
  return (
    <div 
      className={cn(
        "pointer-events-none select-none flex items-center justify-start overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      <div 
        className="text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-none -ml-1"
        style={{
          // Premium cold metallic / brushed silver effect
          background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.25) 0%, rgba(161, 161, 170, 0.15) 50%, rgba(82, 82, 91, 0.05) 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          // Soft teal/white atmospheric glow, kept very subtle so it doesn't overpower the hero
          filter: 'drop-shadow(0 0 20px rgba(20, 184, 166, 0.08))'
        }}
      >
        {text}
      </div>
    </div>
  )
}
