'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Edit, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { IndexedQuestion } from '@/data/questionBank'

type QuestionBankTableProps = {
  questions: IndexedQuestion[]
  onEdit?: (question: IndexedQuestion) => void
}

const ITEMS_PER_PAGE = 20

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Easy', color: 'bg-green-100 text-green-800' },
  2: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  3: { label: 'Hard', color: 'bg-orange-100 text-orange-800' },
  4: { label: 'Expert', color: 'bg-purple-100 text-purple-800' },
  5: { label: 'Master', color: 'bg-red-100 text-red-800' },
}

const questionTypeLabels: Record<string, string> = {
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True/False',
  'open-ended': 'Open Ended',
}

export function QuestionBankTable({ questions, onEdit }: QuestionBankTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCourse, setFilterCourse] = useState<string>('')
  const [filterSkill, setFilterSkill] = useState<string>('')
  const [filterDifficulty, setFilterDifficulty] = useState<number | ''>('')
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

  // Extract unique values for filters
  const uniqueCourses = Array.from(new Set(questions.map(q => q.courseId))).sort()
  const uniqueSkills = Array.from(
    new Set(questions.flatMap(q => q.skills))
  ).sort()

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = searchQuery === '' ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.explanation.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCourse = filterCourse === '' || q.courseId === filterCourse
    const matchesSkill = filterSkill === '' || q.skills.includes(filterSkill)
    const matchesDifficulty = filterDifficulty === '' || q.difficulty === filterDifficulty

    return matchesSearch && matchesCourse && matchesSkill && matchesDifficulty
  })

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to page 1 when filters change
  const handleFilterChange = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setCurrentPage(1)
  }

  const toggleExpanded = (questionId: string) => {
    setExpandedQuestionId(expandedQuestionId === questionId ? null : questionId)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              size="sm"
            />
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={filterCourse}
              onChange={(e) => handleFilterChange(setFilterCourse)(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-grey/40 bg-white hover:border-muted-teal focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all"
            >
              <option value="">All Courses</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Skill Filter */}
          <div>
            <select
              value={filterSkill}
              onChange={(e) => handleFilterChange(setFilterSkill)(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-grey/40 bg-white hover:border-muted-teal focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all"
            >
              <option value="">All Skills</option>
              {uniqueSkills.map(skill => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="lg:col-start-3">
            <select
              value={filterDifficulty}
              onChange={(e) => handleFilterChange(setFilterDifficulty)(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 px-3 text-sm rounded-lg border border-grey/40 bg-white hover:border-muted-teal focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all"
            >
              <option value="">All Difficulties</option>
              <option value="1">Easy</option>
              <option value="2">Medium</option>
              <option value="3">Hard</option>
              <option value="4">Expert</option>
              <option value="5">Master</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-rich-black/60">
          Showing {paginatedQuestions.length} of {filteredQuestions.length} questions
          {filteredQuestions.length !== questions.length && ` (filtered from ${questions.length} total)`}
        </div>
      </Card>

      {/* Questions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-light-grey border-b border-grey/20">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-navy">Question</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-navy">Skills</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-navy">Difficulty</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-navy">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-navy">Course</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-navy">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-rich-black/60">
                    No questions found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((question) => (
                  <motion.tr
                    key={question.globalId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-grey/10 hover:bg-light-grey/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="space-y-2">
                        {/* Question preview */}
                        <div className="text-sm text-navy font-medium line-clamp-2">
                          {question.question}
                        </div>

                        {/* Expand/Collapse button */}
                        <button
                          onClick={() => toggleExpanded(question.globalId)}
                          className="flex items-center gap-1 text-xs text-teal hover:text-teal-dark transition-colors"
                        >
                          {expandedQuestionId === question.globalId ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Show details
                            </>
                          )}
                        </button>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {expandedQuestionId === question.globalId && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-3 pt-3 border-t border-grey/20"
                            >
                              {/* Options */}
                              {question.options && (
                                <div>
                                  <div className="text-xs font-semibold text-navy mb-1">Options:</div>
                                  <div className="space-y-1">
                                    {question.options.map((option, idx) => (
                                      <div
                                        key={idx}
                                        className={`text-xs px-2 py-1 rounded ${
                                          question.correctAnswer === idx
                                            ? 'bg-success/10 text-success font-medium'
                                            : 'text-rich-black/70'
                                        }`}
                                      >
                                        {idx + 1}. {option}
                                        {question.correctAnswer === idx && ' ✓'}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Explanation */}
                              <div>
                                <div className="text-xs font-semibold text-navy mb-1">Explanation:</div>
                                <div className="text-xs text-rich-black/70 bg-light-grey/50 p-2 rounded">
                                  {question.explanation}
                                </div>
                              </div>

                              {/* IDs */}
                              <div className="text-xs text-rich-black/50">
                                ID: {question.id} • Global ID: {question.globalId}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {question.skills.slice(0, 2).map(skill => (
                          <span
                            key={skill}
                            className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {question.skills.length > 2 && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-grey/20 text-rich-black/60 rounded">
                            +{question.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          difficultyLabels[question.difficulty]?.color || 'bg-grey/20 text-rich-black'
                        }`}
                      >
                        {difficultyLabels[question.difficulty]?.label || question.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-rich-black/70">
                      {questionTypeLabels[question.type] || question.type}
                    </td>
                    <td className="py-3 px-4 text-sm text-rich-black/70">
                      {question.courseId}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit?.(question)}
                        className="text-teal hover:bg-teal/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-grey/20">
            <div className="text-sm text-rich-black/60">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                isDisabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                isDisabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
