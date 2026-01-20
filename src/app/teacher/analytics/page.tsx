'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/store/unifiedStore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClassHeatmap } from '@/components/teacher/ClassHeatmap';
import { COLORS_RAW } from '@/lib/design-tokens';
import { FSM_CONCEPTS, type StudentMasteryData } from '@/lib/teacher/types';

type SortOption = 'name' | 'struggling';

interface ClassStats {
  totalStudents: number;
  averageMastery: number;
  strugglingCount: number;
  excellingCount: number;
  activeThisWeek: number;
}

export default function TeacherAnalyticsDashboard() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();

  const [students, setStudents] = useState<StudentMasteryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('struggling');

  // Check if user is instructor or admin
  useEffect(() => {
    if (!isUserLoading && (!user || (user.role !== 'instructor' && user.role !== 'admin'))) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // Fetch class analytics data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/teacher/class-analytics');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch data');
        }

        const data = await response.json();
        setStudents(data.data.students);
        setError(null);
      } catch (err) {
        console.error('Error fetching class analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && (user.role === 'instructor' || user.role === 'admin')) {
      fetchData();
    }
  }, [user]);

  // Calculate class statistics
  const stats: ClassStats = useMemo(() => {
    if (students.length === 0) {
      return {
        totalStudents: 0,
        averageMastery: 0,
        strugglingCount: 0,
        excellingCount: 0,
        activeThisWeek: 0,
      };
    }

    const avgMastery = students.reduce((sum, s) => sum + s.averageMastery, 0) / students.length;
    const struggling = students.filter((s) => s.averageMastery < 50).length;
    const excelling = students.filter((s) => s.averageMastery >= 80).length;

    // Count students active in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const activeThisWeek = students.filter((s) => {
      if (!s.lastActiveAt) return false;
      return new Date(s.lastActiveAt) >= weekAgo;
    }).length;

    return {
      totalStudents: students.length,
      averageMastery: avgMastery,
      strugglingCount: struggling,
      excellingCount: excelling,
      activeThisWeek,
    };
  }, [students]);

  // Get most struggling students for quick view
  const mostStruggling = useMemo(() => {
    return [...students]
      .sort((a, b) => a.averageMastery - b.averageMastery)
      .slice(0, 5);
  }, [students]);

  // Get concept difficulty (concepts where class average is lowest)
  const hardestConcepts = useMemo(() => {
    const conceptAverages = FSM_CONCEPTS.map((concept) => {
      const masteryValues = students
        .map((s) => s.masteryLevels.find((m) => m.skillId === concept.id)?.level || 0)
        .filter((v) => v > 0);

      const avg = masteryValues.length > 0
        ? masteryValues.reduce((sum, v) => sum + v, 0) / masteryValues.length
        : 0;

      return { concept, average: avg, dataPoints: masteryValues.length };
    });

    return conceptAverages
      .filter((c) => c.dataPoints > 0)
      .sort((a, b) => a.average - b.average)
      .slice(0, 5);
  }, [students]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Class Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor student progress and identify those who need support
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading class data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="text-sm text-gray-500 font-medium">Total Students</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStudents}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="text-sm text-gray-500 font-medium">Class Average</div>
                <div
                  className="text-3xl font-bold mt-1"
                  style={{ color: stats.averageMastery >= 70 ? COLORS_RAW.success : stats.averageMastery >= 50 ? COLORS_RAW.warning : COLORS_RAW.error }}
                >
                  {Math.round(stats.averageMastery)}%
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="text-sm text-gray-500 font-medium">Struggling (&lt;50%)</div>
                <div className="text-3xl font-bold text-red-500 mt-1">{stats.strugglingCount}</div>
                {stats.strugglingCount > 0 && (
                  <div className="text-xs text-red-400 mt-1">
                    {Math.round((stats.strugglingCount / stats.totalStudents) * 100)}% of class
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="text-sm text-gray-500 font-medium">Excelling (&gt;80%)</div>
                <div className="text-3xl font-bold text-green-500 mt-1">{stats.excellingCount}</div>
                {stats.excellingCount > 0 && (
                  <div className="text-xs text-green-400 mt-1">
                    {Math.round((stats.excellingCount / stats.totalStudents) * 100)}% of class
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="text-sm text-gray-500 font-medium">Active This Week</div>
                <div className="text-3xl font-bold text-teal-600 mt-1">{stats.activeThisWeek}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {Math.round((stats.activeThisWeek / Math.max(stats.totalStudents, 1)) * 100)}% engagement
                </div>
              </motion.div>
            </div>

            {/* Quick Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Most Struggling Students */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Students Needing Attention
                  </h3>
                </div>
                <div className="p-4">
                  {mostStruggling.length > 0 ? (
                    <ul className="space-y-3">
                      {mostStruggling.map((student, index) => (
                        <li key={student.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: COLORS_RAW.navy }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-xs text-gray-500">
                                {student.lastActiveAt
                                  ? `Last active ${new Date(student.lastActiveAt).toLocaleDateString()}`
                                  : 'Never active'}
                              </div>
                            </div>
                          </div>
                          <div
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                              backgroundColor: student.averageMastery < 30 ? '#fef2f2' : '#fefce8',
                              color: student.averageMastery < 30 ? '#dc2626' : '#ca8a04',
                            }}
                          >
                            {Math.round(student.averageMastery)}%
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      All students are performing well!
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Hardest Concepts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Concepts Needing Review
                  </h3>
                </div>
                <div className="p-4">
                  {hardestConcepts.length > 0 ? (
                    <ul className="space-y-3">
                      {hardestConcepts.map((item, index) => (
                        <li key={item.concept.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.concept.name}</div>
                              <div className="text-xs text-gray-500">
                                Lesson {item.concept.lesson} - {item.dataPoints} students assessed
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${item.average}%`,
                                  backgroundColor: item.average < 50 ? '#ef4444' : item.average < 70 ? '#eab308' : '#22c55e',
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 w-10">
                              {Math.round(item.average)}%
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No concept data available yet.
                    </p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Heatmap Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Class Mastery Heatmap</h2>

                {/* Sort Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="struggling">Most Struggling Students</option>
                    <option value="name">Alphabetical (Name)</option>
                  </select>
                </div>
              </div>

              <ClassHeatmap
                students={students}
                concepts={FSM_CONCEPTS}
                sortBy={sortBy}
              />
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
