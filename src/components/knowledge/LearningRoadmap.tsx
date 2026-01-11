/**
 * Learning Roadmap Component
 * Phase 5.1: Learning Path Roadmap
 * Phase 3.1: Knowledge Graph Visualization
 *
 * Interactive visualization of course structure with prerequisites
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, Circle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import type { Course, Module, Lesson } from '@/types';

type LearningRoadmapProps = {
  course: Course;
  userProgress: {
    atomsCompleted: string[];
    lessonsCompleted: string[];
    modulesCompleted: string[];
  };
  userMastery: Array<{
    conceptId: string;
    masteryLevel: number;
  }>;
};

type LessonStatus = 'locked' | 'available' | 'in_progress' | 'complete';

export function LearningRoadmap({ course, userProgress, userMastery }: LearningRoadmapProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([course.modules[0]?.id]));

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const getLessonStatus = (lesson: Lesson): LessonStatus => {
    if (userProgress.lessonsCompleted.includes(lesson.id)) {
      return 'complete';
    }

    // Check if lesson is locked based on its isLocked property
    if (lesson.isLocked) {
      return 'locked';
    }

    // Check if in progress
    const hasCompletedAtoms = lesson.atoms?.some((atom) =>
      userProgress.atomsCompleted.includes(atom.id)
    );

    return hasCompletedAtoms ? 'in_progress' : 'available';
  };

  const getStatusIcon = (status: LessonStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green" />;
      case 'in_progress':
        return <Circle className="w-5 h-5 text-teal animate-pulse" />;
      case 'available':
        return <Circle className="w-5 h-5 text-blue" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: LessonStatus): string => {
    switch (status) {
      case 'complete':
        return 'bg-green/10 border-green/30';
      case 'in_progress':
        return 'bg-teal/10 border-teal/30';
      case 'available':
        return 'bg-blue/10 border-blue/30';
      case 'locked':
        return 'bg-gray-50 border-gray-200';
    }
  };

  const courseProgress = course.modules.reduce((acc, module) => {
    const moduleLessons = module.lessons || [];
    const completed = moduleLessons.filter((l) => userProgress.lessonsCompleted.includes(l.id));
    return {
      total: acc.total + moduleLessons.length,
      completed: acc.completed + completed.length,
    };
  }, { total: 0, completed: 0 });

  const overallPercentage =
    courseProgress.total > 0 ? Math.round((courseProgress.completed / courseProgress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-navy mb-2">{course.title}</h1>
        <p className="text-gray-600 mb-4">{course.description}</p>

        <ProgressBar
          value={courseProgress.completed}
          max={courseProgress.total}
          showLabel
          className="mb-3"
        />

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {courseProgress.completed} of {courseProgress.total} lessons completed
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {course.estimatedHours} hours total
          </span>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-navy mb-3">Status Legend:</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green" />
            <span className="text-gray-700">Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-teal" />
            <span className="text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-blue" />
            <span className="text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">Locked</span>
          </div>
        </div>
      </Card>

      {/* Modules & Lessons */}
      <div className="space-y-4">
        {course.modules.map((module, moduleIndex) => {
          const isExpanded = expandedModules.has(module.id);
          const moduleLessons = module.lessons || [];
          const completedInModule = moduleLessons.filter((l) =>
            userProgress.lessonsCompleted.includes(l.id)
          ).length;
          const modulePercentage =
            moduleLessons.length > 0 ? Math.round((completedInModule / moduleLessons.length) * 100) : 0;

          return (
            <Card key={module.id} className="overflow-hidden">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                aria-expanded={isExpanded}
                aria-controls={`module-${module.id}-lessons`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-gray-500">Module {moduleIndex + 1}</span>
                    {modulePercentage === 100 && <CheckCircle className="w-5 h-5 text-green" />}
                  </div>
                  <h2 className="text-lg font-semibold text-navy mb-1">{module.title}</h2>
                  <ProgressBar
                    value={completedInModule}
                    max={moduleLessons.length}
                    showLabel
                    size="sm"
                    className="max-w-xs"
                  />
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Lessons List */}
              {isExpanded && (
                <motion.div
                  id={`module-${module.id}-lessons`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200"
                >
                  <div className="p-4 space-y-3">
                    {moduleLessons.map((lesson, lessonIndex) => {
                      const status = getLessonStatus(lesson);
                      const isRecommended =
                        status === 'available' &&
                        lessonIndex === 0; // Recommend first available lesson

                      return (
                        <div
                          key={lesson.id}
                          className={cn(
                            'p-4 rounded-lg border transition-all',
                            getStatusColor(status),
                            isRecommended && 'ring-2 ring-teal ring-offset-2'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {getStatusIcon(status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-navy">
                                  Lesson {lessonIndex + 1}
                                </span>
                                {isRecommended && (
                                  <span className="px-2 py-0.5 text-xs bg-teal text-white rounded-full">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <h3 className="font-medium text-navy mb-1">{lesson.title}</h3>

                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lesson.estimatedMinutes} min
                                </span>
                                {lesson.atoms && (
                                  <span>{lesson.atoms.length} activities</span>
                                )}
                              </div>

                              {status === 'locked' && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Complete previous lessons to unlock
                                </p>
                              )}

                              {status === 'available' && (
                                <Link href={`/learn?lesson=${lesson.id}`}>
                                  <Button size="sm" className="mt-3">
                                    Start Lesson
                                  </Button>
                                </Link>
                              )}

                              {status === 'in_progress' && (
                                <Link href={`/learn?lesson=${lesson.id}`}>
                                  <Button size="sm" variant="secondary" className="mt-3">
                                    Continue
                                  </Button>
                                </Link>
                              )}

                              {status === 'complete' && (
                                <Link href={`/learn?lesson=${lesson.id}`}>
                                  <Button size="sm" variant="ghost" className="mt-3">
                                    Review
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
