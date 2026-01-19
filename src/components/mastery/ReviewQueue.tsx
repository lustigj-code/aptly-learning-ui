'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, TrendingUp, ChevronRight, RotateCcw, CheckCircle, XCircle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import { useInteractionLogger } from '@/hooks/useInteractionLogger';
import {
  type ConceptMastery,
  type Concept,
  SOCIAL_MEDIA_MARKETING_GRAPH,
  getDueForReview,
  updateConceptMastery,
  predictIntervalsForRatings,
} from '@/lib/mastery';

// ============================================
// TYPES
// ============================================

type ReviewQueueProps = {
  userId: string;
  masteryRecords: ConceptMastery[];
  onMasteryUpdate: (updatedMastery: ConceptMastery) => void;
  onComplete?: () => void;
};

type ReviewCardData = {
  mastery: ConceptMastery;
  concept: Concept;
};

type ReviewState = 'idle' | 'reviewing' | 'showing_answer' | 'complete';

// ============================================
// REVIEW QUEUE COMPONENT
// ============================================

export function ReviewQueue({
  userId: _userId,
  masteryRecords,
  onMasteryUpdate,
  onComplete,
}: ReviewQueueProps) {
  // Build review queue from mastery records (computed once per masteryRecords change)
  const initialQueue = useMemo(() => {
    const dueItems = getDueForReview(masteryRecords, 15);
    return dueItems
      .map(mastery => {
        const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[mastery.conceptId];
        if (!concept) return null;
        return { mastery, concept };
      })
      .filter((item): item is ReviewCardData => item !== null);
  }, [masteryRecords]);

  const [queue, setQueue] = useState<ReviewCardData[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewState, setReviewState] = useState<ReviewState>(() =>
    initialQueue.length > 0 ? 'reviewing' : 'idle'
  );
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    streak: 0,
  });
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(() =>
    initialQueue.length > 0 ? Date.now() : null
  );

  // Track attempt numbers per concept
  const attemptCountRef = useRef<Record<string, number>>({});

  // Interaction logging for ML model training
  const { logReviewAttempt, logHintRequest } = useInteractionLogger();

  // Update queue when masteryRecords change (after initial render)
  useEffect(() => {
    if (initialQueue !== queue && initialQueue.length > 0) {
      setQueue(initialQueue);
      setReviewState('reviewing');
      setStartTime(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueue]);

  const currentCard = queue[currentIndex];
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  // Calculate predicted intervals for current card's FSRS state
  const predictedIntervals = useMemo(() => {
    if (!currentCard) return { again: '<1d', hard: '1d', good: '3d', easy: '1w' };
    return predictIntervalsForRatings(currentCard.mastery.fsrsState);
  }, [currentCard]);

  const handleShowAnswer = () => {
    setReviewState('showing_answer');
  };

  const handleRate = useCallback((score: number) => {
    if (!currentCard || !startTime) return;

    const responseTimeMs = Date.now() - startTime;
    const correct = score >= 70;

    // Get or initialize attempt count for this concept
    const conceptId = currentCard.concept.id;
    const attemptNumber = (attemptCountRef.current[conceptId] || 0) + 1;
    attemptCountRef.current[conceptId] = attemptNumber;

    // Calculate mastery values for logging
    const pMasteryBefore = currentCard.mastery.masteryLevel / 100;

    // Update mastery
    const updatedMastery = updateConceptMastery(
      currentCard.mastery,
      score,
      Math.floor(responseTimeMs / 1000),
      'review'
    );
    const pMasteryAfter = updatedMastery.masteryLevel / 100;

    // Log the review attempt for ML model training
    logReviewAttempt({
      skillId: conceptId,
      skillName: currentCard.concept.name,
      isCorrect: correct,
      responseTimeMs,
      attemptNumber,
      pMasteryBefore,
      pMasteryAfter,
    });

    onMasteryUpdate(updatedMastery);

    // Update session stats
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (correct ? 1 : 0),
      streak: correct ? prev.streak + 1 : 0,
    }));

    // Move to next or complete
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setReviewState('reviewing');
      setUserAnswer('');
      setShowHint(false);
      setStartTime(Date.now());
    } else {
      setReviewState('complete');
      onComplete?.();
    }
  }, [currentCard, currentIndex, queue.length, startTime, onMasteryUpdate, onComplete, logReviewAttempt]);

  const resetSession = () => {
    setCurrentIndex(0);
    setReviewState(queue.length > 0 ? 'reviewing' : 'idle');
    setSessionStats({ reviewed: 0, correct: 0, streak: 0 });
    setUserAnswer('');
    setShowHint(false);
    setStartTime(Date.now());
  };

  // No items due
  if (queue.length === 0 && reviewState === 'idle') {
    return (
      <Card variant="gradient" padding="xl" className="text-center max-w-md mx-auto">
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
            You have no concepts due for review right now. Great job staying on top of your learning!
          </p>
          <p className="text-sm text-rich-black/50">
            Check back later or continue learning new content.
          </p>
        </motion.div>
      </Card>
    );
  }

  // Session complete
  if (reviewState === 'complete') {
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0;

    return (
      <Card variant="gradient" padding="xl" className="text-center max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="w-20 h-20 mx-auto bg-teal/10 rounded-full flex items-center justify-center">
            <Brain size={40} className="text-teal" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-navy">Review Complete!</h3>
            <p className="text-rich-black/70 mt-2">
              Great job strengthening your knowledge!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-navy">{sessionStats.reviewed}</p>
              <p className="text-xs text-rich-black/60">Reviewed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{accuracy}%</p>
              <p className="text-xs text-rich-black/60">Accuracy</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-dark">{sessionStats.streak}</p>
              <p className="text-xs text-rich-black/60">Best Streak</p>
            </div>
          </div>

          {accuracy >= 80 ? (
            <p className="text-sm text-success bg-success-light p-3 rounded-lg">
              Excellent retention! Your memory is getting stronger.
            </p>
          ) : accuracy >= 60 ? (
            <p className="text-sm text-yellow-dark bg-yellow-light p-3 rounded-lg">
              Good progress! Keep reviewing to strengthen these concepts.
            </p>
          ) : (
            <p className="text-sm text-error bg-error-light p-3 rounded-lg">
              These concepts need more practice. Consider reviewing the related lessons.
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={resetSession}
            leftIcon={<RotateCcw size={20} />}
          >
            Review Again
          </Button>
        </motion.div>
      </Card>
    );
  }

  // Active review
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-teal" />
            <span className="font-semibold text-navy">Daily Review</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-rich-black/60">
              {currentIndex + 1} of {queue.length}
            </span>
            {sessionStats.streak >= 3 && (
              <div className="flex items-center gap-1 text-yellow-dark">
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
        {currentCard && (
          <motion.div
            key={currentCard.concept.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card variant="elevated" padding="xl" className="space-y-6">
              {/* Concept Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className="inline-block px-2 py-1 text-xs font-medium rounded-full mb-2"
                    style={{
                      backgroundColor: `${SOCIAL_MEDIA_MARKETING_GRAPH.categories.find(
                        c => c.id === currentCard.concept.category
                      )?.color}20`,
                      color: SOCIAL_MEDIA_MARKETING_GRAPH.categories.find(
                        c => c.id === currentCard.concept.category
                      )?.color,
                    }}
                  >
                    {currentCard.concept.category}
                  </span>
                  <h2 className="text-xl font-bold text-navy">
                    {currentCard.concept.name}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-rich-black/60">Mastery</p>
                  <p
                    className={cn(
                      'text-lg font-bold',
                      currentCard.mastery.masteryLevel >= 80
                        ? 'text-success'
                        : currentCard.mastery.masteryLevel >= 50
                        ? 'text-yellow'
                        : 'text-error'
                    )}
                  >
                    {Math.round(currentCard.mastery.masteryLevel)}%
                  </p>
                </div>
              </div>

              {/* Question */}
              <div className="bg-light-grey rounded-lg p-4">
                <p className="text-sm font-medium text-rich-black/70 mb-2">
                  Explain this concept:
                </p>
                <p className="text-navy font-semibold">
                  {currentCard.concept.description}
                </p>
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

                  {!showHint && (
                    <button
                      onClick={() => {
                        // Log hint request for ML training
                        if (currentCard) {
                          logHintRequest({
                            atomId: `review-${currentCard.concept.id}`,
                            skillId: currentCard.concept.id,
                            hintsUsedBefore: 0,
                          });
                        }
                        setShowHint(true);
                      }}
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
                          <strong>Key terms to remember:</strong>{' '}
                          {currentCard.concept.keyTerms.join(', ')}
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
                  <div className="p-4 bg-light-teal/20 rounded-lg border border-teal/30">
                    <p className="text-sm font-medium text-teal mb-2">Key Points:</p>
                    <ul className="text-sm text-navy space-y-1">
                      {currentCard.concept.keyTerms.map((term, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-teal mt-1">•</span>
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm text-rich-black/70 text-center">
                    How well did you know this?
                  </p>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRate(40)}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-error-light border-2 border-error/30 hover:border-error',
                        'text-error font-medium'
                      )}
                    >
                      <XCircle size={20} className="mx-auto mb-1" />
                      <span className="text-xs block">Again</span>
                      <span className="text-[10px] opacity-70">{predictedIntervals.again}</span>
                    </button>
                    <button
                      onClick={() => handleRate(60)}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-yellow-light/20 border-2 border-yellow/30 hover:border-yellow',
                        'text-yellow-dark font-medium'
                      )}
                    >
                      <Clock size={20} className="mx-auto mb-1" />
                      <span className="text-xs block">Hard</span>
                      <span className="text-[10px] opacity-70">{predictedIntervals.hard}</span>
                    </button>
                    <button
                      onClick={() => handleRate(80)}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-success-light border-2 border-success/30 hover:border-success',
                        'text-success font-medium'
                      )}
                    >
                      <CheckCircle size={20} className="mx-auto mb-1" />
                      <span className="text-xs block">Good</span>
                      <span className="text-[10px] opacity-70">{predictedIntervals.good}</span>
                    </button>
                    <button
                      onClick={() => handleRate(100)}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        'bg-teal/10 border-2 border-teal/30 hover:border-teal',
                        'text-teal font-medium'
                      )}
                    >
                      <TrendingUp size={20} className="mx-auto mb-1" />
                      <span className="text-xs block">Easy</span>
                      <span className="text-[10px] opacity-70">{predictedIntervals.easy}</span>
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
