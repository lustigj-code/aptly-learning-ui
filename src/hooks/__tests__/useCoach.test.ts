/**
 * useCoach Hook Tests
 * Phase 7.1: Testing coach interaction hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCoach } from '../useCoach';

// Mock fetch
global.fetch = vi.fn();

// Mock unified store
vi.mock('@/store/unifiedStore', () => ({
  useUnifiedStore: vi.fn(() => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      progress: { currentCourseId: 'course-1' },
    },
    authUser: { uid: 'test-user' },
  })),
}));

describe('useCoach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Great question! What do you already know about this?",
        conversationId: 'conv-123',
        tokensUsed: { input: 50, output: 30 },
      }),
    } as Response);
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() =>
      useCoach({
        lessonId: 'lesson-1',
        currentAtomId: 'atom-1',
      })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sends message and receives response', async () => {
    const { result } = renderHook(() =>
      useCoach({
        lessonId: 'lesson-1',
        currentAtomId: 'atom-1',
      })
    );

    await act(async () => {
      await result.current.sendMessage('What is a lookalike audience?');
    });

    expect(result.current.messages).toHaveLength(2); // User + Coach
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state while waiting for response', async () => {
    let resolvePromise: (value: Response) => void;
    vi.mocked(global.fetch).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() =>
      useCoach({
        lessonId: 'lesson-1',
        currentAtomId: 'atom-1',
      })
    );

    act(() => {
      result.current.sendMessage('Test message');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({
        ok: true,
        json: async () => ({ message: 'Response', conversationId: 'conv-1' }),
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const { result } = renderHook(() =>
      useCoach({
        lessonId: 'lesson-1',
        currentAtomId: 'atom-1',
      })
    );

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('includes context in API request', async () => {
    const { result } = renderHook(() =>
      useCoach({
        lessonId: 'lesson-1',
        currentAtomId: 'atom-1',
        atomType: 'quiz',
        masteryLevel: 75,
      })
    );

    await act(async () => {
      await result.current.sendMessage('Help me');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/coach',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"atomType":"quiz"'),
      })
    );
  });

  it('supports practice feedback type', async () => {
    const { result } = renderHook(() =>
      useCoach({
        lessonId: 'lesson-1',
        currentAtomId: 'atom-practice-1',
        atomType: 'practice',
      })
    );

    await act(async () => {
      await result.current.requestPracticeFeedback('My campaign strategy...');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/coach',
      expect.objectContaining({
        body: expect.stringContaining('"type":"practice_feedback"'),
      })
    );
  });

  it('clears conversation when requested', () => {
    const { result } = renderHook(() =>
      useCoach({
        lessonId: 'lesson-1',
        currentAtomId: 'atom-1',
      })
    );

    act(() => {
      result.current.messages.push({ role: 'user', content: 'Test' });
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearConversation();
    });

    expect(result.current.messages).toEqual([]);
  });
});
