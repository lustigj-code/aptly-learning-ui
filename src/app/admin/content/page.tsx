'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Layers,
  FileText,
  Atom,
  RefreshCw,
  Plus,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Database,
  ShieldX,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CourseUploader } from '@/components/admin/CourseUploader'
import { useUser } from '@/store/unifiedStore'

type ContentStats = {
  totalCourses: number
  totalModules: number
  totalLessons: number
  totalAtoms: number
}

type Course = {
  id: string
  number: number
  title: string
  description: string
  estimatedHours: number
  isLocked: boolean
}

export default function AdminContentPage() {
  const router = useRouter()
  const { user } = useUser()
  const [stats, setStats] = useState<ContentStats | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null)

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'instructor'

  useEffect(() => {
    // Only fetch data if admin
    if (isAdmin) {
      fetchData()
    } else {
      setIsLoading(false)
    }
  }, [isAdmin])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [statsRes, coursesRes] = await Promise.all([
        fetch('/api/admin/content/stats'),
        fetch('/api/courses'),
      ])

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json()
        setCourses(data.courses || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeedContent = async () => {
    setIsSeeding(true)
    setSeedResult(null)
    try {
      const res = await fetch('/api/admin/content/seed', { method: 'POST' })
      const result = await res.json()
      setSeedResult(result)
      if (result.success) {
        fetchData()
      }
    } catch (_error) {
      setSeedResult({ success: false, message: 'Failed to seed content' })
    } finally {
      setIsSeeding(false)
    }
  }

  const statCards = [
    { label: 'Courses', value: stats?.totalCourses || 0, icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Modules', value: stats?.totalModules || 0, icon: Layers, color: 'bg-purple-500' },
    { label: 'Lessons', value: stats?.totalLessons || 0, icon: FileText, color: 'bg-green-500' },
    { label: 'Atoms', value: stats?.totalAtoms || 0, icon: Atom, color: 'bg-orange-500' },
  ]

  // Show access denied if not admin
  if (!isAdmin && !isLoading) {
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center p-6">
        <Card variant="elevated" padding="xl" className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">Access Denied</h1>
          <p className="text-rich-black/60 mb-6">
            You do not have permission to access this page. Admin access is required.
          </p>
          <Button variant="primary" onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-grey p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Content Management</h1>
            <p className="text-rich-black/60">Manage courses, modules, lessons, and atoms</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" onClick={handleSeedContent} disabled={isSeeding}>
              <Database className={`w-4 h-4 mr-2 ${isSeeding ? 'animate-spin' : ''}`} />
              Seed Content
            </Button>
          </div>
        </div>

        {/* Seed Result */}
        {seedResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg flex items-center gap-3 ${
              seedResult.success
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {seedResult.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{seedResult.message}</span>
          </motion.div>
        )}

        {/* Course Upload Section */}
        <CourseUploader onUploadComplete={() => fetchData()} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-navy">
                      {isLoading ? '...' : stat.value}
                    </p>
                    <p className="text-sm text-rich-black/60">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Courses List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">Courses</h2>
            <Button variant="secondary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Course
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-grey/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-rich-black/50">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No courses found. Click &quot;Seed Content&quot; to populate.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 bg-light-grey rounded-lg hover:bg-grey/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-teal">{course.number}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-navy">{course.title}</h3>
                      <p className="text-sm text-rich-black/60">
                        {course.estimatedHours} hours • {course.isLocked ? 'Locked' : 'Available'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-rich-black/40" />
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
