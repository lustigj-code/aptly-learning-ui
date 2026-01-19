'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Loader2,
  Sparkles,
  Trash2,
  History,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/Button';
import { InlineQuiz, type QuizQuestion, type Answer } from '@/components/coach/InlineQuiz';
import { ConversationHistoryPanel } from '@/components/coach/ConversationHistoryPanel';
import { AIFeedbackInline } from '@/components/ai/AIFeedbackWidget';
import { useCoach } from '@/hooks/useCoach';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { type CoachAction, getActionButtonStyle } from '@/types/coachActions';
import {
  ArrowRight,
  Lightbulb,
  Bookmark,
  Coffee,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

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
  // Phase 1: Auto-load previous conversation for this lesson
  lessonId?: string;
  // Phase 2: Immediate context for what user just did
  immediateContext?: {
    questionId: string;
    questionText: string;
    selectedAnswer: string;
    wasCorrect: boolean;
    attemptNumber: number;
  };
  onQuizAnswer?: (answer: Answer) => void;
  onReady?: (api: { addQuizToChat: (question: QuizQuestion, introMessage?: string) => string }) => void;
  // Phase 3: Action handler
  onAction?: (action: CoachAction) => void;
};

// Re-export types for external use
export type { QuizQuestion, Answer, QuizContentBlock, MessageWithQuiz };

