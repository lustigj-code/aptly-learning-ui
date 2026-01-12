'use client';

import { useState } from 'react';

interface Skill {
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
}

interface SkillMapData {
  id: string;
  courseId: string;
  version: number;
  status: 'draft' | 'approved' | 'active';
  skills: Record<string, Skill>;
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

interface SkillMapEditorProps {
  course: CourseInfo;
  skillMap: SkillMapData | null;
  onGenerate: () => Promise<void>;
  onActivate: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  isGenerating: boolean;
}

export default function SkillMapEditor({
  course,
  skillMap,
  onGenerate,
  onActivate,
  onRegenerate,
  isGenerating,
}: SkillMapEditorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Group skills by module (extract from lessonId pattern like "M1-L1")
  const skillsByModule = skillMap
    ? Object.values(skillMap.skills).reduce(
        (acc, skill) => {
          const moduleMatch = skill.lessonId.match(/M(\d+)/);
          const moduleId = moduleMatch ? `M${moduleMatch[1]}` : 'unknown';
          if (!acc[moduleId]) acc[moduleId] = [];
          acc[moduleId].push(skill);
          return acc;
        },
        {} as Record<string, Skill[]>
      )
    : {};

  const toggleModule = (moduleId: string) => {
    const next = new Set(expandedModules);
    if (next.has(moduleId)) {
      next.delete(moduleId);
    } else {
      next.add(moduleId);
    }
    setExpandedModules(next);
  };

  const getDifficultyFromParams = (params: Skill['bktParams']) => {
    if (params.pL0 >= 0.15) return 'Easy';
    if (params.pL0 <= 0.08) return 'Hard';
    return 'Medium';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!skillMap) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Skill Map Generated</h3>
        <p className="text-gray-500 mb-6">
          Generate a skill map using AI to enable adaptive learning for this course.
        </p>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="px-6 py-3 bg-teal text-white rounded-lg hover:bg-teal/90 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Skill Map'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{course.title}</h2>
            <p className="text-gray-500 mt-1">{course.description}</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-600">
              <span>{course.totalModules} modules</span>
              <span>{course.totalLessons} lessons</span>
              <span>{Object.keys(skillMap.skills).length} skills</span>
            </div>
          </div>
          <div className="flex gap-2">
            {skillMap.status === 'draft' && (
              <button
                onClick={onActivate}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Activate
              </button>
            )}
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Status:</span>{' '}
              <StatusBadge status={skillMap.status} />
            </div>
            <div>
              <span className="text-gray-500">Version:</span>{' '}
              <span className="font-medium">{skillMap.version}</span>
            </div>
            <div>
              <span className="text-gray-500">Generated:</span>{' '}
              <span className="font-medium">
                {new Date(skillMap.metadata.generatedAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Model:</span>{' '}
              <span className="font-medium">{skillMap.metadata.model || 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills by module */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Skills by Module</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {Object.entries(skillsByModule)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([moduleId, skills]) => (
              <div key={moduleId}>
                <button
                  onClick={() => toggleModule(moduleId)}
                  className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      Module {moduleId.replace('M', '')}
                    </span>
                    <span className="text-sm text-gray-500">{skills.length} skills</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedModules.has(moduleId) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expandedModules.has(moduleId) && (
                  <div className="px-6 pb-4 space-y-3">
                    {skills.map(skill => {
                      const difficulty = getDifficultyFromParams(skill.bktParams);
                      return (
                        <div
                          key={skill.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{skill.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Lesson: {skill.lessonId}
                              </p>
                              {skill.prerequisites.length > 0 && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Prerequisites: {skill.prerequisites.join(', ')}
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(difficulty)}`}
                            >
                              {difficulty}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500">pL0:</span>{' '}
                              <span className="font-mono">{skill.bktParams.pL0}</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500">pT:</span>{' '}
                              <span className="font-mono">{skill.bktParams.pT}</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500">pG:</span>{' '}
                              <span className="font-mono">{skill.bktParams.pG}</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500">pS:</span>{' '}
                              <span className="font-mono">{skill.bktParams.pS}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
