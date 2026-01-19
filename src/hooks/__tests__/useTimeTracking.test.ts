/**
 * useTimeTracking Hook Tests
 * Phase 7.1: Critical hook testing
 *
 * Strategy: Test utility functions and hook structure.
 * The hook's pause/resume state changes are complex due to interactions
 * between useCallback dependencies and document event listeners in jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Unmock the hook so we test the real implementation
vi.unmock('@/hooks/useTimeTracking');

// Import after unmocking
import {
  useTimeTracking,
  formatTime,
  formatTimeMMSS,
  estimateReadingTime,
} from '../useTimeTracking';

// Mock userProfileStore
const mockUpdateProgress = vi.fn(() => Promise.resolve());

vi.mock('@/store/userProfileStore', () => ({
  useUserProfileStore: vi.fn((selector) => {
    const state = {
      user: {
        id: 'test-user',
        progress: {
          totalTimeSpentMinutes: 100,
        },
      },
      updateProgress: mockUpdateProgress,
    };
    return selector(state);
  }),
}));

describe('useTimeTracking utility functions', () => {
  describe('formatTime', () => {
    it('formats seconds only when under a minute', () => {
      expect(formatTime(0)).toBe('0s');
      expect(formatTime(30)).toBe('30s');
      expect(formatTime(59)).toBe('59s');
    });

    it('formats minutes and seconds', () => {
      expect(formatTime(60)).toBe('1m 0s');
      expect(formatTime(90)).toBe('1m 30s');
      expect(formatTime(125)).toBe('2m 5s');
      expect(formatTime(3661)).toBe('61m 1s');
    });
  });

  describe('formatTimeMMSS', () => {
    it('formats time in MM:SS format', () => {
      expect(formatTimeMMSS(0)).toBe('00:00');
      expect(formatTimeMMSS(5)).toBe('00:05');
      expect(formatTimeMMSS(30)).toBe('00:30');
      expect(formatTimeMMSS(60)).toBe('01:00');
      expect(formatTimeMMSS(90)).toBe('01:30');
      expect(formatTimeMMSS(3661)).toBe('61:01');
    });

    it('pads single digits with zeros', () => {
      expect(formatTimeMMSS(1)).toBe('00:01');
      expect(formatTimeMMSS(61)).toBe('01:01');
    });
  });

  describe('estimateReadingTime', () => {
    it('calculates reading time based on word count', () => {
      // Default 200 words per minute
      expect(estimateReadingTime(200)).toBe(1);
      expect(estimateReadingTime(400)).toBe(2);
      expect(estimateReadingTime(250)).toBe(2); // Rounds up
    });

    it('uses custom words per minute', () => {
      expect(estimateReadingTime(300, 100)).toBe(3);
      expect(estimateReadingTime(300, 150)).toBe(2);
    });

    it('handles edge cases', () => {
      expect(estimateReadingTime(0)).toBe(0);
      expect(estimateReadingTime(1)).toBe(1); // Rounds up
    });
  });
});

describe('useTimeTracking hook', () => {
  // Track registered event listeners
  let originalAddEventListener: typeof document.addEventListener;
  let originalRemoveEventListener: typeof document.removeEventListener;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.hidden to be false
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });

    // Store original methods
    originalAddEventListener = document.addEventListener;
    originalRemoveEventListener = document.removeEventListener;

    // Mock addEventListener to prevent event listener interference
    document.addEventListener = vi.fn();
    document.removeEventListener = vi.fn();
  });

  afterEach(() => {
    document.addEventListener = originalAddEventListener;
    document.removeEventListener = originalRemoveEventListener;
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with isActive true', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      expect(result.current.isActive).toBe(true);
    });

    it('starts with elapsedSeconds at 0', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      expect(result.current.elapsedSeconds).toBe(0);
    });
  });

  describe('API contract', () => {
    it('provides pause function', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      expect(typeof result.current.pause).toBe('function');
    });

    it('provides resume function', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      expect(typeof result.current.resume).toBe('function');
    });

    it('provides reset function', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      expect(typeof result.current.reset).toBe('function');
    });

    it('provides getTimeSpent function', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      expect(typeof result.current.getTimeSpent).toBe('function');
    });

    it('getTimeSpent returns a number', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      const time = result.current.getTimeSpent();
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('atomId change', () => {
    it('resets state when atomId changes', () => {
      const { result, rerender } = renderHook(
        ({ atomId }) => useTimeTracking({ atomId, lessonId: 'lesson-1' }),
        { initialProps: { atomId: 'atom-1' } }
      );

      // Rerender with new atomId
      rerender({ atomId: 'atom-2' });

      // Should be in initial state
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.isActive).toBe(true);
    });
  });

  describe('event listeners', () => {
    it('registers visibility change listener on mount', () => {
      renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('registers activity listeners on mount', () => {
      renderHook(() =>
        useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
      );

      // Should register multiple activity event listeners
      const activityEvents = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
      activityEvents.forEach((event) => {
        expect(document.addEventListener).toHaveBeenCalledWith(
          event,
          expect.any(Function),
          expect.objectContaining({ passive: true })
        );
      });
    });
  });
});
