'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/store/userProfileStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getIdToken } from '@/lib/firebase/auth';

interface CourseStatus {
  courseId: string;
  title: string;
  hasSkillMap: boolean;
  status: 'none' | 'draft' | 'approved' | 'active';
  skillCount: number;
  generatedAt: string | null;
  version: number;
}

export default function SkillMapsPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/skill-maps', {
        headers: {
          Authorization: `Bearer ${await getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCourses();
    }
  }, [user, fetchCourses]);

  const handleGenerate = async (courseId: string) => {
    setGenerating(courseId);
    try {
      const response = await fetch('/api/admin/skill-maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getIdToken()}`,
        },
        body: JSON.stringify({ courseId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate skill map');
      }

      // Refresh the list
      await fetchCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(null);
    }
  };

  const handleApprove = async (courseId: string) => {
    try {
      const response = await fetch('/api/admin/skill-maps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getIdToken()}`,
        },
        body: JSON.stringify({ courseId, status: 'active' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve skill map');
      }

      await fetchCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Skill Map Management</h1>
              <p className="text-gray-500 mt-1">Generate and manage AI-powered skill maps for courses</p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-sm text-teal hover:underline"
            >
              Back to Analytics
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map(course => (
                <tr key={course.courseId}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{course.title}</div>
                    <div className="text-sm text-gray-500">{course.courseId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={course.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {course.skillCount > 0 ? `${course.skillCount} skills` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {course.generatedAt
                      ? new Date(course.generatedAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {course.status === 'none' && (
                        <button
                          onClick={() => handleGenerate(course.courseId)}
                          disabled={generating === course.courseId}
                          className="px-3 py-1 text-sm bg-teal text-white rounded hover:bg-teal/90 disabled:opacity-50"
                        >
                          {generating === course.courseId ? 'Generating...' : 'Generate'}
                        </button>
                      )}
                      {course.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleApprove(course.courseId)}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Activate
                          </button>
                          <button
                            onClick={() => handleGenerate(course.courseId)}
                            disabled={generating === course.courseId}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Regenerate
                          </button>
                        </>
                      )}
                      {course.hasSkillMap && (
                        <Link
                          href={`/admin/skill-maps/${course.courseId}`}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    none: 'bg-gray-100 text-gray-600',
    draft: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
  };

  const labels: Record<string, string> = {
    none: 'No Map',
    draft: 'Draft',
    approved: 'Approved',
    active: 'Active',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] ?? colors.none}`}>
      {labels[status] ?? status}
    </span>
  );
}
