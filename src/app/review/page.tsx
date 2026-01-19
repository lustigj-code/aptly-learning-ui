'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Clock,
  TrendingUp,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Flame,
  ArrowLeft,
  Home,
  Lightbulb,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { useUser } from '@/store/userProfileStore';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { post } from '@/lib/api/client';

// New enhanced review components
import { TimingFeedback } from '@/components/mastery/TimingFeedback';
import { MasteryTrajectory, CompactTrajectory } from '@/components/mastery/MasteryTrajectory';
import { ReviewSessionInsights } from '@/components/mastery/ReviewSessionInsights';
import { ReviewForecast } from '@/components/mastery/ReviewForecast';

// ============================================
// TYPES
// ============================================

type ReviewState = 'reviewing' | 'showing_answer' | 'complete';

type SessionStats = {
  reviewed: number;
  correct: number;
  streak: number;
  maxStreak: number;
  totalTimeSeconds: number;
};

// ============================================
// REVIEW PAGE
// ============================================

export default function ReviewPage() {
  const router = useRouter();
  const { user } = useUser();
  const { dueItems, dueCount, isLoading, refetch, batch, optimalTime, forecast } = useReviewQueue(
    user?.id || null,
    15,
    true // Include forecast
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewState, setReviewState] = useState<ReviewState>('reviewing');
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    reviewed: 0,
    correct: 0,
    streak: 0,
    maxStreak: 0,
    totalTimeSeconds: 0,
  });
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [masteryHistory, setMasteryHistory] = useState<number[]>([]);

  const currentItem = dueItems[currentIndex];
  const progress = dueCount > 0 ? (currentIndex / dueCount) * 100 : 0;

  // Collect due dates for forecast
  const upcomingDueDates = useMemo(() => {
    return dueItems
      .filter((item) => item.dueDate)
      .map((item) => item.dueDate as string);
  }, [dueItems]);

  // Extract mastery history from current item
  const currentMasteryHistory = useMemo(() => {
    if (!currentItem) return masteryHistory;
    // Start with existing history and add current mastery level
    return [...masteryHistory, currentItem.masteryLevel];
  }, [currentItem, masteryHistory]);

  const handleShowAnswer = () => {
    setReviewState('showing_answer');
  };

  const handleRate = useCallback(
    async (score: number) => {
      if (!currentItem || isSubmitting) return;

      setIsSubmitting(true);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const correct = score >= 70;

      try {
        // Call API to persist review result
        await post('/api/review/complete', {
          conceptId: currentItem.conceptId,
          score,
          timeSpentSeconds: timeSpent,
        });

        // Track mastery progression
        setMasteryHistory((prev) => [...prev, currentItem.masteryLevel]);

        // Update session stats
        setSessionStats((prev) => {
          const newStreak = correct ? prev.streak + 1 : 0;
          return {
            reviewed: prev.reviewed + 1,
            correct: prev.correct + (correct ? 1 : 0),
            streak: newStreak,
            maxStreak: Math.max(prev.maxStreak, newStreak),
            totalTimeSeconds: prev.totalTimeSeconds + timeSpent,
          };
        });

        // Move to next or complete
        if (currentIndex < dueCount - 1) {
          setCurrentIndex((prev) => prev + 1);
          setReviewState('reviewing');
          setUserAnswer('');
          setShowHint(false);
          setStartTime(Date.now());
        } else {
          setReviewState('complete');
        }
      } catch (error) {
        console.error('Failed to save review:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentItem, currentIndex, dueCount, startTime, isSubmitting]
  );

  const resetSession = useCallback(() => {
    refetch();
    setCurrentIndex(0);
    setReviewState('reviewing');
    setSessionStats({ reviewed: 0, correct: 0, streak: 0, maxStreak: 0, totalTimeSeconds: 0 });
    setUserAnswer('');
    setShowHint(false);
    setStartTime(Date.now());
    setMasteryHistory([]);
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <Card variant="elevated" padding="xl" className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    );
  }

  // No items due
  if (dueCount === 0 && reviewState !== 'complete') {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card variant="gradient" padding="xl" className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h3 className="text-xl font-bold text-navy">All Caught Up!</h3>
            <p className="text-rich-black/70">
              You have no concepts due for review right now. Great job staying on top of your
              learning!
            </p>
            <p className="text-sm text-rich-black/50">
              Check back later or continue learning new content.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/dashboard')}
              leftIcon={<Home size={20} />}
            >
              Back to Dashboard
            </Button>
          </motion.div>
        </Card>
      </div>
    );
  }

  // Session complete - use enhanced ReviewSessionInsights
  if (reviewState === 'complete') {
    // Calculate next review info
    const nextReviewDate = dueItems.length > 0 && dueItems[0].dueDate
      ? new Date(dueItems[0].dueDate)
      : null;

    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Enhanced Session Insights */}
        <ReviewSessionInsights
          stats={{
            reviewed: sessionStats.reviewed,
            correct: sessionStats.correct,
            streak: sessionStats.maxStreak,
            totalTimeSeconds: sessionStats.totalTimeSeconds,
          }}
          nextReview={{
            count: dueCount,
            nextDate: nextReviewDate,
          }}
        />

        {/* Mastery Trajectory */}
        {masteryHistory.length > 2 && (
          <Card variant="outlined" padding="md">
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy">Session Mastery Trend</p>
              <MasteryTrajectory
                history={masteryHistory}
                maxBars={15}
                height={50}
                showTrend
              />
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={resetSession}
            leftIcon={<RotateCcw size={20} />}
          >
            Review Again
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => router.push('/dashboard')}
            leftIcon={<Home size={20} />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Active review
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back
        </Button>
        <h1 className="text-lg font-semibold text-navy">Daily Review</h1>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Smart Review Info (batch reasoning + optimal time) */}
      {currentIndex === 0 && (batch || optimalTime) && (
        <Card variant="outlined" padding="sm" className="bg-teal/5 border-teal/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb size={16} className="text-teal" />
            </div>
            <div className="flex-1 space-y-1">
              {batch && (
                <p className="text-sm text-navy">{batch.batchReasoning}</p>
              )}
              {optimalTime && optimalTime.confidence > 0.4 && (
                <p className="text-xs text-rich-black/60">
                  <Info size={12} className="inline mr-1" />
                  {optimalTime.reasoning}
                </p>
              )}
              {batch && (
                <p className="text-xs text-teal">
                  Est. {batch.estimatedDurationMinutes} min | +{batch.expectedRetentionGain}% retention
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Review Forecast Widget (collapsed at top) */}
      {dueCount > 0 && currentIndex === 0 && (
        <ReviewForecast
          upcomingDueDates={
            forecast
              ? forecast.flatMap((f) =>
                  Array(f.dueCount).fill(f.date)
                )
              : upcomingDueDates
          }
          avgSecondsPerReview={30}
          daysAhead={7}
        />
      )}

      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-teal" />
            <span className="font-semibold text-navy">Spaced Repetition</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-rich-black/60">
              {currentIndex + 1} of {dueCount}
            </span>
            {sessionStats.streak >= 3 && (
              <div className="flex items-center gap-1 text-yellow">
                <Flame size={16} />
                <span>{sessionStats.streak} streak</span>
              </div>
            )}
          </div>
        </div>
        <ProgressBar value={progress} max={100} size="sm" animated />
      </div>

      {/* Review Card */}
      <AnimatePresence mode="wait">
        {currentItem && (
          <motion.div
            key={currentItem.conceptId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card variant="elevated" padding="xl" className="space-y-6">
              {/* Timing Feedback */}
              {currentItem.dueDate && (
                <TimingFeedback
                  scheduledTime={currentItem.dueDate}
                  actualTime={new Date()}
                />
              )}

              {/* Concept Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-purple/10 text-purple">
                      {currentItem.category}
                    </span>
                    {currentItem.reasoning && (
                      <span className="text-xs text-rich-black/50 italic">
                        {currentItem.reasoning}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-navy">{currentItem.conceptName}</h2>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-rich-black/60">Mastery</p>
                  <p
                    className={cn(
                      'text-lg font-bold',
                      currentItem.masteryLevel >= 80
                        ? 'text-success'
                        : currentItem.masteryLevel >= 50
                          ? 'text-yellow'
                          : 'text-error'
                    )}
                  >
                    {Math.round(currentItem.masteryLevel)}%
                  </p>
                  {/* Mini trajectory for this concept */}
                  {currentMasteryHistory.length > 1 && (
                    <CompactTrajectory history={currentMasteryHistory} />
                  )}
                </div>
              </div>

              {/* Question */}
              <div className="bg-light-grey rounded-lg p-4">
                <p className="text-sm font-medium text-rich-black/70 mb-2">Explain this concept:</p>
                <p className="text-navy font-semibold">{currentItem.conceptDescription}</p>
              </div>

              {/* Answer Area */}
              {reviewState === 'reviewing' && (
                <div className="space-y-4">
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your explanation here..."
                    className={cn(
                      'w-full min-h-24 p-4 rounded-lg border-2 border-grey',
                      'focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20',
                      'text-navy placeholder-rich-black/40 text-sm resize-none'
                    )}
                  />

                  {!showHint && currentItem.keyTerms.length > 0 && (
                    <button
                      onClick={() => setShowHint(true)}
                      className="text-sm text-teal hover:underline"
                    >
                      Need a hint?
                    </button>
                  )}

                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-yellow-light/20 rounded-lg border border-yellow/30"
                      >
                        <p className="text-sm text-navy">
                          <strong>Key terms to remember:</strong> {currentItem.keyTerms.join(', ')}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleShowAnswer}
                    rightIcon={<ChevronRight size={20} />}
                  >
                    Check Answer
                  </Button>
                </div>
              )}

              {/* Answer Reveal */}
              {reviewState === 'showing_answer' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {currentItem.keyTerms.length > 0 && (
                    <div className="p-4 bg-light-teal/20 rounded-lg border border-teal/30">
                      <p className="text-sm font-medium text-teal mb-2">Key Points:</p>
                      <ul className="text-sm text-navy space-y-1">
                        {currentItem.keyTerms.map((term, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-teal mt-1">*</span>
                            <span>{term}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-sm text-rich-black/70 text-center">
                    How well did you know this?
                  </p>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRate(40)}
                      disabled={isSubmitting}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-error-light border-2 border-error/30 hover:border-error',
                        'text-error font-medium',
                        isSubmitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <XCircle size={20} className="mx-auto mb-1" />
                      <span className="text-xs">Again</span>
                    </button>
                    <button
                      onClick={() => handleRate(60)}
                      disabled={isSubmitting}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-yellow-light/20 border-2 border-yellow/30 hover:border-yellow',
                        'text-yellow-dark font-medium',
                        isSubmitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Clock size={20} className="mx-auto mb-1" />
                      <span className="text-xs">Hard</span>
                    </button>
                    <button
                      onClick={() => handleRate(80)}
                      disabled={isSubmitting}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-success-light border-2 border-success/30 hover:border-success',
                        'text-success font-medium',
                        isSubmitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <CheckCircle size={20} className="mx-auto mb-1" />
                      <span className="text-xs">Good</span>
                    </button>
                    <button
                      onClick={() => handleRate(100)}
                      disabled={isSubmitting}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-teal/10 border-2 border-teal/30 hover:border-teal',
                        'text-teal font-medium',
                        isSubmitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <TrendingUp size={20} className="mx-auto mb-1" />
                      <span className="text-xs">Easy</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Stats */}
      <div className="flex items-center justify-center gap-6 text-sm text-rich-black/60">
        <span>
          <CheckCircle size={14} className="inline mr-1 text-success" />
          {sessionStats.correct} correct
        </span>
        <span>
          <TrendingUp size={14} className="inline mr-1 text-teal" />
          {sessionStats.reviewed} reviewed
        </span>
      </div>
    </div>
  );
}
