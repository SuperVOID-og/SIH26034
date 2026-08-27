"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { StageRail } from '../../../../components/inspection/StageRail'
import { Card } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { UploadCloud, X, AlertCircle, FileImage } from 'lucide-react'
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
  }, [files])

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
    URL.revokeObjectURL(previews[key])
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 min-w-0">
      <PageHeader 
        title="Capture the package" 
        eyebrow={`Stage 02 · INS-${inspectionId.toString().padStart(4, '0')}`}
        description="Clear, straight-on shots of every printed panel give the extraction step the best chance of reading each declaration."
      />
      
      <div className="min-w-0 overflow-hidden">
        <StageRail current="upload" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-w-0">
        {/* Left Column - Dropzone */}
        <div className="flex-1 space-y-6 min-w-0">
          <Card className="p-4 sm:p-6 w-full">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-surface border border-failure/30 text-[13px] text-text-primary flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-failure-surface shrink-0 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-failure" />
                </div>
                <div className="pt-1.5">{error}</div>
              </div>
            )}

            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isDragging 
                  ? "border-accent bg-accent-surface glow-subtle scale-[1.01]" 
                  : "border-border hover:border-border-strong hover:bg-surface-hover"
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept="image/jpeg,image/png,image/webp" 
                onChange={onFileChange}
                tabIndex={-1}
              />
              <div className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-4 transition-colors",
                isDragging ? "bg-accent/20 text-accent" : "bg-surface-raised text-text-secondary"
              )}>
                <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.5]" />
              </div>
              <h3 className="text-[14px] sm:text-[15px] font-medium text-text-primary mb-2">Drop package images here</h3>
              <p className="text-[12px] sm:text-[13px] text-text-secondary">or click to browse · JPEG, PNG, WEBP · up to 5 MB each</p>
            </div>

            <div className="mt-8 sm:mt-10 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-[13px] text-text-secondary text-center sm:text-left">
                {files.length === 0 ? "At least one image is required." : `${files.length} file${files.length !== 1 ? 's' : ''} ready.`}
              </p>
              <Button 
                onClick={handleUpload} 
                disabled={files.length === 0 || isUploading}
                isLoading={isUploading}
                className="w-full sm:w-auto"
              >
                Upload & continue
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column - Selected Files */}
        <div className="w-full lg:w-80 shrink-0">
          <Card className="p-5 min-h-[250px] lg:min-h-[300px] flex flex-col h-full">
            <h3 className="text-[14px] font-medium text-text-primary mb-1">Selected images</h3>
            <p className="text-[12px] text-text-secondary mb-5">These are the images that will be used for extraction and may be referenced as evidence.</p>
            
            <div className="flex-1">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center text-text-secondary mb-3">
                    <FileImage className="w-4 h-4" />
                  </div>
                  <p className="text-[13px] font-medium text-text-primary">Nothing selected yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {files.map(file => {
                    const key = file.name + file.lastModified
                    const url = previews[key]
                    return (
                      <div key={key} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background group transition-colors hover:border-border-strong min-w-0">
                        <div className="w-10 h-10 rounded bg-surface shrink-0 overflow-hidden relative">
                          {url ? (
                            <img src={url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-text-primary truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                            {formatSize(file.size)}
                          </p>
                        </div>
                        <button 
                          onClick={() => removeFile(file)}
                          className="w-7 h-7 flex flex-shrink-0 items-center justify-center rounded-md text-text-secondary hover:text-failure hover:bg-failure-surface transition-colors focus:outline-none focus:ring-2 focus:ring-failure"
                          aria-label={`Remove ${file.name}`}
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