export function MainCoachChat({
  onMessageSent,
  easyStartSection,
  lessonContext,
  lessonId,
  immediateContext,
  onQuizAnswer,
  onReady,
  onAction,
}: MainCoachChatProps) {
  const {
    messages,
    isLoading,
    error,
    conversationId,
    conversationLoaded,
    conversationHistory,
    historyLoading,
    sendMessage,
    clearMessages,
    initializeChat,
    loadLatestForLesson,
    loadConversation,
    startNewConversation,
  } = useCoach();

  const [input, setInput] = useState('');
  const [quizMessages, setQuizMessages] = useState<Record<string, MessageWithQuiz>>({});
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const hasLoadedInitialRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prefersReducedMotion = useReducedMotion();

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

  // Phase 1: Auto-load previous conversation for this lesson on mount
  useEffect(() => {
    if (lessonId && !hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = true;
      loadLatestForLesson(lessonId);
    } else if (!lessonId && messages.length === 0 && !hasLoadedInitialRef.current) {
      // No lessonId - just show welcome message
      hasLoadedInitialRef.current = true;
      initializeChat();
    }
  }, [lessonId, loadLatestForLesson, initializeChat, messages.length]);

  // Show welcome message after conversation is loaded (if empty)
  useEffect(() => {
    if (conversationLoaded && messages.length === 0) {
      initializeChat();
    }
  }, [conversationLoaded, messages.length, initializeChat]);

  // Handle selecting a conversation from history
  const handleSelectConversation = useCallback(
    (convId: string) => {
      loadConversation(convId);
      setShowHistoryPanel(false);
    },
    [loadConversation]
  );

  // Handle starting a new conversation
  const handleStartNew = useCallback(() => {
    startNewConversation(lessonId);
    setShowHistoryPanel(false);
  }, [startNewConversation, lessonId]);

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

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    onMessageSent?.();

    // Phase 2: Include immediate context in the message
    await sendMessage(message, 'chat', {
      ...lessonContext,
      immediateContext,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="flex flex-col h-full min-h-screen relative">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-5 border-b border-grey/20 bg-gradient-to-r from-teal/10 via-purple/5 to-teal/10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-teal via-purple to-teal-dark rounded-2xl flex items-center justify-center text-3xl shadow-lg"
              whileHover={!prefersReducedMotion ? { scale: 1.05, rotate: 5 } : undefined}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              🦉
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-white shadow-sm"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div>
            <h1 className="font-bold text-navy text-xl">Sage</h1>
            <p className="text-sm text-rich-black/70 font-medium">Your AI learning coach</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* History toggle button */}
          <button
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className={cn(
              'p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center',
              showHistoryPanel
                ? 'bg-teal/10 text-teal'
                : 'text-rich-black/40 hover:text-rich-black hover:bg-light-grey'
            )}
            aria-label={showHistoryPanel ? 'Close chat history' : 'Open chat history'}
            title={showHistoryPanel ? 'Close chat history' : 'Open chat history'}
          >
            {showHistoryPanel ? <X size={20} /> : <History size={20} />}
          </button>

          {/* Clear chat button */}
          {messages.length > 1 && (
            <button
              onClick={clearMessages}
              className="p-2 rounded-lg text-rich-black/40 hover:text-rich-black hover:bg-light-grey transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Clear chat history"
              title="Clear chat"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </header>

      {/* History Panel Overlay */}
      {showHistoryPanel && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute inset-y-0 left-0 w-72 bg-white border-r border-grey/20 shadow-lg z-10 mt-[72px]"
        >
          <ConversationHistoryPanel
            conversations={conversationHistory}
            isLoading={historyLoading}
            currentConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onStartNew={handleStartNew}
          />
        </motion.div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((message, index) => {
          // Check if this message has quiz content (from quizMessages state or content block)
          const quizData = quizMessages[message.id];
          const hasQuiz = quizData?.contentBlock?.type === 'quiz';
          const isQuizAnswered = quizData?.quizAnswered ?? false;

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: [0.34, 1.56, 0.64, 1]
              }}
              className={cn(
                'flex gap-3 items-end',
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              {message.role === 'assistant' && (
                <motion.div
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center shadow-sm"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    delay: index * 0.05 + 0.1
                  }}
                >
                  <Sparkles size={18} className="text-white" />
                </motion.div>
              )}
              <div className="max-w-[80%]">
                <motion.div
                  className={cn(
                    'rounded-2xl px-4 py-3 shadow-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-teal to-teal/90 text-white rounded-br-md'
                      : 'bg-white border border-grey/20 text-rich-black rounded-bl-md'
                  )}
                  whileHover={!prefersReducedMotion ? { scale: 1.01 } : undefined}
                  transition={{ duration: 0.2 }}
                >
                  {message.role === 'assistant' ? (
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-code:text-xs">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ inline, children, ...props }) => (
                            inline ? (
                              <code className="px-1.5 py-0.5 bg-navy/10 text-navy rounded text-xs font-mono" {...props}>
                                {children}
                              </code>
                            ) : (
                              <pre className="p-3 bg-navy/5 rounded-lg overflow-x-auto my-2" {...props}>
                                <code className="text-xs font-mono">{children}</code>
                              </pre>
                            )
                          ),
                          p: ({ children, ...props }) => (
                            <p className="my-1.5" {...props}>{children}</p>
                          ),
                          ul: ({ children, ...props }) => (
                            <ul className="my-2 ml-4 list-disc" {...props}>{children}</ul>
                          ),
                          ol: ({ children, ...props }) => (
                            <ol className="my-2 ml-4 list-decimal" {...props}>{children}</ol>
                          ),
                          li: ({ children, ...props }) => (
                            <li className="my-1" {...props}>{children}</li>
                          ),
                          strong: ({ children, ...props }) => (
                            <strong className="font-semibold text-navy" {...props}>{children}</strong>
                          ),
                          em: ({ children, ...props }) => (
                            <em className="italic" {...props}>{children}</em>
                          ),
                          a: ({ children, ...props }) => (
                            <a className="text-teal underline hover:text-teal/80" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                </motion.div>
                {/* Render InlineQuiz if message contains quiz content */}
                {hasQuiz && quizData.contentBlock && (
                  <InlineQuiz
                    question={quizData.contentBlock.question}
                    onAnswer={(answer) => handleQuizAnswer(message.id, answer)}
                    disabled={isQuizAnswered || isLoading}
                  />
                )}
                {/* Phase 3: Render action buttons */}
                {message.role === 'assistant' && message.actions && message.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.actions.map((action, index) => (
                      <ActionButton
                        key={`${message.id}-action-${index}`}
                        action={action}
                        onClick={() => onAction?.(action)}
                      />
                    ))}
                  </div>
                )}
                {/* RLHF: Feedback widget for AI responses */}
                {message.role === 'assistant' && !isLoading && (
                  <div className="mt-2 ml-1">
                    <AIFeedbackInline
                      responseId={message.id}
                      conversationId={conversationId || undefined}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex gap-3 items-end"
          >
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center shadow-sm"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={18} className="text-white" />
            </motion.div>
            <div className="bg-white border border-grey/20 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-5">
                <motion.div
                  className="w-2 h-2 bg-gradient-to-br from-teal to-purple rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0
                  }}
                />
                <motion.div
                  className="w-2 h-2 bg-gradient-to-br from-teal to-purple rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                  }}
                />
                <motion.div
                  className="w-2 h-2 bg-gradient-to-br from-teal to-purple rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4
                  }}
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
        <motion.div
          className="flex-shrink-0 px-6 pb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-rich-black/60 font-medium mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <motion.button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="text-xs px-4 py-2 rounded-full bg-gradient-to-br from-light-grey to-grey/20 text-rich-black/80 hover:from-teal/10 hover:to-purple/10 hover:text-navy border border-grey/20 hover:border-teal/30 font-medium transition-all shadow-sm hover:shadow min-h-[44px]"
                aria-label={`Quick prompt: ${prompt}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
                whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input */}
      <footer className="flex-shrink-0 p-5 border-t border-grey/20 bg-gradient-to-t from-white to-white/95">
        <div className="flex gap-3 max-w-4xl mx-auto items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
              placeholder="Ask Sage anything... (Shift+Enter for new line)"
              aria-label="Message Sage AI coach"
              disabled={isLoading}
              rows={1}
              className="w-full px-5 py-4 rounded-xl border border-grey/30 bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal/50 placeholder:text-grey/60 text-sm disabled:opacity-50 shadow-sm transition-all resize-none min-h-[52px] max-h-[120px] overflow-y-auto"
            />
          </div>
          <motion.div whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined} whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              variant="primary"
              className="px-5 py-4 shadow-md h-[52px]"
              aria-label={isLoading ? 'Sending message' : 'Send message'}
            >
              {isLoading ? (
                <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={22} aria-hidden="true" />
              )}
            </Button>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// ACTION BUTTON COMPONENT (Phase 3)
// ============================================

type ActionButtonProps = {
  action: CoachAction;
  onClick: () => void;
};

function ActionButton({ action, onClick }: ActionButtonProps) {
  const { variant } = getActionButtonStyle(action);

  // Get icon based on action type
  const getIcon = () => {
    switch (action.type) {
      case 'navigate':
        return <ArrowRight size={14} />;
      case 'show_hint':
        return <Lightbulb size={14} />;
      case 'highlight_concept':
        return <Bookmark size={14} />;
      case 'suggest_break':
        return <Coffee size={14} />;
      case 'mark_understood':
        return <CheckCircle size={14} />;
      case 'open_resource':
        return <ExternalLink size={14} />;
      default:
        return <ArrowRight size={14} />;
    }
  };

  // Get label from action
  const getLabel = (): string => {
    if ('label' in action && action.label) {
      return action.label;
    }

    switch (action.type) {
      case 'navigate':
        return action.target.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
      case 'show_hint':
        return 'Show Hint';
      case 'highlight_concept':
        return `Review: ${action.conceptName}`;
      case 'suggest_break':
        return 'Take a Break';
      case 'mark_understood':
        return 'I understand this';
      case 'open_resource':
        return `View ${action.resourceType}`;
      default:
        return 'Action';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
        variant === 'primary' && 'bg-teal text-white hover:bg-teal/90',
        variant === 'secondary' && 'bg-purple/10 text-purple hover:bg-purple/20',
        variant === 'outline' && 'border border-grey/30 text-rich-black/70 hover:bg-light-grey'
      )}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </button>
  );
}
