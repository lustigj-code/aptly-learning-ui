'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Brain, BookOpen, Zap, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import { buildSession, getSessionSummary, type LearningSession, type SessionItem } from '@/lib/adaptive/sessionBuilder';
import { getSkillName } from '@/data/skillMap';
import { MiniReviewBadge } from './ReviewChallengeBadge';

// ============================================
// TYPES
// ============================================

interface AdaptiveSessionViewProps {
  userId: string;
  courseId?: string;
  availableMinutes: number;
  onStartSession: (session: LearningSession) => void;
  onItemComplete: (item: SessionItem) => void;
  className?: string;
}

interface SessionOverviewProps {
  session: LearningSession;
  currentIndex: number;
  onStart: () => void;
}

interface _SessionItemCardProps {
  item: SessionItem;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

// ============================================
// SESSION OVERVIEW COMPONENT
// ============================================

function SessionOverview({ session, currentIndex, onStart }: SessionOverviewProps) {
  const progress = currentIndex > 0
    ? (currentIndex / session.items.length) * 100
    : 0;

  return (
    <div className="bg-gradient-to-br from-teal/5 to-purple/5 rounded-2xl p-6 border border-teal/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center">
          <Sparkles className="text-white" size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-navy">Your Personalized Session</h3>
          <p className="text-sm text-grey">{getSessionSummary(session)}</p>
        </div>
      </div>

      {/* Progress */}
      {currentIndex > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-grey">Progress</span>
            <span className="text-navy font-medium">{currentIndex}/{session.items.length}</span>
          </div>
          <ProgressBar value={progress} size="sm" color="teal" />
        </div>
      )}

      {/* Session Items Preview */}
      <div className="space-y-2 mb-4">
        {session.items.map((item, idx) => (
          <div
            key={item.itemId}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              idx < currentIndex && "bg-green-50 text-green-700",
              idx === currentIndex && "bg-teal/10 border border-teal/30",
              idx > currentIndex && (item.isReviewChallenge ? "bg-amber-50/50 text-amber-700" : "bg-light-grey/50 text-grey")
            )}
          >
            <ItemTypeIcon type={item.type} isCompleted={idx < currentIndex} isReviewChallenge={item.isReviewChallenge} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-sm font-medium truncate",
                  idx === currentIndex && "text-navy"
                )}>
                  {getSkillName(item.skillId)}
                </p>
                {item.isReviewChallenge && idx >= currentIndex && (
                  <MiniReviewBadge />
                )}
              </div>
              <p className="text-xs text-grey truncate">
                {item.isReviewChallenge ? `Review break: ${item.reason}` : item.reason}
              </p>
            </div>
            <span className="text-xs text-grey flex items-center gap-1">
              <Clock size={12} />
              {item.estimatedMinutes}m
            </span>
          </div>
        ))}
      </div>

      {/* Start/Continue Button */}
      <Button
        variant="primary"
        fullWidth
        onClick={onStart}
        rightIcon={<ChevronRight size={18} />}
      >
        {currentIndex > 0 ? 'Continue Session' : 'Start Session'}
      </Button>
    </div>
  );
}

// ============================================
// ITEM TYPE ICON
// ============================================

function ItemTypeIcon({ type, isCompleted, isReviewChallenge }: { type: SessionItem['type']; isCompleted: boolean; isReviewChallenge?: boolean }) {
  if (isCompleted) {
    return (
      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
        <Check className="text-white" size={16} />
      </div>
    );
  }

  // Special styling for review challenges
  if (isReviewChallenge) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 border border-amber-300">
        <RefreshCw size={16} />
      </div>
    );
  }

  const iconMap = {
    warmup: <Brain size={16} />,
    learn: <BookOpen size={16} />,
    practice: <Zap size={16} />,
    quiz: <Sparkles size={16} />,
    review: <RefreshCw size={16} />,
    cooldown: <Brain size={16} />,
  };

  const colorMap = {
    warmup: 'bg-amber-100 text-amber-600',
    learn: 'bg-blue-100 text-blue-600',
    practice: 'bg-purple-100 text-purple-600',
    quiz: 'bg-teal text-white',
    review: 'bg-amber-100 text-amber-600',
    cooldown: 'bg-green-100 text-green-600',
  };

  return (
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorMap[type])}>
      {iconMap[type]}
    </div>
  );
}

