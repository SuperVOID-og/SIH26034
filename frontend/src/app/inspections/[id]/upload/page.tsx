"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { StageRail } from '../../../../components/inspection/StageRail'
import { Button } from '../../../../components/ui/Button'
import { UploadCloud, X, AlertCircle } from 'lucide-react'
import { api } from '../../../../lib/api'
import { useRouter } from 'next/navigation'
import { cn } from '../../../../lib/utils'

export default function UploadPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const inspectionId = parseInt(params.id, 10)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      Object.values(previews).forEach(url => URL.revokeObjectURL(url))
    }
  }, [previews])

  const validateAndAddFiles = (newFiles: File[]) => {
    setError(null)
    const validFiles: File[] = []
    let errorMessage: string | null = null

    newFiles.forEach(file => {
      // Check type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        errorMessage = `Unsupported format: ${file.name}. Only JPEG, PNG, WEBP allowed.`
        return
      }
      
      // Check size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        errorMessage = `File too large: ${file.name} exceeds 5MB limit.`
        return
      }

      // Check duplicate
      const isDuplicate = files.some(
        f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      )
      if (isDuplicate) return

      validFiles.push(file)
    })

    if (errorMessage) {
      setError(errorMessage)
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      
      const newPreviews: Record<string, string> = {}
      validFiles.forEach(f => {
        newPreviews[f.name + f.lastModified] = URL.createObjectURL(f)
      })
      setPreviews(prev => ({ ...prev, ...newPreviews }))
    }
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files))
    }
  }, [files, validateAndAddFiles])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files))
    }
    // reset input so the same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f !== file))
    const key = file.name + file.lastModified
    // Delay revocation slightly so exit animations can complete
    setTimeout(() => {
      URL.revokeObjectURL(previews[key])
    }, 1000)
    
    setPreviews(prev => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    try {
      setIsUploading(true)
      setError(null)
      await api.uploadImages(inspectionId, files)
      router.push(`/inspections/${inspectionId}/extract`)
    } catch (err: any) {
      setError(err.message || "Failed to upload images.")
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0 pb-20">
      <PageHeader 
        title="Capture the package" 
        eyebrow={`Stage 02 · INS-${inspectionId.toString().padStart(4, '0')}`}
        description="Clear, straight-on shots of every printed panel give the extraction step the best chance of reading each declaration."
      />
      
      <div className="min-w-0 overflow-hidden">
        <StageRail current="upload" />
      </div>

      <div className="mt-12 relative w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept="image/jpeg,image/png,image/webp" 
          onChange={onFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />

        {error && (
          <div className="w-full mb-6 p-4 rounded-xl bg-surface border border-failure/30 text-[13px] text-text-primary flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-8 h-8 rounded-full bg-failure-surface shrink-0 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-failure" />
            </div>
            <div className="pt-1.5">{error}</div>
          </div>
        )}

        {files.length === 0 ? (
          /* ====================================================
             EMPTY STATE: LIQUID-GLASS UPLOAD CHAMBER
             ==================================================== */
          <div className="relative w-full">
            {/* Local Ambient Light (behind the chamber) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.08)_0%,_transparent_70%)] pointer-events-none -z-10" />

            <div 
              className={cn(
                "relative group w-full rounded-3xl transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                // Base shadow for floating elevation
                "shadow-[0_20px_60px_rgba(0,0,0,0.35),_0_0_40px_rgba(45,212,191,0.03)]",
                // Hover transforms
                "hover:-translate-y-[2px] hover:shadow-[0_30px_80px_rgba(0,0,0,0.45),_0_0_60px_rgba(45,212,191,0.05)]",
                isDragging ? "-translate-y-[2px] shadow-[0_30px_80px_rgba(0,0,0,0.45),_0_0_60px_rgba(45,212,191,0.15)]" : ""
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              role="button"
              aria-label="Upload package images"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
            >
              {/* Glass Material Layers (all clipped by container radius) */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                {/* 1. Backdrop Blur */}
                <div className="absolute inset-0 backdrop-blur-md" />
                
                {/* 2. Base Surface Brightness */}
                <div className="absolute inset-0 bg-white/[0.035]" />
                
                {/* 3. Surface Gradient & Edge Light (subtle top-left highlight, faint teal bottom-right) */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-colors duration-300",
                  isDragging 
                    ? "from-white/[0.1] via-white/[0.04] to-[rgba(45,212,191,0.05)]"
                    : "from-white/[0.08] via-white/[0.025] to-transparent group-hover:from-white/[0.09] group-hover:via-white/[0.03] group-hover:to-transparent"
                )} />
                
                {/* 4. Border & Inner Depths (Inner top highlight, inner bottom shadow) */}
                <div className={cn(
                  "absolute inset-0 rounded-3xl border transition-colors duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_inset_0_-1px_0_rgba(0,0,0,0.2)]",
                  isDragging ? "border-accent/40" : "border-white/[0.08] group-hover:border-white/[0.12]"
                )} />

                {/* 5. Drag-over extra glow */}
                {isDragging && (
                  <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(45,212,191,0.2)] animate-in fade-in duration-300" />
                )}
              </div>

              {/* Content */}
              <div className="relative px-6 py-20 flex flex-col items-center justify-center text-center">
                 {/* Icon Tile */}
                 <div className={cn(
                   "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ease-out backdrop-blur-md border",
                   // Tile Material
                   "bg-white/[0.05] shadow-[0_8px_16px_rgba(0,0,0,0.2),_inset_0_1px_0_rgba(255,255,255,0.1),_inset_0_-1px_0_rgba(0,0,0,0.1)]",
                   isDragging 
                    ? "border-accent/50 text-accent shadow-[0_8px_24px_rgba(45,212,191,0.3),_inset_0_1px_0_rgba(255,255,255,0.2)] scale-110" 
                    : "border-white/[0.08] text-text-secondary group-hover:border-white/[0.15] group-hover:text-text-primary group-hover:-translate-y-[2px]"
                 )}>
                   <UploadCloud className="w-8 h-8 stroke-[1.5]" />
                 </div>

                 <h3 className="text-xl font-medium text-text-primary mb-2 transition-colors">
                   {isDragging ? "Release to add package images" : "Upload package images"}
                 </h3>
                 
                 <p className="text-[15px] text-text-secondary mb-8">
                   Drop package images here or browse from your device.
                 </p>
                 
                 <div className="flex items-center gap-4 text-[12px] font-mono text-text-secondary/60">
                   <span>JPG · PNG · WEBP</span>
                   <span className="w-1 h-1 rounded-full bg-border" />
                   <span>5 MB MAX</span>
                 </div>
              </div>
            </div>
          </div>
        ) : (
          /* ====================================================
             SELECTED STATE
             ==================================================== */
          <div className="w-full animate-in fade-in zoom-in-95 motion-base ease-standard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Main Hero Preview */}
               <div className="md:col-span-2 flex flex-col gap-4">
                 <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black/60 border border-border/50 flex items-center justify-center group">
                    <img 
                      src={previews[files[0].name + files[0].lastModified]} 
                      alt={files[0].name}
                      className="object-contain w-full h-full" 
                    />
                    {/* Inner frame styling */}
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none rounded-3xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity motion-fast" />

                    <button 
                      className="absolute top-4 right-4 w-10 h-10 bg-surface/80 hover:bg-failure hover:text-white text-text-secondary rounded-full flex items-center justify-center backdrop-blur-md transition-colors motion-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent z-10" 
                      onClick={(e) => { e.stopPropagation(); removeFile(files[0]) }}
                      aria-label={`Remove ${files[0].name}`}
                      title={`Remove ${files[0].name}`}
                    >
                       <X className="w-5 h-5" />
                    </button>
                 </div>
                 
                 <div className="flex items-center justify-between px-2">
                   <div className="min-w-0 pr-4">
                     <h3 className="text-[15px] font-medium text-text-primary truncate" title={files[0].name}>{files[0].name}</h3>
                     <p className="text-[13px] font-mono text-text-secondary mt-0.5">{formatSize(files[0].size)}</p>
                   </div>
                   
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="shrink-0 h-10 px-4 rounded-full border border-border hover:border-border-strong hover:bg-surface text-[13px] font-medium text-text-primary transition-colors motion-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                   >
                     + Add more images
                   </button>
                 </div>
               </div>

               {/* Remaining Thumbnails */}
               {files.length > 1 && (
                 <div className="md:col-span-1 flex flex-col">
                   <h4 className="text-[11px] font-mono font-medium tracking-[0.2em] text-accent uppercase mb-4 px-2">
                     Additional images
                   </h4>
                   <div className="grid grid-cols-2 gap-3">
                     {files.slice(1).map((file, idx) => {
                        const key = file.name + file.lastModified
                        const url = previews[key]
                        return (
                          <div 
                            key={key} 
                            className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border group animate-in fade-in zoom-in-95 motion-fast ease-out" 
                            style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                          >
                            <img src={url} alt={file.name} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity motion-fast" />
                            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 pointer-events-none rounded-2xl" />
                            
                            <button 
                              className="absolute top-2 right-2 w-7 h-7 bg-surface/90 hover:bg-failure hover:text-white text-text-secondary rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all motion-fast focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent" 
                              onClick={(e) => { e.stopPropagation(); removeFile(file) }}
                              aria-label={`Remove ${file.name}`}
                              title={`Remove ${file.name}`}
                            >
                               <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                     })}
                   </div>
                 </div>
               )}
            </div>
            
            <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[14px] text-text-secondary text-center sm:text-left px-2">
                 {files.length} image{files.length !== 1 ? 's' : ''} ready for extraction
              </div>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                isLoading={isUploading}
                className="w-full sm:w-auto min-w-[200px]"
              >
                {isUploading ? "Uploading package images..." : "Continue to AI extraction"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
