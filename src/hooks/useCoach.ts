'use client';

import { useReducer, useCallback } from 'react';
import { useUser } from '@/store/userProfileStore';

// ============================================
// TYPES
// ============================================

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type CoachContext = {
  currentCourse?: string;
  currentModule?: string;
  currentLesson?: string;
  currentAtom?: string;
  atomType?: string;
  atomContent?: string;
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
}

// ============================================
// ACTIONS
// ============================================

type CoachAction =
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
  | { type: 'LOADING_END' };

// ============================================
// REDUCER
// ============================================

const initialState: CoachState = {
  messages: [],
  isLoading: false,
  error: null,
  conversationId: null,
  conversationLoaded: false,
  showLoadIndicator: false,
};

function coachReducer(state: CoachState, action: CoachAction): CoachState {
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

    default:
      return state;
  }
}

// ============================================
// HOOK
// ============================================

export function useCoach() {
  const { user } = useUser();
  const [state, dispatch] = useReducer(coachReducer, initialState);

  const { messages, isLoading, error, conversationId, conversationLoaded, showLoadIndicator } =
    state;

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

        // Create new conversation via API
        const response = await fetch('/api/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
        // Build conversation history for API
        const conversationHistory = [...messages, userMessage].map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

        const response = await fetch('/api/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

        // Add assistant response
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
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
    sendMessage,
    clearMessages,
    getSummary,
    getPracticeFeedback,
    getQuizHelp,
    initializeChat,
    loadConversation,
    initializeConversation,
    deleteConversation,
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
