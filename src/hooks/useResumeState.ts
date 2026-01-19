/**
 * useResumeState Hook
 *
 * Manages resume state for mid-content resume functionality.
 * Saves video timestamp, quiz position, scroll position, etc.
 * so users can pick up exactly where they left off.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase/config';
import type { ResumeState } from '@/lib/firebase/schema';

// Debounce delay for saving resume state (ms)
const SAVE_DEBOUNCE_MS = 1000;

export type UseResumeStateResult = {
  // Current resume state
  resumeState: Partial<ResumeState> | null;
  isLoading: boolean;

  // Actions for different atom types
  saveVideoTimestamp: (atomId: string, timestamp: number) => void;
  saveQuizProgress: (atomId: string, questionIndex: number, answers: Record<string, string>) => void;
  saveScrollPosition: (atomId: string, scrollPercent: number) => void;
  savePracticeResponse: (atomId: string, response: string) => void;

  // Clear resume state (after completing an atom)
  clearResumeState: () => Promise<void>;
};

export function useResumeState(userId: string | null): UseResumeStateResult {
  const [resumeState, setResumeState] = useState<Partial<ResumeState> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Partial<ResumeState> | null>(null);

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    if (!userId || !pendingUpdateRef.current) return;

    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();

      await fetch('/api/progress/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          resumeState: pendingUpdateRef.current,
        }),
      });
    } catch (error) {
      console.error('Error saving resume state:', error);
    }
  }, [userId]);

  // Schedule a debounced save
  const scheduleSave = useCallback(
    (update: Partial<ResumeState>) => {
      pendingUpdateRef.current = { ...pendingUpdateRef.current, ...update };
      setResumeState((prev) => ({ ...prev, ...update }));

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule new save
      saveTimeoutRef.current = setTimeout(debouncedSave, SAVE_DEBOUNCE_MS);
    },
    [debouncedSave]
  );

  // Save video timestamp
  const saveVideoTimestamp = useCallback(
    (atomId: string, timestamp: number) => {
      scheduleSave({
        atomId,
        atomType: 'video',
        videoTimestamp: timestamp,
        quizQuestionIndex: null,
        quizAnswers: null,
        scrollPosition: null,
        practiceResponse: null,
      });
    },
    [scheduleSave]
  );

  // Save quiz progress
  const saveQuizProgress = useCallback(
    (atomId: string, questionIndex: number, answers: Record<string, string>) => {
      scheduleSave({
        atomId,
        atomType: 'quiz',
        videoTimestamp: null,
        quizQuestionIndex: questionIndex,
        quizAnswers: answers,
        scrollPosition: null,
        practiceResponse: null,
      });
    },
    [scheduleSave]
  );

  // Save scroll position for reading content
  const saveScrollPosition = useCallback(
    (atomId: string, scrollPercent: number) => {
      scheduleSave({
        atomId,
        atomType: 'reading',
        videoTimestamp: null,
        quizQuestionIndex: null,
        quizAnswers: null,
        scrollPosition: scrollPercent,
        practiceResponse: null,
      });
    },
    [scheduleSave]
  );

  // Save practice response draft
  const savePracticeResponse = useCallback(
    (atomId: string, response: string) => {
      scheduleSave({
        atomId,
        atomType: 'practice',
        videoTimestamp: null,
        quizQuestionIndex: null,
        quizAnswers: null,
        scrollPosition: null,
        practiceResponse: response,
      });
    },
    [scheduleSave]
  );

  // Clear resume state (after completing an atom)
  const clearResumeState = useCallback(async () => {
    if (!userId) return;

    // Clear pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    pendingUpdateRef.current = null;
    setResumeState(null);

    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();

      await fetch('/api/progress/resume', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Error clearing resume state:', error);
    }
  }, [userId]);

  // Fetch initial resume state
  useEffect(() => {
    if (!userId) {
      setResumeState(null);
      return;
    }

    const fetchResumeState = async () => {
      setIsLoading(true);
      try {
        const currentUser = auth?.currentUser;
        if (!currentUser) {
          setIsLoading(false);
          return;
        }

        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/progress/resume?userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.resumeState) {
            setResumeState(data.resumeState);
          }
        }
      } catch (error) {
        console.error('Error fetching resume state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumeState();
  }, [userId]);

  // Save pending state on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Immediately save any pending state
      if (pendingUpdateRef.current && userId) {
        debouncedSave();
      }
    };
  }, [debouncedSave, userId]);

  return {
    resumeState,
    isLoading,
    saveVideoTimestamp,
    saveQuizProgress,
    saveScrollPosition,
    savePracticeResponse,
    clearResumeState,
  };
}

/**
 * Hook to check if we should restore resume state on component mount
 */
export function useShouldRestore(
  atomId: string,
  resumeState: Partial<ResumeState> | null
): {
  shouldRestore: boolean;
  videoTimestamp: number | null;
  quizQuestionIndex: number | null;
  quizAnswers: Record<string, string> | null;
  scrollPosition: number | null;
  practiceResponse: string | null;
} {
  if (!resumeState || resumeState.atomId !== atomId) {
    return {
      shouldRestore: false,
      videoTimestamp: null,
      quizQuestionIndex: null,
      quizAnswers: null,
      scrollPosition: null,
      practiceResponse: null,
    };
  }

  return {
    shouldRestore: true,
    videoTimestamp: resumeState.videoTimestamp ?? null,
    quizQuestionIndex: resumeState.quizQuestionIndex ?? null,
    quizAnswers: resumeState.quizAnswers ?? null,
    scrollPosition: resumeState.scrollPosition ?? null,
    practiceResponse: resumeState.practiceResponse ?? null,
  };
}

export default useResumeState;
