import React, { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { OverallAssessment } from '../../types/api'

interface ScoreDialProps {
  score: number | null
  assessment: OverallAssessment
}

export function ScoreDial({ score, assessment }: ScoreDialProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  
  // Real score fallback to 0 for rendering purposes if missing
  const targetScore = score ?? 0
  const isMissing = score === null || score === undefined
  
  // Animation effect
  useEffect(() => {
    if (isMissing) return
    
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setAnimatedScore(targetScore)
      return
    }

    const duration = 1000 // 1s
    const start = performance.now()
    
    const animate = (time: number) => {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (easeOutCubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(easeProgress * targetScore))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [targetScore, isMissing])

  // Semantic color selection
  const getColor = () => {
    switch (assessment) {
      case OverallAssessment.COMPLIANT: return 'text-success stroke-success'
      case OverallAssessment.NON_COMPLIANT: return 'text-failure stroke-failure'
      case OverallAssessment.REVIEW_REQUIRED: return 'text-review stroke-review'
      default: return 'text-text-secondary stroke-border'
    }
  }

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="relative flex flex-col items-center justify-center p-6">
      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 140 140">
        {/* Background track */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          className="stroke-border/30 fill-none"
          strokeWidth="8"
        />
        {/* Progress arc */}
        {!isMissing && (
          <circle
            cx="70"
            cy="70"
            r={radius}
            className={cn("fill-none transition-all duration-100 ease-out", getColor())}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        )}
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center inset-0">
        <div className={cn("text-5xl font-semibold tracking-tight", getColor().split(' ')[0])}>
          {isMissing ? '—' : animatedScore}
        </div>
        <div className="text-xs font-mono font-medium tracking-widest text-text-secondary mt-1 uppercase">
          PackSure Score
        </div>
      </div>
    </div>
  )
}
