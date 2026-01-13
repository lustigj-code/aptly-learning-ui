'use client';

import { useRef, useEffect } from 'react';
import { useInteractionLogger } from './useInteractionLogger';
import type { AtomType } from '@/types';

/**
 * Hook for automatic content view logging on component unmount
 *
 * Encapsulates the common pattern of:
 * 1. Recording view start time
 * 2. Logging content view duration on unmount
 *
 * Part of Phase 23: Hook Extraction
 *
 * @example
 * function ReadingAtom({ atom }) {
 *   useContentViewLogging(atom.id, 'reading');
 *   // ... component logic
 * }
 */
export function useContentViewLogging(atomId: string, atomType: AtomType) {
  const { logContentView } = useInteractionLogger();

  // Track view start time - initialized in useEffect to avoid impure render
  const viewStartTimeRef = useRef<number>(0);
  const hasLoggedViewRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize/reset refs when atomId changes
    const startTime = Date.now();
    viewStartTimeRef.current = startTime;
    hasLoggedViewRef.current = false;

    return () => {
      // Log content view on unmount if not already logged
      if (!hasLoggedViewRef.current) {
        const viewDurationMs = Date.now() - startTime;
        logContentView({
          atomId,
          atomType,
          viewDurationMs,
        });
        hasLoggedViewRef.current = true;
      }
    };
  }, [atomId, atomType, logContentView]);

  // Return a manual log function for cases where you need to log before unmount
  const logNow = () => {
    if (!hasLoggedViewRef.current) {
      const viewDurationMs = Date.now() - viewStartTimeRef.current;
      logContentView({
        atomId,
        atomType,
        viewDurationMs,
      });
      hasLoggedViewRef.current = true;
    }
  };

  return { logNow };
}

export default useContentViewLogging;
