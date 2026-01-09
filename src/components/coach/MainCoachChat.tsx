'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCoach } from '@/hooks/useCoach';
import { cn } from '@/lib/utils';

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
};

export function MainCoachChat({
  onMessageSent,
  easyStartSection,
  lessonContext,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize chat with welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      initializeChat();
    }
  }, [messages.length, initializeChat]);

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
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal to-purple flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
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