// ============================================
// PRE-TEST OFFER COMPONENT
// ============================================

export function PretestOffer({
  lessonTitle,
  skillCount,
  onAccept,
  onDecline,
}: {
  lessonTitle: string;
  skillCount: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple/5 to-teal/5 rounded-2xl p-6 border border-purple/20"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
          <Zap className="text-white" size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-navy">Already know this?</h3>
          <p className="text-sm text-grey">Test out of &quot;{lessonTitle}&quot;</p>
        </div>
      </div>

      <p className="text-sm text-rich-black/70 mb-4">
        If you score 80%+ on a quick {skillCount * 2}-question test, you can skip this lesson entirely and move ahead.
      </p>

      <div className="flex gap-3">
        <Button
          variant="primary"
          onClick={onAccept}
          className="flex-1"
        >
          Take Pre-Test
        </Button>
        <Button
          variant="ghost"
          onClick={onDecline}
          className="flex-1"
        >
          Start Lesson
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================
// ADAPTIVE REASONING BANNER
// ============================================

export function AdaptiveReasoningBanner({
  reason,
  skillName: _skillName,
  type,
}: {
  reason: string;
  skillName: string;
  type: 'review' | 'learn' | 'practice';
}) {
  const typeConfig = {
    review: {
      icon: <Brain size={16} />,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      label: 'Review',
    },
    learn: {
      icon: <BookOpen size={16} />,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      label: 'New Learning',
    },
    practice: {
      icon: <Zap size={16} />,
      bg: 'bg-purple-50 border-purple-200',
      text: 'text-purple-700',
      label: 'Practice',
    },
  };

  const config = typeConfig[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center gap-3 px-4 py-2 rounded-lg border mb-4", config.bg)}
    >
      <div className={cn("flex items-center gap-2", config.text)}>
        {config.icon}
        <span className="text-xs font-medium uppercase tracking-wide">{config.label}</span>
      </div>
      <span className="text-sm text-rich-black/70">{reason}</span>
    </motion.div>
  );
}

// ============================================
// SKIP SUCCESS MESSAGE
// ============================================

export function SkipSuccessMessage({
  skillName,
  onContinue,
}: {
  skillName: string;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="text-green-600" size={32} />
      </div>
      <h2 className="text-xl font-semibold text-navy mb-2">You already know this!</h2>
      <p className="text-grey mb-6">
        Great job on &quot;{skillName}&quot; - you&apos;ve demonstrated mastery.
        <br />
        Let&apos;s move to something new.
      </p>
      <Button variant="primary" onClick={onContinue}>
        Continue to Next Topic
      </Button>
    </motion.div>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export default function AdaptiveSessionView({
  userId,
  courseId = 'ai-at-work',
  availableMinutes,
  onStartSession,
  onItemComplete,
  className,
}: AdaptiveSessionViewProps) {
  const [session, setSession] = useState<LearningSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);
      try {
        const newSession = await buildSession(userId, courseId, availableMinutes, {
          learningPace: 'moderate',
          preferredFormat: 'mixed',
          includeWarmup: true,
          includeCooldown: true,
        });
        setSession(newSession);
      } catch (error) {
        console.error('Failed to build session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [userId, courseId, availableMinutes]);

  const handleStart = () => {
    if (session) {
      onStartSession(session);
    }
  };

  const _handleItemComplete = () => {
    if (session && currentIndex < session.items.length) {
      onItemComplete(session.items[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="bg-light-grey rounded-2xl h-64" />
      </div>
    );
  }

  if (!session || session.items.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-grey">No learning items available right now.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <SessionOverview
        session={session}
        currentIndex={currentIndex}
        onStart={handleStart}
      />
    </div>
  );
}

export { SessionOverview, ItemTypeIcon };
