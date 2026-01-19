'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/Button';
import { useCoach } from '@/hooks/useCoach';
import { useInteractionLogger } from '@/hooks/useInteractionLogger';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type CoachChatProps = {
  isOpen: boolean;
  onClose: () => void;
  lessonContext?: {
    currentCourse?: string;
    currentModule?: string;
    currentLesson?: string;
    atomType?: string;
    atomContent?: string;
  };
};

export function CoachChat({ isOpen, onClose, lessonContext }: CoachChatProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    initializeChat,
  } = useCoach();

  // Interaction logging for ML model training
  const { logCoachInteraction } = useInteractionLogger();
  const prefersReducedMotion = useReducedMotion();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen, messages.length, initializeChat]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

    // Log the coach interaction for ML model training
    logCoachInteraction({
      message,
      skillId: lessonContext?.currentLesson ? `skill-${lessonContext.currentLesson}-coach` : undefined,
    });

    await sendMessage(message, 'chat', lessonContext);
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-grey/20 flex flex-col overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-grey/20 bg-gradient-to-r from-teal/10 to-purple/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center">
                  <MessageCircle size={20} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
              </div>
              <div>
                <h3 className="font-semibold text-navy">AI Coach</h3>
                <p className="text-xs text-rich-black/60">Here to help you learn</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 1 && (
                <button
                  onClick={clearMessages}
                  className="p-2 rounded-lg text-rich-black/40 hover:text-rich-black hover:bg-light-grey transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-rich-black/40 hover:text-rich-black hover:bg-light-grey transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
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
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center shadow-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      delay: index * 0.05 + 0.1
                    }}
                  >
                    <Sparkles size={16} className="text-white" />
                  </motion.div>
                )}
                <motion.div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
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
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="flex gap-3 items-end"
              >
                <motion.div
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center shadow-sm"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles size={16} className="text-white" />
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
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <motion.div
              className="px-4 pb-2"
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
                    className="text-xs px-4 py-2 rounded-full bg-gradient-to-br from-light-grey to-grey/20 text-rich-black/80 hover:from-teal/10 hover:to-purple/10 hover:text-navy border border-grey/20 hover:border-teal/30 font-medium transition-all shadow-sm hover:shadow"
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
          <div className="p-4 border-t border-grey/20 bg-white/80 backdrop-blur-sm">
            <div className="flex gap-2 items-end">
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
                  placeholder="Ask your coach... (Shift+Enter for new line)"
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-3 rounded-xl border border-grey/30 bg-white focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal/50 placeholder:text-grey/60 text-sm disabled:opacity-50 shadow-sm transition-all resize-none min-h-[44px] max-h-[120px] overflow-y-auto"
                />
              </div>
              <motion.div whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined} whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  variant="primary"
                  className="px-4 shadow-md h-[44px]"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Floating button to open chat
export function CoachChatButton({
  onClick,
  hasUnread = false,
}: {
  onClick: () => void;
  hasUnread?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-teal to-purple shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-40"
      whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
      whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
    >
      <MessageCircle size={24} />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow rounded-full border-2 border-white" />
      )}
    </motion.button>
  );
}
