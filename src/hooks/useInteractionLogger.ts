'use client';

import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useUnifiedStore } from '@/store/unifiedStore';
import type { InteractionType, InteractionLogInput, AtomType, DeviceType } from '@/types';

/**
 * Detect device type based on screen width and user agent
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();

  // Check user agent for mobile/tablet indicators
  const isMobileUA = /iphone|ipod|android.*mobile|windows phone|blackberry/i.test(userAgent);
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);

  // Combine UA and screen width for better detection
  if (isMobileUA || width < 640) {
    return 'mobile';
  } else if (isTabletUA || (width >= 640 && width < 1024)) {
    return 'tablet';
  }
  return 'desktop';
}

// Types for logging functions
type QuizAnswerParams = {
  questionId: string;
  skillId: string;
  skillName: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  responseTimeMs: number;
  attemptNumber: number;
  questionDifficulty?: number;
  pMasteryBefore: number;
  pMasteryAfter: number;
};

type PracticeResponseParams = {
  skillId: string;
  skillName: string;
  isCorrect?: boolean;
  responseTimeMs: number;
  attemptNumber: number;
  pMasteryBefore: number;
  pMasteryAfter: number;
};

type ContentViewParams = {
  atomId: string;
  atomType: AtomType;
  viewDurationMs: number;
};

type HintRequestParams = {
  atomId: string;
  skillId: string;
  questionId?: string;
  hintsUsedBefore: number;
};

type CoachInteractionParams = {
  message: string;
  skillId?: string;
};

type ReviewAttemptParams = {
  skillId: string;
  skillName: string;
  isCorrect: boolean;
  responseTimeMs: number;
  attemptNumber: number;
  pMasteryBefore: number;
  pMasteryAfter: number;
};

// Session management
const SESSION_KEY = 'aptly_learning_session';
const BATCH_FLUSH_INTERVAL = 10000; // 10 seconds
const MAX_BATCH_SIZE = 50;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-session';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Hook for logging learning interactions to train ML models
 * Batches interactions client-side and flushes periodically to API
 */
