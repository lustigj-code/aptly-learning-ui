'use client';

/**
 * useStreamingResponse Hook
 *
 * Client-side hook for consuming SSE (Server-Sent Events) streaming responses
 * from the AI coach endpoint. Provides character-by-character streaming with
 * abort capability and error handling.
 *
 * Usage:
 * ```tsx
 * const { content, isStreaming, error, startStream, stopStream } = useStreamingResponse();
 *
 * // Start streaming
 * await startStream("Help me understand this concept", { lessonId: "123" });
 *
 * // Content updates in real-time as characters arrive
 * <p>{content}</p>
 *
 * // Stop streaming early if needed
 * stopStream();
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface StreamingState {
  /** Accumulated content from the stream */
  content: string;
  /** Whether streaming is currently in progress */
  isStreaming: boolean;
  /** Error message if stream failed */
  error: string | null;
}

export interface StreamContext {
  /** Lesson ID for context */
  lessonId?: string;
  /** Atom ID for context */
  atomId?: string;
  /** Course ID */
  courseId?: string;
  /** Module ID */
  moduleId?: string;
  /** User's current mastery level */
  masteryLevel?: number;
  /** Previous conversation messages */
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface UseStreamingResponseReturn extends StreamingState {
  /** Start a new streaming response */
  startStream: (message: string, context?: StreamContext) => Promise<void>;
  /** Stop the current stream */
  stopStream: () => void;
  /** Reset the state to initial values */
  reset: () => void;
}

const INITIAL_STATE: StreamingState = {
  content: '',
  isStreaming: false,
  error: null,
};

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [state, setState] = useState<StreamingState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount to prevent memory leaks and state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Abort any in-flight requests when component unmounts
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  // Safe setState that checks if component is still mounted
  const safeSetState = useCallback((updater: StreamingState | ((prev: StreamingState) => StreamingState)) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  const startStream = useCallback(async (message: string, context?: StreamContext) => {
    // Abort any existing stream and wait a tick to ensure cleanup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    safeSetState({ content: '', isStreaming: true, error: null });

    try {
      const response = await fetch('/api/coach/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          lessonId: context?.lessonId,
          atomId: context?.atomId,
          context: {
            courseId: context?.courseId,
            moduleId: context?.moduleId,
            masteryLevel: context?.masteryLevel,
            conversationHistory: context?.conversationHistory,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Stream request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages from buffer
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Skip empty lines (SSE uses double newlines as delimiters)
          if (!line.trim()) continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'delta') {
                safeSetState(prev => ({
                  ...prev,
                  content: prev.content + data.content,
                }));
              } else if (data.type === 'done') {
                safeSetState(prev => ({ ...prev, isStreaming: false }));
              } else if (data.type === 'error') {
                safeSetState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: data.error,
                }));
              }
            } catch (parseError) {
              // Log but don't fail on parse errors - the stream might have partial data
              console.warn('[useStreamingResponse] Failed to parse SSE data:', line, parseError);
            }
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.type === 'delta') {
            safeSetState(prev => ({
              ...prev,
              content: prev.content + data.content,
            }));
          } else if (data.type === 'done') {
            safeSetState(prev => ({ ...prev, isStreaming: false }));
          }
        } catch {
          // Ignore parse errors for final buffer
        }
      }

      // Ensure streaming is marked as complete
      safeSetState(prev => ({ ...prev, isStreaming: false }));
    } catch (error) {
      // Don't treat abort as an error - it's intentional
      if (error instanceof Error && error.name === 'AbortError') {
        safeSetState(prev => ({ ...prev, isStreaming: false }));
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
      console.error('[useStreamingResponse] Stream error:', errorMessage);

      safeSetState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage,
      }));
    }
  }, [safeSetState]);

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    safeSetState(prev => ({ ...prev, isStreaming: false }));
  }, [safeSetState]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    safeSetState(INITIAL_STATE);
  }, [safeSetState]);

  return {
    ...state,
    startStream,
    stopStream,
    reset,
  };
}

export default useStreamingResponse;
