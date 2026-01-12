'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/store/unifiedStore';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import SkillMapEditor from '@/components/admin/SkillMapEditor';
import { getIdToken } from '@/lib/firebase/auth';

interface SkillMapData {
  id: string;
  courseId: string;
  version: number;
  status: 'draft' | 'approved' | 'active';
  skills: Record<string, {
    id: string;
    name: string;
    lessonId: string;
    prerequisites: string[];
    bktParams: {
      pL0: number;
      pT: number;
      pG: number;
      pS: number;
    };
  }>;
  metadata: {
    generatedAt: string;
    generatedBy: 'ai' | 'manual';
    model?: string;
    approvedAt?: string;
  };
}

interface CourseInfo {
  courseId: string;
  title: string;
  description?: string;
  totalModules: number;
  totalLessons: number;
}

export default function SkillMapDetailPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [skillMap, setSkillMap] = useState<SkillMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/skill-maps/${courseId}`, {
        headers: {
          Authorization: `Bearer ${await getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch skill map');
      }

      const data = await response.json();
      setCourse(data.course);
      setSkillMap(data.skillMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin' && courseId) {
      fetchData();
    }
  }, [user, courseId, fetchData]);

  const handleGenerate = async () => {
    setIsGenerating(true);
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

      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleActivate = async () => {
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
        throw new Error('Failed to activate skill map');
      }

      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Activation failed');
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
            <div className="flex items-center gap-4">
              <Link
                href="/admin/skill-maps"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {course?.title || 'Skill Map Details'}
                </h1>
                <p className="text-gray-500 mt-1">{courseId}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {course && (
          <SkillMapEditor
            course={course}
            skillMap={skillMap}
            onGenerate={handleGenerate}
            onActivate={handleActivate}
            onRegenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}
      </main>
    </div>
  );
}
