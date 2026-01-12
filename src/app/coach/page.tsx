'use client';

import { useState, useCallback, useRef } from 'react';
import { useUser } from '@/store/unifiedStore';
import { MainCoachChat, type QuizQuestion, type Answer } from '@/components/coach/MainCoachChat';
import { useFlowController } from '@/hooks/useFlowController';
import { InlineContentBlock } from '@/components/coach/InlineContentBlock';
import { motion } from 'framer-motion';
import { Play, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Atom } from '@/types';
import {
  ReviewChallengeBadge,
  ReviewChallengeAnnouncement,
  ReviewContextInfo,
} from '@/components/learning/ReviewChallengeBadge';
import {
  SessionQueueDisplay,
  SessionProgressBar,
} from '@/components/learning/SessionQueueDisplay';

/**
 * Coach Page with Flow-Driven Learning
 *
 * The coach orchestrates sequential learning through conversations.
 * Content (videos, readings, quizzes) appears inline in the chat.
 * Progress is tracked and persisted via the flow controller.
 */

export default function CoachPage() {
  const { user, isLoading: userLoading } = useUser();
  const {
    flowState,
    isLoading: flowLoading,
    startFlow,
    advanceFlow,
    recordQuizAnswer,
    // refreshState available if needed
  } = useFlowController();

  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const chatApiRef = useRef<{ addQuizToChat: (q: QuizQuestion, intro?: string) => string } | null>(null);

  // Track if we have an active flow
  const flowIsActive = flowState?.state &&
    flowState.state !== 'idle' &&
    flowState.state !== 'complete';

  // Handle starting a new learning session
  const handleStartSession = useCallback(async () => {
    setHasStartedSession(true);
    const success = await startFlow({ sessionLength: 'medium' });
    if (success) {
      setShowContent(true);
    }
  }, [startFlow]);

  // Handle resuming an existing session
  const handleResumeSession = useCallback(() => {
    setHasStartedSession(true);
    setShowContent(true);
  }, []);

  // Handle content completion (video watched, reading finished)
  const handleContentComplete = useCallback(async (atomId: string, score?: number) => {
    await advanceFlow({
      atomId,
      score,
    });
  }, [advanceFlow]);

  // Handle quiz answer from InlineQuiz component
  const handleQuizAnswer = useCallback(async (answer: Answer) => {
    await recordQuizAnswer({
      questionId: answer.questionId,
      selected: answer.selected,
      isCorrect: answer.isCorrect,
    });

    // If there's a current item, mark it as complete
    const currentItem = flowState?.currentItem;
    if (currentItem) {
      await advanceFlow({
        atomId: currentItem.itemId || answer.questionId,
        score: answer.isCorrect ? 100 : 0,
      });
    }
  }, [recordQuizAnswer, advanceFlow, flowState]);

  // Store chat API reference
  const handleChatReady = useCallback((api: { addQuizToChat: (q: QuizQuestion, intro?: string) => string }) => {
    chatApiRef.current = api;
  }, []);

  // Show loading state while initializing
  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex-shrink-0 p-4 border-b border-grey/20">
          <div className="h-10 w-48 bg-grey/20 rounded-lg animate-pulse" />
        </header>
        <main className="flex-1 p-4">
          <div className="space-y-4">
            <div className="h-16 w-3/4 bg-grey/10 rounded-2xl animate-pulse" />
            <div className="h-16 w-1/2 bg-grey/10 rounded-2xl animate-pulse ml-auto" />
          </div>
        </main>
        <footer className="flex-shrink-0 p-4 border-t border-grey/20">
          <div className="h-14 bg-grey/10 rounded-xl animate-pulse" />
        </footer>
      </div>
    );
  }

  // Determine what to show for the easy start section
  const renderEasyStartOrContent = () => {
    // If flow is loading, show loading state
    if (flowLoading) {
      return (
        <div className="bg-gradient-to-r from-teal/10 to-purple/10 rounded-xl p-4 border border-teal/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-teal" />
            <span className="text-sm text-navy">Loading your progress...</span>
          </div>
        </div>
      );
    }

    // If session is active and we're showing content, render current content
    if (showContent && flowIsActive && flowState?.currentItem) {
      const item = flowState.currentItem;
      const isReviewChallenge = item.isReviewChallenge || item.type === 'review';

      // Convert session item to atom format for InlineContentBlock
      // Map session item type to atom type (some types differ)
      const atomType = item.type === 'learn' ? 'reading'
        : item.type === 'review' ? 'reading'
        : item.type === 'warmup' ? 'reading'
        : item.type === 'cooldown' ? 'reading'
        : item.type as 'video' | 'reading' | 'quiz' | 'practice';

      // Provide minimal content based on type
      // In production, this would load actual content from the course data
      const defaultContent = atomType === 'reading'
        ? { body: `Learning content for: ${item.reason}`, highlights: [] }
        : atomType === 'video'
        ? { videoUrl: '', transcript: '', duration: item.estimatedMinutes * 60, chapters: [], keyTakeaways: [] }
        : atomType === 'quiz'
        ? { questions: [], passingScore: 70 }
        : { type: 'exercise' as const, prompt: item.reason, context: '', expectedOutcomes: [] };

      const atom = {
        id: item.itemId || `item-${flowState.progress.completed}`,
        lessonId: item.skillId || 'flow-session',
        type: atomType,
        title: item.reason || `Content ${flowState.progress.completed + 1}`,
        estimatedMinutes: item.estimatedMinutes || 5,
        isRequired: true,
        masteryThreshold: 70,
        content: defaultContent,
      } as Atom;

      // Calculate days since review from metadata (mock for now)
      const daysSinceReview = item.metadata?.retrievability
        ? Math.round((1 - item.metadata.retrievability) * 30) // Rough estimate
        : undefined;
      const lastMasteryLevel = item.metadata?.retrievability
        ? Math.round(item.metadata.retrievability * 100)
        : undefined;

      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Session Queue Display */}
          {flowState.allItems.length > 0 && (
            <SessionQueueDisplay
              items={flowState.allItems}
              currentIndex={flowState.currentIndex}
              estimatedMinutes={flowState.estimatedMinutes}
              defaultCollapsed={true}
            />
          )}

          {/* Progress bar (compact) */}
          {flowState.allItems.length > 0 && (
            <SessionProgressBar
              items={flowState.allItems}
              currentIndex={flowState.currentIndex}
            />
          )}

          {/* Review Challenge Badge and Context */}
          {isReviewChallenge && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ReviewChallengeBadge
                  daysSinceReview={daysSinceReview}
                  lastMasteryLevel={lastMasteryLevel}
                  isExamMode={user?.preferences?.examModeEnabled}
                  size="md"
                />
                <ReviewChallengeAnnouncement
                  skillName={item.reason || 'this concept'}
                  daysSinceReview={daysSinceReview}
                />
              </div>
              <ReviewContextInfo
                daysSinceReview={daysSinceReview}
                lastMasteryLevel={lastMasteryLevel}
                isExamMode={user?.preferences?.examModeEnabled}
              />
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex items-center justify-between text-xs text-rich-black/60 px-1">
            <div className="flex items-center gap-2">
              <span>
                Step {flowState.progress.completed + 1} of {flowState.progress.total}
              </span>
              {isReviewChallenge && (
                <span className="text-amber-600 font-medium">Review</span>
              )}
            </div>
            <span>{flowState.progress.percentage}% complete</span>
          </div>

          {/* Content block */}
          <InlineContentBlock
            atom={atom}
            onComplete={handleContentComplete}
            onQuizAnswer={(questionId, isCorrect) => {
              handleQuizAnswer({
                questionId,
                selected: '', // Will be filled by InlineContentBlock
                isCorrect,
              });
            }}
            isActive={true}
          />
        </motion.div>
      );
    }

    // If session complete, show completion message
    if (flowState?.state === 'complete') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-500/10 to-teal/10 rounded-xl p-4 border border-green-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-navy">Session Complete!</p>
              <p className="text-xs text-rich-black/60">
                {flowState.sessionStats.itemsCompleted} items completed
                {flowState.sessionStats.totalQuestions > 0 && (
                  <> • {Math.round((flowState.sessionStats.correctAnswers / flowState.sessionStats.totalQuestions) * 100)}% accuracy</>
                )}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartSession}
            >
              Start New Session
            </Button>
          </div>
        </motion.div>
      );
    }

    // If flow is paused, show resume option
    if (flowState?.state === 'paused') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow/10 to-orange-500/10 rounded-xl p-4 border border-yellow/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow/20 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-navy">Session Paused</p>
              <p className="text-xs text-rich-black/60">
                {flowState.progress.completed} of {flowState.progress.total} completed
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResumeSession}
            >
              Resume
            </Button>
          </div>
        </motion.div>
      );
    }

    // If idle or hasn't started, show start session prompt
    if (!hasStartedSession && flowState?.state === 'idle') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal/10 to-purple/10 rounded-xl p-4 border border-teal/20"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleStartSession}
              className="flex-shrink-0 w-12 h-12 bg-teal rounded-xl flex items-center justify-center text-white hover:bg-teal/90 transition-colors shadow-md"
            >
              <Play size={20} className="ml-0.5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-teal font-semibold uppercase tracking-wide mb-0.5">
                Ready to learn?
              </p>
              <p className="text-sm font-medium text-navy">
                Start a guided learning session
              </p>
              <p className="text-xs text-rich-black/60 mt-0.5">
                ~30 min • Videos, readings & quizzes
              </p>
            </div>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MainCoachChat
        onMessageSent={() => setHasStartedSession(true)}
        easyStartSection={renderEasyStartOrContent()}
        onQuizAnswer={handleQuizAnswer}
        onReady={handleChatReady}
        lessonContext={{
          currentCourse: 'Course 3: Fundamentals of Social Media Advertising',
          currentModule: 'Module 1',
          currentLesson: flowState?.currentItem?.reason || 'Learning Session',
          atomType: flowState?.currentItem?.type || 'reading',
        }}
      />
    </div>
  );
}
