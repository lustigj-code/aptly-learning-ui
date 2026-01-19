'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
  ShieldX,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { QuestionBankTable } from '@/components/admin/QuestionBankTable'
import { useUser } from '@/store/userProfileStore'
import { getAllQuestions, type IndexedQuestion } from '@/data/questionBank'
import { allFsmQuestions } from '@/data/fsmQuestionBank'

export default function AdminQuestionsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [selectedQuestion, setSelectedQuestion] = useState<IndexedQuestion | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'instructor'

  // Get all questions from both sources
  const allQuestions = useMemo(() => {
    const courseQuestions = getAllQuestions()

    // Convert FSM questions to IndexedQuestion format
    const fsmIndexedQuestions: IndexedQuestion[] = allFsmQuestions.map((q) => ({
      ...q,
      globalId: `fsm-${q.id}`,
      courseId: 'fsm-c1',
      moduleId: 'fsm-m1',
      lessonId: `fsm-l${q.id.split('-')[2]?.replace('l', '') || '1'}`,
      atomId: `fsm-atom-${q.id}`,
    }))

    return [...courseQuestions, ...fsmIndexedQuestions]
  }, [])

  // Calculate stats
  const stats = useMemo(() => {
    // Get course stats for reference (available via getQuestionStats() if needed)
    const totalQuestions = allQuestions.length

    // By difficulty
    const byDifficulty = allQuestions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    // By skill
    const bySkill = allQuestions.reduce((acc, q) => {
      q.skills.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    // By course
    const byCourse = allQuestions.reduce((acc, q) => {
      acc[q.courseId] = (acc[q.courseId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: totalQuestions,
      byDifficulty,
      bySkill,
      byCourse,
    }
  }, [allQuestions])

  const handleEditQuestion = (question: IndexedQuestion) => {
    setSelectedQuestion(question)
    setShowEditModal(true)
  }

  const handleExportQuestions = () => {
    const dataStr = JSON.stringify(allQuestions, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `question-bank-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Show access denied if not admin
  if (!isAdmin) {
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

  const statCards = [
    {
      label: 'Total Questions',
      value: stats.total,
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      label: 'Easy',
      value: stats.byDifficulty[1] || 0,
      icon: Target,
      color: 'bg-green-500',
    },
    {
      label: 'Medium',
      value: stats.byDifficulty[2] || 0,
      icon: Target,
      color: 'bg-blue-500',
    },
    {
      label: 'Hard',
      value: stats.byDifficulty[3] || 0,
      icon: Target,
      color: 'bg-orange-500',
    },
    {
      label: 'Expert+',
      value: (stats.byDifficulty[4] || 0) + (stats.byDifficulty[5] || 0),
      icon: Target,
      color: 'bg-purple-500',
    },
  ]

  // Top 5 skills by question count
  const topSkills = Object.entries(stats.bySkill)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-light-grey p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Question Bank</h1>
            <p className="text-rich-black/60">
              Manage and review all quiz questions across courses
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={handleExportQuestions}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-navy">{stat.value}</p>
                    <p className="text-sm text-rich-black/60">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Top Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Skills by Question Count */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-navy mb-4">
              Top Skills by Question Count
            </h2>
            <div className="space-y-3">
              {topSkills.length === 0 ? (
                <div className="text-center py-4 text-rich-black/50">
                  No skills found
                </div>
              ) : (
                topSkills.map(([skill, count]) => (
                  <div
                    key={skill}
                    className="flex items-center justify-between p-3 bg-light-grey rounded-lg"
                  >
                    <span className="text-sm font-medium text-navy">{skill}</span>
                    <span className="px-3 py-1 bg-teal/20 text-teal rounded-full text-sm font-semibold">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Questions by Course */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-navy mb-4">
              Questions by Course
            </h2>
            <div className="space-y-3">
              {Object.entries(stats.byCourse).length === 0 ? (
                <div className="text-center py-4 text-rich-black/50">
                  No courses found
                </div>
              ) : (
                Object.entries(stats.byCourse)
                  .sort(([, a], [, b]) => b - a)
                  .map(([course, count]) => (
                    <div
                      key={course}
                      className="flex items-center justify-between p-3 bg-light-grey rounded-lg"
                    >
                      <span className="text-sm font-medium text-navy">{course}</span>
                      <span className="px-3 py-1 bg-purple/20 text-purple rounded-full text-sm font-semibold">
                        {count}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>

        {/* Questions Table */}
        <QuestionBankTable
          questions={allQuestions}
          onEdit={handleEditQuestion}
        />

        {/* Edit Modal (placeholder) */}
        {showEditModal && selectedQuestion && (
          <Modal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setSelectedQuestion(null)
            }}
            title="Edit Question"
          >
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Edit functionality coming soon</p>
                  <p>
                    This is a placeholder modal. Question editing will be implemented
                    in a future update.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-navy">Question ID:</span>{' '}
                  {selectedQuestion.id}
                </div>
                <div>
                  <span className="font-semibold text-navy">Global ID:</span>{' '}
                  {selectedQuestion.globalId}
                </div>
                <div>
                  <span className="font-semibold text-navy">Type:</span>{' '}
                  {selectedQuestion.type}
                </div>
                <div>
                  <span className="font-semibold text-navy">Difficulty:</span>{' '}
                  {selectedQuestion.difficulty}
                </div>
                <div>
                  <span className="font-semibold text-navy">Skills:</span>{' '}
                  {selectedQuestion.skills.join(', ')}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedQuestion(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
