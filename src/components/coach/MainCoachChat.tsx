'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InlineQuiz, type QuizQuestion, type Answer } from '@/components/coach/InlineQuiz';
import { useCoach } from '@/hooks/useCoach';
import { cn } from '@/lib/utils';

// Extended message type to support inline quiz content
type QuizContentBlock = {
  type: 'quiz';
  question: QuizQuestion;
};

type MessageWithQuiz = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contentBlock?: QuizContentBlock;
  quizAnswered?: boolean;
};

type MainCoachChatProps = {
  onMessageSent?: () => void;
  easyStartSection?: ReactNode;
  lessonContext?: {
    currentCourse?: string;
    currentModule?: string;
    currentLesson?: string;
    atomType?: string;
    atomContent?: string;
  };
  onQuizAnswer?: (answer: Answer) => void;
  onReady?: (api: { addQuizToChat: (question: QuizQuestion, introMessage?: string) => string }) => void;
};

// Re-export types for external use
export type { QuizQuestion, Answer, QuizContentBlock, MessageWithQuiz };

export function MainCoachChat({
  onMessageSent,
  easyStartSection,
  lessonContext,
  onQuizAnswer,
  onReady,
}: MainCoachChatProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    initializeChat,
  } = useCoach();

  const [input, setInput] = useState('');
  const [quizMessages, setQuizMessages] = useState<Record<string, MessageWithQuiz>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle quiz answer submission
  const handleQuizAnswer = useCallback(async (messageId: string, answer: Answer) => {
    // Mark quiz as answered in local state
    setQuizMessages(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        quizAnswered: true,
      },
    }));

    // Notify parent of quiz answer (for flowController integration)
    onQuizAnswer?.(answer);

    // Send answer as user message
    const answerText = answer.isCorrect
      ? `I answered: ${answer.selected} - Correct!`
      : `I answered: ${answer.selected}`;

    // Trigger coach response based on correctness
    await sendMessage(answerText, 'quiz_help', lessonContext);
  }, [sendMessage, lessonContext, onQuizAnswer]);

  // Add a quiz to the chat (can be called externally via ref or callback prop)
  const addQuizToChat = useCallback((question: QuizQuestion, introMessage?: string) => {
    const messageId = `quiz-${Date.now()}`;

    // Create a quiz message entry
    const quizMessage: MessageWithQuiz = {
      id: messageId,
      role: 'assistant',
      content: introMessage || 'Let me test your understanding with a quick question:',
      timestamp: new Date(),
      contentBlock: {
        type: 'quiz',
        question,
      },
      quizAnswered: false,
    };

    setQuizMessages(prev => ({
      ...prev,
      [messageId]: quizMessage,
    }));

    return messageId;
  }, []);

  // Initialize chat with welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      initializeChat();
    }
  }, [messages.length, initializeChat]);

  // Expose API to parent component
  useEffect(() => {
    onReady?.({ addQuizToChat });
  }, [onReady, addQuizToChat]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    onMessageSent?.();

    await sendMessage(message, 'chat', lessonContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    'Explain this concept simply',
    'Give me a real-world example',
    'Quiz me on this topic',
    'What should I focus on?',
  ];

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-grey/20 bg-gradient-to-r from-teal/10 to-purple/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-teal to-purple rounded-xl flex items-center justify-center text-2xl">
              🦉
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
          </div>
          <div>
            <h1 className="font-semibold text-navy text-lg">Sage</h1>
            <p className="text-sm text-rich-black/60">Your AI learning coach</p>
          </div>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearMessages}
            className="p-2 rounded-lg text-rich-black/40 hover:text-rich-black hover:bg-light-grey transition-colors"
            title="Clear chat"
          >
            <Trash2 size={20} />
          </button>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          // Check if this message has quiz content (from quizMessages state or content block)
          const quizData = quizMessages[message.id];
          const hasQuiz = quizData?.contentBlock?.type === 'quiz';
          const isQuizAnswered = quizData?.quizAnswered ?? false;

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
                  <Sparkles size={18} className="text-white" />
                </div>
              )}
              <div className="max-w-[80%]">
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-teal text-white rounded-br-md'
                      : 'bg-light-grey text-rich-black rounded-bl-md'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {/* Render InlineQuiz if message contains quiz content */}
                {hasQuiz && quizData.contentBlock && (
                  <InlineQuiz
                    question={quizData.contentBlock.question}
                    onAnswer={(answer) => handleQuizAnswer(message.id, answer)}
                    disabled={isQuizAnswered || isLoading}
                  />
                )}
              </div>
            </motion.div>
          );
        })}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="bg-light-grey rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <motion.div
                  className="w-2 h-2 bg-grey rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-grey rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div
                  className="w-2 h-2 bg-grey rounded-full"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="text-center text-sm text-error bg-error-light rounded-lg p-3">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Easy Start Section (when provided) */}
      {easyStartSection && (
        <div className="flex-shrink-0 px-4 pb-2">
          {easyStartSection}
        </div>
      )}

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <p className="text-xs text-rich-black/40 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="text-xs px-3 py-1.5 rounded-full bg-light-grey text-rich-black/70 hover:bg-grey/50 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="flex-shrink-0 p-4 border-t border-grey/20 bg-white/80 backdrop-blur-sm">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sage anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-grey bg-light-grey/50 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal placeholder:text-grey text-sm disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            variant="primary"
            className="px-4"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
