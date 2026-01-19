'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileArchive,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Video,
  FileText,
  Layers,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

type UploadResult = {
  success: boolean
  jobId?: string
  courseId?: string
  courseName?: string
  stats?: {
    videos: number
    textFiles: number
    modules: number
    lessons: number
  }
  message?: string
  error?: string
}

type CourseUploaderProps = {
  onUploadComplete?: (result: UploadResult) => void
}

export function CourseUploader({ onUploadComplete }: CourseUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.zip')) {
      setResult({ success: false, error: 'Please upload a .zip file' })
      setStatus('error')
      return
    }
    setSelectedFile(file)
    setResult(null)
    setStatus('idle')
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (!selectedFile) return

    setStatus('uploading')
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/admin/content/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data: UploadResult = await response.json()

      if (data.success) {
        setStatus('complete')
        setResult(data)
        onUploadComplete?.(data)
      } else {
        setStatus('error')
        setResult(data)
      }
    } catch (error) {
      setStatus('error')
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setStatus('idle')
    setResult(null)
    setUploadProgress(0)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-navy">Upload Course</h2>
        {selectedFile && status !== 'uploading' && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${dragActive ? 'border-teal bg-teal/5' : 'border-grey/40 hover:border-grey/60'}
          ${status === 'complete' ? 'border-green-500 bg-green-50' : ''}
          ${status === 'error' ? 'border-red-500 bg-red-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />

        <AnimatePresence mode="wait">
          {status === 'idle' && !selectedFile && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-teal" />
              </div>
              <div>
                <p className="text-navy font-medium mb-1">
                  Drag and drop your course zip file here
                </p>
                <p className="text-rich-black/60 text-sm">
                  or click to browse
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileArchive className="w-4 h-4 mr-2" />
                Select Zip File
              </Button>
            </motion.div>
          )}

          {selectedFile && status === 'idle' && (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto">
                <FileArchive className="w-8 h-8 text-teal" />
              </div>
              <div>
                <p className="text-navy font-medium">{selectedFile.name}</p>
                <p className="text-rich-black/60 text-sm">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="primary" onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Process
              </Button>
            </motion.div>
          )}

          {status === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-teal animate-spin" />
              </div>
              <div>
                <p className="text-navy font-medium">Processing...</p>
                <p className="text-rich-black/60 text-sm">
                  {selectedFile?.name}
                </p>
              </div>
              <div className="w-full max-w-xs mx-auto">
                <div className="h-2 bg-grey/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-teal rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-rich-black/60 mt-2">
                  {uploadProgress}%
                </p>
              </div>
            </motion.div>
          )}

          {status === 'complete' && result && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-green-700 font-medium text-lg">
                  Course Created!
                </p>
                <p className="text-navy font-semibold">{result.courseName}</p>
              </div>
              {result.stats && (
                <div className="grid grid-cols-4 gap-4 max-w-md mx-auto pt-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mx-auto mb-1">
                      <Video className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-navy">{result.stats.videos}</p>
                    <p className="text-xs text-rich-black/60">Videos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg mx-auto mb-1">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-navy">{result.stats.textFiles}</p>
                    <p className="text-xs text-rich-black/60">Files</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mx-auto mb-1">
                      <Layers className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-navy">{result.stats.modules}</p>
                    <p className="text-xs text-rich-black/60">Modules</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg mx-auto mb-1">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-navy">{result.stats.lessons}</p>
                    <p className="text-xs text-rich-black/60">Lessons</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-green-600">
                AI processing will enhance content automatically.
              </p>
            </motion.div>
          )}

          {status === 'error' && result && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-red-700 font-medium">Upload Failed</p>
                <p className="text-red-600 text-sm">{result.error}</p>
              </div>
              <Button variant="secondary" onClick={handleReset}>
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help text */}
      <div className="mt-4 p-4 bg-light-grey rounded-lg">
        <p className="text-sm text-rich-black/70 font-medium mb-2">
          Zip file format:
        </p>
        <ul className="text-xs text-rich-black/60 space-y-1">
          <li>• Include video files (.mp4, .mov, .webm)</li>
          <li>• Organize in folders for automatic module detection</li>
          <li>• Optional: Add manifest.json for custom settings</li>
          <li>• AI will auto-transcribe videos and generate quizzes</li>
        </ul>
      </div>
    </Card>
  )
}
