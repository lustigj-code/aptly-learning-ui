'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  Sparkles,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCoach } from '@/hooks/useCoach';
import { useInteractionLogger } from '@/hooks/useInteractionLogger';
import { cn } from '@/lib/utils';

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

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    // Log the coach interaction for ML model training
    logCoachInteraction({
      message,
      skillId: lessonContext?.currentLesson ? `skill-${lessonContext.currentLesson}-coach` : undefined,
    });

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
            {messages.map((message) => (
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
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-teal text-white rounded-br-md'
                      : 'bg-light-grey text-rich-black rounded-bl-md'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
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
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
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
          <div className="p-4 border-t border-grey/20">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your coach anything..."
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
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-teal to-purple shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow z-40"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle size={24} />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow rounded-full border-2 border-white" />
      )}
    </motion.button>
  );
}
