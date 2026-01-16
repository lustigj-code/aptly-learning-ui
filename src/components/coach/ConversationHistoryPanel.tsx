'use client';

/**
 * Conversation History Panel
 *
 * Phase 1: Shows list of past conversations grouped by date.
 * Allows user to:
 * - View past conversation previews
 * - Click to load any conversation
 * - Start a new conversation
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type ConversationPreview = {
  id: string;
  preview: string;
  messageCount: number;
  updatedAt: string;
  lessonId?: string;
  sessionGoal?: string;
};

type ConversationHistoryPanelProps = {
  conversations: ConversationPreview[];
  isLoading: boolean;
  currentConversationId?: string | null;
  onSelectConversation: (conversationId: string) => void;
  onStartNew: () => void;
  className?: string;
};

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function groupByDate(conversations: ConversationPreview[]): Record<string, ConversationPreview[]> {
  const groups: Record<string, ConversationPreview[]> = {};

  conversations.forEach((conv) => {
    const dateKey = formatDate(conv.updatedAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(conv);
  });

  return groups;
}

// ============================================
// COMPONENT
// ============================================

export function ConversationHistoryPanel({
  conversations,
  isLoading,
  currentConversationId,
  onSelectConversation,
  onStartNew,
  className,
}: ConversationHistoryPanelProps) {
  const groupedConversations = useMemo(
    () => groupByDate(conversations),
    [conversations]
  );

  const dateGroups = Object.keys(groupedConversations);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with New Chat button */}
      <div className="flex-shrink-0 p-3 border-b border-grey/20">
        <button
          onClick={onStartNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-teal to-teal/80 text-white font-medium hover:from-teal/90 hover:to-teal/70 transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-grey" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <MessageSquare size={32} className="text-grey/50 mb-2" />
            <p className="text-sm text-grey">No previous conversations</p>
            <p className="text-xs text-grey/70 mt-1">
              Start chatting to build your history
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {dateGroups.map((dateKey) => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Date Group Header */}
                <div className="px-3 py-2 bg-light-grey/50 sticky top-0">
                  <span className="text-xs font-medium text-grey uppercase tracking-wide">
                    {dateKey}
                  </span>
                </div>

                {/* Conversations in this group */}
                <div className="divide-y divide-grey/10">
                  {groupedConversations[dateKey].map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === currentConversationId}
                      onClick={() => onSelectConversation(conv.id)}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============================================
// CONVERSATION ITEM
// ============================================

type ConversationItemProps = {
  conversation: ConversationPreview;
  isActive: boolean;
  onClick: () => void;
};

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-3 text-left transition-colors hover:bg-light-grey/50',
        isActive && 'bg-teal/10 border-l-2 border-teal'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            isActive
              ? 'bg-teal/20 text-teal'
              : 'bg-light-grey text-grey'
          )}
        >
          <MessageSquare size={16} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Preview text */}
          <p
            className={cn(
              'text-sm truncate',
              isActive ? 'text-rich-black font-medium' : 'text-rich-black/80'
            )}
          >
            {conversation.preview}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-grey flex items-center gap-1">
              <Clock size={12} />
              {formatTime(conversation.updatedAt)}
            </span>
            <span className="text-xs text-grey">
              {conversation.messageCount} {conversation.messageCount === 1 ? 'message' : 'messages'}
            </span>
          </div>
        </div>

        <ChevronRight
          size={16}
          className={cn(
            'flex-shrink-0 mt-1 transition-colors',
            isActive ? 'text-teal' : 'text-grey/40'
          )}
        />
      </div>
    </button>
  );
}

export default ConversationHistoryPanel;
