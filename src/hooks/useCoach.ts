'use client';

import { useReducer, useCallback, useEffect } from 'react';
import { useUser } from '@/store/unifiedStore';
import { getIdToken } from '@/lib/firebase/auth';
import type { CoachAction } from '@/types/coachActions';

// ============================================
// TYPES
// ============================================

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Phase 3: Actions from AI
  actions?: CoachAction[];
};

type CoachContext = {
  currentCourse?: string;
  currentModule?: string;
  currentLesson?: string;
  currentAtom?: string;
  atomType?: string;
  atomContent?: string;
  // Phase 2: Real-time context for immediate awareness
  immediateContext?: {
    questionId: string;
    questionText: string;
    selectedAnswer: string;
    wasCorrect: boolean;
    attemptNumber: number;
  };
};

// Conversation preview for history panel
type ConversationPreview = {
  id: string;
  preview: string;
  messageCount: number;
  updatedAt: string;
  lessonId?: string;
  sessionGoal?: string;
};

type MessageType = 'chat' | 'practice_feedback' | 'quiz_help' | 'summary';

// ============================================
// STATE TYPES
// ============================================

interface CoachState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  conversationLoaded: boolean;
  showLoadIndicator: boolean;
  // Phase 1: Conversation history
  conversationHistory: ConversationPreview[];
  historyLoading: boolean;
  currentLessonId: string | null;
}

// ============================================
// ACTIONS
// ============================================

type CoachReducerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOAD_INDICATOR'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_CONVERSATION'; payload: { id: string; messages: Message[] } }
  | { type: 'SET_CONVERSATION_ID'; payload: string | null }
  | { type: 'SET_CONVERSATION_LOADED'; payload: boolean }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'RESET_CONVERSATION' }
  | { type: 'LOADING_START' }
  | { type: 'LOADING_END' }
  // Phase 1: History actions
  | { type: 'SET_HISTORY'; payload: ConversationPreview[] }
  | { type: 'SET_HISTORY_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_LESSON'; payload: string | null };

// ============================================
// SESSION STORAGE FOR COACH STATE
// ============================================

const COACH_SESSION_KEY = 'aptly_coach_session';

// Only store conversation ID and lesson ID - not messages (those come from server)
type CoachSessionCache = {
  conversationId: string | null;
  currentLessonId: string | null;
};

function loadCoachSession(): CoachSessionCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(COACH_SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate structure
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          conversationId: typeof parsed.conversationId === 'string' ? parsed.conversationId : null,
          currentLessonId: typeof parsed.currentLessonId === 'string' ? parsed.currentLessonId : null,
        };
      }
    }
  } catch (e) {
    console.warn('[useCoach] Failed to load session cache:', e);
    sessionStorage.removeItem(COACH_SESSION_KEY);
  }
  return null;
}

function saveCoachSession(cache: CoachSessionCache) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(COACH_SESSION_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('[useCoach] Failed to save session cache:', e);
  }
}

// Uncomment if needed for clearing session:
// function clearCoachSession() {
//   if (typeof window === 'undefined') return;
//   sessionStorage.removeItem(COACH_SESSION_KEY);
// }

// ============================================
// REDUCER
// ============================================

// Initialize from sessionStorage if available
function getInitialState(): CoachState {
  const cached = loadCoachSession();
  return {
    messages: [],
    isLoading: false,
    error: null,
    conversationId: cached?.conversationId ?? null,
    conversationLoaded: false,
    showLoadIndicator: false,
    // Phase 1: History
    conversationHistory: [],
    historyLoading: false,
    currentLessonId: cached?.currentLessonId ?? null,
  };
}

// Note: initialState kept for reference but getInitialState() is used instead
// to support session restoration from sessionStorage
const _initialState: CoachState = {
  messages: [],
  isLoading: false,
  error: null,
  conversationId: null,
  conversationLoaded: false,
  showLoadIndicator: false,
  // Phase 1: History
  conversationHistory: [],
  historyLoading: false,
  currentLessonId: null,
};

