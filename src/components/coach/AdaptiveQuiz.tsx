/**
 * Adaptive Quiz Component
 *
 * Wraps InlineQuiz with mastery-based adaptive features:
 * - Shows difficulty indicator based on ML prediction
 * - Displays confidence level
 * - Provides personalized encouragement
 *
 * Integrates the orphaned mastery prediction API.
 */

'use client';

import { motion } from 'framer-motion';
import { Brain, TrendingUp, Target, Sparkles } from 'lucide-react';
import { InlineQuiz, type QuizQuestion, type Answer } from '@/components/coach/InlineQuiz';
import { useMasteryPrediction, type DifficultyLevel } from '@/hooks/useMasteryPrediction';
import { cn } from '@/lib/utils';

interface AdaptiveQuizProps {
  question: QuizQuestion;
  skillId?: string;
  onAnswer: (answer: Answer) => void;
  disabled?: boolean;
  showAdaptiveInfo?: boolean;
}

const difficultyConfig: Record<DifficultyLevel, { label: string; color: string; icon: typeof Target; message: string }> = {
  easy: {
    label: 'Building Foundation',
    color: 'text-teal bg-teal/10 border-teal/30',
    icon: Sparkles,
    message: 'Start with the basics to build confidence!',
  },
  medium: {
    label: 'Learning Zone',
    color: 'text-purple bg-purple/10 border-purple/30',
    icon: TrendingUp,
    message: 'You\'re in the optimal learning zone!',
  },
  hard: {
    label: 'Challenging',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: Target,
    message: 'Push yourself - you can do this!',
  },
  challenge: {
    label: 'Mastery Check',
    color: 'text-success bg-success/10 border-success/30',
    icon: Brain,
    message: 'Let\'s confirm your mastery!',
  },
};

export function AdaptiveQuiz({
  question,
  skillId,
  onAnswer,
  disabled = false,
  showAdaptiveInfo = true,
}: AdaptiveQuizProps) {
  const {
    data,
    isLoading,
    recommendedDifficulty,
    masteryPercent,
    isHighConfidence,
    isUsingHybridModel,
  } = useMasteryPrediction(skillId);

  const config = difficultyConfig[recommendedDifficulty];
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      {/* Adaptive Info Banner */}
      {showAdaptiveInfo && skillId && !isLoading && data && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-lg px-3 py-2 border flex items-center gap-3',
            config.color
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{config.label}</span>
              {isUsingHybridModel && (
                <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  AI
                </span>
              )}
            </div>
            <p className="text-xs opacity-80 truncate">{config.message}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold">{masteryPercent}%</div>
            <div className="text-xs opacity-70">mastery</div>
          </div>
        </motion.div>
      )}

      {/* Loading state */}
      {isLoading && showAdaptiveInfo && skillId && (
        <div className="rounded-lg px-3 py-2 bg-light-grey/50 border border-grey/20 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-grey">Personalizing difficulty...</span>
        </div>
      )}

      {/* Quiz Component */}
      <InlineQuiz
        question={question}
        onAnswer={onAnswer}
        disabled={disabled}
      />

      {/* Confidence indicator (subtle) */}
      {showAdaptiveInfo && data && isHighConfidence && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-rich-black/40 flex items-center gap-1 ml-1"
        >
          <span className="w-1.5 h-1.5 bg-teal rounded-full" />
          High confidence prediction
        </motion.p>
      )}
    </div>
  );
}

/**
 * Compact version for inline use (hides adaptive info)
 */
export function AdaptiveQuizCompact({
  question,
  skillId,
  onAnswer,
  disabled,
}: Omit<AdaptiveQuizProps, 'showAdaptiveInfo'>) {
  return (
    <AdaptiveQuiz
      question={question}
      skillId={skillId}
      onAnswer={onAnswer}
      disabled={disabled}
      showAdaptiveInfo={false}
    />
  );
}

export default AdaptiveQuiz;