export function useInteractionLogger() {
  const batchRef = useRef<InteractionLogInput[]>([]);
  const lastAttemptTimeRef = useRef<Record<string, number>>({});
  const consecutiveWrongRef = useRef<Record<string, number>>({});
  const hintsUsedRef = useRef<Record<string, number>>({});

  const user = useUnifiedStore((state) => state.user);
  const authUser = useUnifiedStore((state) => state.authUser);

  // Memoize device type (only detect once per session)
  const deviceType = useMemo(() => detectDeviceType(), []);

  // Get current learning context from store
  const currentCourseId = user?.progress?.currentCourseId || 'unknown';
  const currentModuleId = user?.progress?.currentModuleId || 'unknown';
  const currentLessonId = user?.progress?.currentLessonId || 'unknown';
  const currentAtomId = user?.progress?.currentAtomId || 'unknown';

  // Flush batch to API
  const flushBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const batch = [...batchRef.current];
    batchRef.current = [];

    try {
      const response = await fetch('/api/interactions/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactions: batch }),
      });

      if (!response.ok) {
        console.error('Failed to log interactions:', response.status);
        // Put failed items back in batch for retry
        batchRef.current = [...batch, ...batchRef.current];
      }
    } catch (error) {
      console.error('Error flushing interaction batch:', error);
      // Put failed items back in batch for retry
      batchRef.current = [...batch, ...batchRef.current];
    }
  }, []);

  // Add interaction to batch
  const addToBatch = useCallback(
    (interaction: Omit<InteractionLogInput, 'userId' | 'sessionId' | 'experimentVariants' | 'deviceType'>) => {
      const userId = authUser?.uid;
      if (!userId) {
        console.warn('Cannot log interaction: No authenticated user');
        return;
      }

      const fullInteraction: InteractionLogInput = {
        ...interaction,
        userId,
        sessionId: getOrCreateSessionId(),
        experimentVariants: {}, // TODO: Get from experiment store when integrated
        deviceType,
      };

      batchRef.current.push(fullInteraction);

      // Flush if batch is full
      if (batchRef.current.length >= MAX_BATCH_SIZE) {
        flushBatch();
      }
    },
    [authUser, flushBatch, deviceType]
  );

  // Calculate time gap from last attempt on this skill
  const getTimeGap = useCallback((skillId: string): number | undefined => {
    const lastTime = lastAttemptTimeRef.current[skillId];
    if (!lastTime) return undefined;
    return Date.now() - lastTime;
  }, []);

  // Update last attempt time
  const updateLastAttemptTime = useCallback((skillId: string) => {
    lastAttemptTimeRef.current[skillId] = Date.now();
  }, []);

  // Track consecutive wrong answers
  const updateConsecutiveWrong = useCallback((skillId: string, isCorrect: boolean) => {
    if (isCorrect) {
      consecutiveWrongRef.current[skillId] = 0;
    } else {
      consecutiveWrongRef.current[skillId] = (consecutiveWrongRef.current[skillId] || 0) + 1;
    }
  }, []);

  // Log quiz answer
  const logQuizAnswer = useCallback(
    (params: QuizAnswerParams) => {
      const {
        questionId,
        skillId,
        skillName,
        isCorrect,
        selectedAnswer,
        correctAnswer,
        responseTimeMs,
        attemptNumber,
        questionDifficulty,
        pMasteryBefore,
        pMasteryAfter,
      } = params;

      updateConsecutiveWrong(skillId, isCorrect);

      addToBatch({
        courseId: currentCourseId,
        moduleId: currentModuleId,
        lessonId: currentLessonId,
        atomId: currentAtomId,
        atomType: 'quiz',
        skillId,
        skillName,
        questionId,
        interactionType: 'quiz_answer' as InteractionType,
        isCorrect,
        selectedAnswer,
        correctAnswer,
        responseTimeMs,
        timeGapFromLastAttempt: getTimeGap(skillId),
        attemptNumber,
        consecutiveWrongOnSkill: consecutiveWrongRef.current[skillId] || 0,
        hintsUsedBefore: hintsUsedRef.current[currentAtomId] || 0,
        questionDifficulty,
        pMasteryBefore,
        pMasteryAfter,
      });

      updateLastAttemptTime(skillId);
    },
    [
      addToBatch,
      currentCourseId,
      currentModuleId,
      currentLessonId,
      currentAtomId,
      getTimeGap,
      updateLastAttemptTime,
      updateConsecutiveWrong,
    ]
  );

  // Log practice response
  const logPracticeResponse = useCallback(
    (params: PracticeResponseParams) => {
      const { skillId, skillName, isCorrect, responseTimeMs, attemptNumber, pMasteryBefore, pMasteryAfter } =
        params;

      if (isCorrect !== undefined) {
        updateConsecutiveWrong(skillId, isCorrect);
      }

      addToBatch({
        courseId: currentCourseId,
        moduleId: currentModuleId,
        lessonId: currentLessonId,
        atomId: currentAtomId,
        atomType: 'practice',
        skillId,
        skillName,
        interactionType: 'practice_response' as InteractionType,
        isCorrect,
        responseTimeMs,
        timeGapFromLastAttempt: getTimeGap(skillId),
        attemptNumber,
        consecutiveWrongOnSkill: consecutiveWrongRef.current[skillId] || 0,
        hintsUsedBefore: hintsUsedRef.current[currentAtomId] || 0,
        pMasteryBefore,
        pMasteryAfter,
      });

      updateLastAttemptTime(skillId);
    },
    [
      addToBatch,
      currentCourseId,
      currentModuleId,
      currentLessonId,
      currentAtomId,
      getTimeGap,
      updateLastAttemptTime,
      updateConsecutiveWrong,
    ]
  );

  // Log content view
  const logContentView = useCallback(
    ({ atomId, atomType, viewDurationMs }: ContentViewParams) => {
      addToBatch({
        courseId: currentCourseId,
        moduleId: currentModuleId,
        lessonId: currentLessonId,
        atomId,
        atomType,
        skillId: 'content-view',
        skillName: 'Content Consumption',
        interactionType: 'content_view' as InteractionType,
        responseTimeMs: viewDurationMs,
        attemptNumber: 1,
        consecutiveWrongOnSkill: 0,
        hintsUsedBefore: 0,
        pMasteryBefore: 0,
        pMasteryAfter: 0,
      });
    },
    [addToBatch, currentCourseId, currentModuleId, currentLessonId]
  );

  // Log hint request
  const logHintRequest = useCallback(
    ({ atomId, skillId, questionId, hintsUsedBefore }: HintRequestParams) => {
      hintsUsedRef.current[atomId] = hintsUsedBefore + 1;

      addToBatch({
        courseId: currentCourseId,
        moduleId: currentModuleId,
        lessonId: currentLessonId,
        atomId,
        atomType: 'quiz',
        skillId,
        skillName: 'Hint Request',
        questionId,
        interactionType: 'hint_request' as InteractionType,
        responseTimeMs: 0,
        attemptNumber: 1,
        consecutiveWrongOnSkill: consecutiveWrongRef.current[skillId] || 0,
        hintsUsedBefore,
        pMasteryBefore: 0,
        pMasteryAfter: 0,
      });
    },
    [addToBatch, currentCourseId, currentModuleId, currentLessonId]
  );

  // Log coach interaction
  const logCoachInteraction = useCallback(
    ({ message, skillId }: CoachInteractionParams) => {
      addToBatch({
        courseId: currentCourseId,
        moduleId: currentModuleId,
        lessonId: currentLessonId,
        atomId: currentAtomId,
        atomType: 'practice',
        skillId: skillId || 'coach-interaction',
        skillName: 'Coach Interaction',
        interactionType: 'coach_interaction' as InteractionType,
        responseTimeMs: message.length * 10, // Rough typing time estimate
        attemptNumber: 1,
        consecutiveWrongOnSkill: 0,
        hintsUsedBefore: 0,
        pMasteryBefore: 0,
        pMasteryAfter: 0,
      });
    },
    [addToBatch, currentCourseId, currentModuleId, currentLessonId, currentAtomId]
  );

  // Log review attempt
  const logReviewAttempt = useCallback(
    (params: ReviewAttemptParams) => {
      const { skillId, skillName, isCorrect, responseTimeMs, attemptNumber, pMasteryBefore, pMasteryAfter } =
        params;

      updateConsecutiveWrong(skillId, isCorrect);

      addToBatch({
        courseId: currentCourseId,
        moduleId: currentModuleId,
        lessonId: currentLessonId,
        atomId: currentAtomId,
        atomType: 'quiz',
        skillId,
        skillName,
        interactionType: 'review_attempt' as InteractionType,
        isCorrect,
        responseTimeMs,
        timeGapFromLastAttempt: getTimeGap(skillId),
        attemptNumber,
        consecutiveWrongOnSkill: consecutiveWrongRef.current[skillId] || 0,
        hintsUsedBefore: hintsUsedRef.current[currentAtomId] || 0,
        pMasteryBefore,
        pMasteryAfter,
      });

      updateLastAttemptTime(skillId);
    },
    [
      addToBatch,
      currentCourseId,
      currentModuleId,
      currentLessonId,
      currentAtomId,
      getTimeGap,
      updateLastAttemptTime,
      updateConsecutiveWrong,
    ]
  );

  // Periodic flush interval
  useEffect(() => {
    const intervalId = setInterval(flushBatch, BATCH_FLUSH_INTERVAL);

    // Flush on unmount
    return () => {
      clearInterval(intervalId);
      flushBatch();
    };
  }, [flushBatch]);

  // Flush on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronous flush using sendBeacon if available
      if (batchRef.current.length > 0 && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/interactions/log',
          JSON.stringify({ interactions: batchRef.current })
        );
        batchRef.current = [];
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    logQuizAnswer,
    logPracticeResponse,
    logContentView,
    logHintRequest,
    logCoachInteraction,
    logReviewAttempt,
    flushBatch, // Manual flush if needed
  };
}