function coachReducer(state: CoachState, action: CoachReducerAction): CoachState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_LOAD_INDICATOR':
      return { ...state, showLoadIndicator: action.payload };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'SET_CONVERSATION':
      return {
        ...state,
        conversationId: action.payload.id,
        messages: action.payload.messages,
        conversationLoaded: true,
        isLoading: false,
        showLoadIndicator: false,
      };

    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: action.payload };

    case 'SET_CONVERSATION_LOADED':
      return { ...state, conversationLoaded: action.payload };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], error: null };

    case 'RESET_CONVERSATION':
      return {
        ...state,
        conversationId: null,
        messages: [],
        conversationLoaded: false,
      };

    case 'LOADING_START':
      return { ...state, isLoading: true, showLoadIndicator: true };

    case 'LOADING_END':
      return { ...state, isLoading: false, showLoadIndicator: false };

    // Phase 1: History reducers
    case 'SET_HISTORY':
      return { ...state, conversationHistory: action.payload };

    case 'SET_HISTORY_LOADING':
      return { ...state, historyLoading: action.payload };

    case 'SET_CURRENT_LESSON':
      return { ...state, currentLessonId: action.payload };

    default:
      return state;
  }
}

// ============================================
// HOOK
// ============================================

export function useCoach() {
  const { user } = useUser();
  const [state, dispatch] = useReducer(coachReducer, undefined, getInitialState);

  // Persist conversationId and currentLessonId to sessionStorage when they change
  useEffect(() => {
    saveCoachSession({
      conversationId: state.conversationId,
      currentLessonId: state.currentLessonId,
    });
  }, [state.conversationId, state.currentLessonId]);

  const {
    messages,
    isLoading,
    error,
    conversationId,
    conversationLoaded,
    showLoadIndicator,
    conversationHistory,
    historyLoading,
    currentLessonId,
  } = state;

  /**
   * Load previous conversation by ID
   */
  const loadConversation = useCallback(async (convId: string) => {
    try {
      dispatch({ type: 'LOADING_START' });

      const response = await fetch(`/api/coach/${convId}`);

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();

      // Convert message data to Message type
      type MessageData = {
        id: string;
        role: string;
        content: string;
        timestamp: Date | string;
      };
      const loadedMessages: Message[] = (data.messages || []).map((msg: MessageData) => ({
        id: msg.id,
        role: msg.role === 'coach' ? 'assistant' : 'user',
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
      }));

      dispatch({
        type: 'SET_CONVERSATION',
        payload: { id: convId, messages: loadedMessages },
      });
    } catch (err) {
      console.error('Error loading conversation:', err);
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to load conversation',
      });
      dispatch({ type: 'LOADING_END' });
    }
  }, []);

  // Auto-load conversation if we have a cached conversationId but no messages
  // This restores the conversation after a page refresh
  useEffect(() => {
    if (conversationId && messages.length === 0 && !conversationLoaded && !isLoading) {
      // We have a cached conversation ID, try to load it
      loadConversation(conversationId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  /**
   * Create a new conversation if none exists
   */
  const initializeConversation = useCallback(
    async (lessonId?: string) => {
      try {
        // If we already have a conversation in this session, don't create a new one
        if (conversationId) {
          return conversationId;
        }

        dispatch({ type: 'SET_LOADING', payload: true });

        // Get auth token for API call
        const token = await getIdToken();
        if (!token) {
          throw new Error('Authentication required. Please sign in.');
        }

        // Create new conversation via API
        const response = await fetch('/api/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [],
            context: {
              userName: user?.name || 'Learner',
              currentCourse: 'Course 3',
              currentModule: 'Module 1',
              currentLesson: 'Lesson 1',
              currentAtom: '',
              atomType: 'reading',
              recentPerformance: 'progressing',
              masteryLevel: 65,
            },
            type: 'chat',
            userId: user?.id || 'anonymous',
            lessonId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create conversation');
        }

        const data = await response.json();

        if (data.conversationId) {
          dispatch({ type: 'SET_CONVERSATION_ID', payload: data.conversationId });
          dispatch({ type: 'SET_CONVERSATION_LOADED', payload: true });
          return data.conversationId;
        }
      } catch (err) {
        console.error('Error initializing conversation:', err);
        dispatch({
          type: 'SET_ERROR',
          payload: err instanceof Error ? err.message : 'Failed to initialize conversation',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }

      return null;
    },
    [conversationId, user?.id, user?.name]
  );

  /**
   * Delete current conversation
   */
  const deleteConversation = useCallback(async () => {
    if (!conversationId) {
      return;
    }

    try {
      const response = await fetch(`/api/coach/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      dispatch({ type: 'RESET_CONVERSATION' });
    } catch (err) {
      console.error('Error deleting conversation:', err);
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to delete conversation',
      });
    }
  }, [conversationId]);

  /**
   * Load conversation history for a lesson
   * Phase 1: Fetch all past conversations for the history panel
   */
  const loadConversationHistory = useCallback(
    async (lessonId?: string) => {
      try {
        dispatch({ type: 'SET_HISTORY_LOADING', payload: true });

        const url = lessonId
          ? `/api/coach/conversations?lessonId=${encodeURIComponent(lessonId)}&limit=20`
          : '/api/coach/conversations?limit=20';

        const response = await fetch(url, {
          headers: {
            'x-user-id': user?.id || 'anonymous',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load conversation history');
        }

        const data = await response.json();
        dispatch({ type: 'SET_HISTORY', payload: data.conversations || [] });
      } catch (err) {
        console.error('Error loading conversation history:', err);
        // Don't set error - history is non-critical
      } finally {
        dispatch({ type: 'SET_HISTORY_LOADING', payload: false });
      }
    },
    [user?.id]
  );

  /**
   * Load the most recent conversation for a lesson (auto-resume)
   * Phase 1: Called on mount to seamlessly continue where user left off
   */
  const loadLatestForLesson = useCallback(
    async (lessonId: string) => {
      try {
        dispatch({ type: 'SET_CURRENT_LESSON', payload: lessonId });
        dispatch({ type: 'LOADING_START' });

        // Fetch conversations for this lesson
        const response = await fetch(
          `/api/coach/conversations?lessonId=${encodeURIComponent(lessonId)}&limit=1`,
          {
            headers: {
              'x-user-id': user?.id || 'anonymous',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        const latestConv = data.conversations?.[0];

        if (latestConv && latestConv.messageCount > 0) {
          // Load the existing conversation
          await loadConversation(latestConv.id);
        } else {
          // No previous conversation - start fresh but mark as loaded
          dispatch({ type: 'SET_CONVERSATION_LOADED', payload: true });
          dispatch({ type: 'LOADING_END' });
        }

        // Also load full history for the panel
        loadConversationHistory(lessonId);
      } catch (err) {
        console.error('Error loading latest conversation:', err);
        // On error, just mark as loaded so user can start fresh
        dispatch({ type: 'SET_CONVERSATION_LOADED', payload: true });
        dispatch({ type: 'LOADING_END' });
      }
    },
    [user?.id, loadConversation, loadConversationHistory]
  );

  /**
   * Start a new conversation (for "New Chat" button)
   * Phase 1: Clears current conversation and starts fresh
   */
  const startNewConversation = useCallback(
    async (lessonId?: string) => {
      // Reset the current conversation state
      dispatch({ type: 'RESET_CONVERSATION' });

      // If we have a lesson, track it
      if (lessonId) {
        dispatch({ type: 'SET_CURRENT_LESSON', payload: lessonId });
      }

      // Refresh history
      loadConversationHistory(lessonId || currentLessonId || undefined);
    },
    [loadConversationHistory, currentLessonId]
  );

  const sendMessage = useCallback(
    async (content: string, type: MessageType = 'chat', context?: CoachContext) => {
      if (!content.trim()) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Ensure we have a conversation
      let currentConvId = conversationId;
      if (!currentConvId) {
        currentConvId = await initializeConversation(context?.currentLesson);
        if (!currentConvId) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to create conversation' });
          dispatch({ type: 'SET_LOADING', payload: false });
          // Return a fallback message instead of null so UI always shows something
          const initErrorMessage: Message = {
            id: `assistant-init-error-${Date.now()}`,
            role: 'assistant',
            content: "I'm having trouble starting our conversation. Please try refreshing the page or check your connection.",
            timestamp: new Date(),
          };
          dispatch({ type: 'ADD_MESSAGE', payload: initErrorMessage });
          return initErrorMessage;
        }
      }

      // Add user message immediately (optimistic update)
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      try {
        // Get auth token for API call
        const token = await getIdToken();
        if (!token) {
          throw new Error('Authentication required. Please sign in.');
        }

        // Build conversation history for API
        const conversationHistory = [...messages, userMessage].map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

        const response = await fetch('/api/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: conversationHistory,
            context: {
              userName: user?.name || 'Learner',
              currentCourse: context?.currentCourse || 'Course 3: Fundamentals of Social Media Advertising',
              currentModule: context?.currentModule || 'Module 1: Social Media Advertising Fundamentals',
              currentLesson: context?.currentLesson || 'Lesson 1: Understanding Paid Social',
              currentAtom: context?.currentAtom || '',
              atomType: context?.atomType || 'reading',
              atomContent: context?.atomContent,
              recentPerformance: 'progressing',
              masteryLevel: 65,
            },
            type,
            conversationId: currentConvId,
            userId: user?.id || 'anonymous',
            lessonId: context?.currentLesson,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[useCoach] API response error:', {
            status: response.status,
            errorData,
          });
          throw new Error(errorData.message || `Failed to get coach response (${response.status})`);
        }

        const data = await response.json();

        // Log debug info if available (for development)
        if (data._debug && process.env.NODE_ENV === 'development') {
          console.log('[useCoach] Debug info:', data._debug);
        }

        // Add assistant response (Phase 3: include actions)
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          actions: data.actions, // Phase 3: Actions from API
        };

        dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

        // Update conversation ID if new
        if (data.conversationId) {
          dispatch({ type: 'SET_CONVERSATION_ID', payload: data.conversationId });
        }

        return assistantMessage;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        // Enhanced error logging for debugging
        console.error('[useCoach] API request failed:', {
          error: err,
          errorMessage,
          conversationId: currentConvId,
          userId: user?.id,
        });

        // Add a fallback error message from coach
        const errorResponse: Message = {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content:
            "I'm having trouble connecting right now, but don't worry! Here's a quick tip: When studying social media marketing, always think about the 'why' behind each strategy. Why would this resonate with your audience? Keep learning, you're doing great!",
          timestamp: new Date(),
        };

        dispatch({ type: 'ADD_MESSAGE', payload: errorResponse });
        return errorResponse;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [messages, user, conversationId, initializeConversation]
  );

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  // Get a summary of current content
  const getSummary = useCallback(
    async (content: string, context?: CoachContext) => {
      return sendMessage(`Please summarize this content for me: ${content}`, 'summary', context);
    },
    [sendMessage]
  );

  // Get feedback on a practice response
  const getPracticeFeedback = useCallback(
    async (response: string, context?: CoachContext) => {
      return sendMessage(`Here's my practice response: ${response}`, 'practice_feedback', context);
    },
    [sendMessage]
  );

  // Get help with a quiz question
  const getQuizHelp = useCallback(
    async (question: string, context?: CoachContext) => {
      return sendMessage(`I need help with this quiz question: ${question}`, 'quiz_help', context);
    },
    [sendMessage]
  );

  // Add welcome message on first interaction
  const initializeChat = useCallback(() => {
    if (messages.length === 0 && !conversationLoaded) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `Hey ${user?.name || 'there'}! I'm your AI learning coach. I'm here to help you master social media marketing and ace your Meta certification.

Ask me anything about the content, request examples, or let me quiz you on what you've learned. What would you like to explore today?`,
        timestamp: new Date(),
      };
      dispatch({ type: 'SET_MESSAGES', payload: [welcomeMessage] });
    }
  }, [messages.length, conversationLoaded, user?.name]);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    conversationLoaded,
    showLoadIndicator,
    // Phase 1: History state
    conversationHistory,
    historyLoading,
    currentLessonId,
    // Actions
    sendMessage,
    clearMessages,
    getSummary,
    getPracticeFeedback,
    getQuizHelp,
    initializeChat,
    loadConversation,
    initializeConversation,
    deleteConversation,
    // Phase 1: History actions
    loadLatestForLesson,
    loadConversationHistory,
    startNewConversation,
  };
}

// Quick helper hooks for common actions
export function useCoachFeedback() {
  const { getPracticeFeedback, isLoading } = useCoach();
  return { getPracticeFeedback, isLoading };
}

export function useCoachHelp() {
  const { getQuizHelp, isLoading } = useCoach();
  return { getQuizHelp, isLoading };
}
