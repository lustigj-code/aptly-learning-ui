'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/store/unifiedStore';

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

export function useCoach() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [showLoadIndicator, setShowLoadIndicator] = useState(false);

  /**
   * Load previous conversation by ID
   */
  const loadConversation = useCallback(async (convId: string) => {
    try {
      setShowLoadIndicator(true);
      setIsLoading(true);

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

      setMessages(loadedMessages);
      setConversationId(convId);
      setConversationLoaded(true);
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
      setShowLoadIndicator(false);
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

        setIsLoading(true);

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
          setConversationId(data.conversationId);
          setConversationLoaded(true);
          return data.conversationId;
        }
      } catch (err) {
        console.error('Error initializing conversation:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize conversation');
      } finally {
        setIsLoading(false);
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

      setConversationId(null);
      setMessages([]);
      setConversationLoaded(false);
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string, type: MessageType = 'chat', context?: CoachContext) => {
      if (!content.trim()) return;

      setIsLoading(true);
      setError(null);

      // Ensure we have a conversation
      let currentConvId = conversationId;
      if (!currentConvId) {
        currentConvId = await initializeConversation(context?.currentLesson);
        if (!currentConvId) {
          setError('Failed to create conversation');
          setIsLoading(false);
          return null;
        }
      }

      // Add user message immediately (optimistic update)
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

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

        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation ID if new
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        return assistantMessage;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
        setError(errorMessage);

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

        setMessages((prev) => [...prev, errorResponse]);
        return errorResponse;
      } finally {
        setIsLoading(false);
      }
    },
    [messages, user, conversationId, initializeConversation]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
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
      setMessages([welcomeMessage]);
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
