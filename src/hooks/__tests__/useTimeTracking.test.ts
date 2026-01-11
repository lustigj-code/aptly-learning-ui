/**
 * useTimeTracking Hook Tests
 * Phase 7.1: Critical hook testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTimeTracking } from '../useTimeTracking';

// Mock unifiedStore
vi.mock('@/store/unifiedStore', () => ({
  useUnifiedStore: vi.fn(() => ({
    user: {
      id: 'test-user',
      progress: {
        totalTimeSpentMinutes: 100,
      },
    },
    updateProgress: vi.fn(() => Promise.resolve()),
  })),
}));

describe('useTimeTracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts tracking time on mount', () => {
    const { result } = renderHook(() =>
      useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
    );

    expect(result.current.isActive).toBe(true);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('increments elapsed time every second', () => {
    const { result } = renderHook(() =>
      useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
    );

    act(() => {
      vi.advanceTimersByTime(3000); // 3 seconds
    });

    expect(result.current.elapsedSeconds).toBe(3);
  });

  it('pauses when pause() is called', () => {
    const { result } = renderHook(() =>
      useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
    );

    act(() => {
      vi.advanceTimersByTime(2000); // 2 seconds
    });

    expect(result.current.elapsedSeconds).toBe(2);

    act(() => {
      result.current.pause();
    });

    expect(result.current.isActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3000); // 3 more seconds
    });

    // Should still be 2 (paused)
    expect(result.current.elapsedSeconds).toBe(2);
  });

  it('resumes when resume() is called', () => {
    const { result } = renderHook(() =>
      useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
      result.current.pause();
      vi.advanceTimersByTime(1000); // Paused time
      result.current.resume();
      vi.advanceTimersByTime(2000); // 2 more active seconds
    });

    expect(result.current.elapsedSeconds).toBe(4); // 2 + 2 (excluding paused 1s)
  });

  it('resets time when reset() is called', () => {
    const { result } = renderHook(() =>
      useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBe(5);

    act(() => {
      result.current.reset();
    });

    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('resets on atomId change', () => {
    const { result, rerender } = renderHook(
      ({ atomId }) => useTimeTracking({ atomId, lessonId: 'lesson-1' }),
      {
        initialProps: { atomId: 'atom-1' },
      }
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBe(5);

    // Change atomId
    rerender({ atomId: 'atom-2' });

    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('calls onTimeUpdate callback', () => {
    const onTimeUpdate = vi.fn();

    renderHook(() =>
      useTimeTracking({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        onTimeUpdate,
      })
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTimeUpdate).toHaveBeenCalledWith(3);
  });

  it('syncs to store at intervals', async () => {
    const { useUnifiedStore } = await import('@/store/unifiedStore');
    const updateProgress = vi.fn(() => Promise.resolve());

    vi.mocked(useUnifiedStore).mockReturnValue({
      user: {
        id: 'test-user',
        progress: { totalTimeSpentMinutes: 100 },
      },
      updateProgress,
    } as unknown as ReturnType<typeof useUnifiedStore>);

    renderHook(() =>
      useTimeTracking({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        syncIntervalSeconds: 30,
      })
    );

    // Advance past sync interval (30 seconds)
    act(() => {
      vi.advanceTimersByTime(31000);
    });

    await waitFor(() => {
      expect(updateProgress).toHaveBeenCalled();
    });
  });

  it('pauses after maxIdleSeconds', () => {
    const { result } = renderHook(() =>
      useTimeTracking({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        maxIdleSeconds: 60,
      })
    );

    // Simulate idle (no activity for 61 seconds)
    act(() => {
      vi.advanceTimersByTime(61000);
    });

    expect(result.current.isActive).toBe(false);
  });

  it('getTimeSpent returns current elapsed time', () => {
    const { result } = renderHook(() =>
      useTimeTracking({ atomId: 'atom-1', lessonId: 'lesson-1' })
    );

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(result.current.getTimeSpent()).toBe(7);
  });
});
