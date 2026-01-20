/**
 * useCoach Hook Tests
 * Phase 7.1: Testing coach interaction hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Unmock useCoach since we want to test the actual implementation
vi.unmock('@/hooks/useCoach');

// Mock fetch globally before any imports
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockSessionStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockSessionStorage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
    }),
  },
  writable: true,
});

// Mock useUser from unifiedStore - the hook depends on this
vi.mock('@/store/unifiedStore', () => ({
  useUser: vi.fn(() => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      progress: { currentCourseId: 'course-1' },
    },
    isLoading: false,
    error: null,
  })),
  useUnifiedStore: vi.fn((selector) => {
    const state = {
      user: {
        id: 'test-user',
        name: 'Test User',
        progress: { currentCourseId: 'course-1' },
      },
      isUserLoading: false,
      userError: null,
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  }),
}));

// Import the hook after mocks are set up
import { useCoach } from '../useCoach';

describe('useCoach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear session storage mock
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);

    // Default mock for fetch - returns successful response with conversationId
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Great question! What do you already know about this?",
        conversationId: 'conv-123',
        tokensUsed: { input: 50, output: 30 },
      }),
    } as Response);
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useCoach());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sends message and receives response', async () => {
    const { result } = renderHook(() => useCoach());

    await act(async () => {
      await result.current.sendMessage('What is a lookalike audience?');
    });

    // Should have user message + assistant response
    expect(result.current.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state while waiting for response', async () => {
    let resolvePromise: (value: Response) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() => useCoach());

    // Start sending message (don't await)
    act(() => {
      result.current.sendMessage('Test message');
    });

    // Check loading state is true while waiting
    expect(result.current.isLoading).toBe(true);

    // Resolve the fetch promise
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({ message: 'Response', conversationId: 'conv-1' }),
      } as Response);
    });

    // Wait for loading to finish
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error', message: 'Server error' }),
    } as Response);

    const { result } = renderHook(() => useCoach());

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    // Hook should set error state
    expect(result.current.error).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    // Hook also adds a fallback message from coach on error
    expect(result.current.messages.length).toBeGreaterThan(0);
  });

  it('includes context in API request', async () => {
    const { result } = renderHook(() => useCoach());

    await act(async () => {
      await result.current.sendMessage('Help me', 'quiz_help', {
        currentAtom: 'atom-1',
        atomType: 'quiz',
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/coach',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"atomType":"quiz"'),
      })
    );
  });

  it('supports practice feedback type', async () => {
    const { result } = renderHook(() => useCoach());

    await act(async () => {
      await result.current.getPracticeFeedback('My campaign strategy...');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/coach',
      expect.objectContaining({
        body: expect.stringContaining('"type":"practice_feedback"'),
      })
    );
  });

  it('clears conversation when requested', async () => {
    const { result } = renderHook(() => useCoach());

    // First add a message by sending one
    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    // Verify messages were added
    expect(result.current.messages.length).toBeGreaterThan(0);

    // Clear messages
    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });
});
