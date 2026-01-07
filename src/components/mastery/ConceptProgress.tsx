'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import {
  type ConceptMastery,
  type Concept,
  SOCIAL_MEDIA_MARKETING_GRAPH,
  predictMasteryDecay,
} from '@/lib/mastery';

// ============================================
// TYPES
// ============================================

type ConceptProgressProps = {
  mastery: ConceptMastery;
  showDetails?: boolean;
  onClick?: () => void;
};

// ============================================
// CONCEPT PROGRESS COMPONENT
// ============================================

export function ConceptProgress({
  mastery,
  showDetails = false,
  onClick,
}: ConceptProgressProps) {
  const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[mastery.conceptId];

  const status = useMemo(() => {
    const now = new Date();

    if (mastery.masteryLevel >= (concept?.masteryThreshold || 80)) {
      if (mastery.nextReviewAt <= now) {
        return 'due';
      }
      const decayDate = predictMasteryDecay(mastery, concept?.masteryThreshold || 80);
      if (decayDate && decayDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        return 'decaying';
      }
      return 'mastered';
    }
    return 'learning';
  }, [mastery, concept]);

  const category = SOCIAL_MEDIA_MARKETING_GRAPH.categories.find(
    c => c.id === concept?.category
  );

  const daysUntilReview = useMemo(() => {
    const now = new Date();
    const diff = mastery.nextReviewAt.getTime() - now.getTime();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }, [mastery.nextReviewAt]);

  const StatusIcon = () => {
    switch (status) {
      case 'mastered':
        return <CheckCircle size={16} className="text-success" />;
      case 'due':
        return <Clock size={16} className="text-yellow" />;
      case 'decaying':
        return <AlertCircle size={16} className="text-error" />;
      default:
        return <Brain size={16} className="text-teal" />;
    }
  };

  const statusLabel = {
    mastered: 'Mastered',
    due: 'Due for review',
    decaying: 'Needs attention',
    learning: 'In progress',
  }[status];

  if (!concept) {
    return null;
  }

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <Card
        variant="outlined"
        padding="md"
        className={cn(
          'transition-all',
          onClick && 'cursor-pointer hover:border-teal/50',
          status === 'due' && 'border-yellow/50 bg-yellow-light/5',
          status === 'decaying' && 'border-error/50 bg-error-light/5'
        )}
        onClick={onClick}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {category && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                <span className="text-xs text-rich-black/60">{category?.name}</span>
              </div>
              <h4 className="font-medium text-navy truncate">{concept.name}</h4>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <StatusIcon />
              <span
                className={cn(
                  status === 'mastered' && 'text-success',
                  status === 'due' && 'text-yellow',
                  status === 'decaying' && 'text-error',
                  status === 'learning' && 'text-teal'
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <ProgressBar
              value={mastery.masteryLevel}
              max={100}
              size="sm"
            />
            <div className="flex items-center justify-between text-xs text-rich-black/60">
              <span>{Math.round(mastery.masteryLevel)}% mastery</span>
              <span>Target: {concept.masteryThreshold}%</span>
            </div>
          </div>

          {/* Details */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2 border-t border-light-grey space-y-2"
            >
              <p className="text-xs text-rich-black/70">{concept.description}</p>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-medium text-navy">{mastery.reviewCount}</p>
                  <p className="text-rich-black/50">Reviews</p>
                </div>
                <div>
                  <p className="font-medium text-navy">{mastery.correctStreak}</p>
                  <p className="text-rich-black/50">Streak</p>
                </div>
                <div>
                  <p
                    className={cn(
                      'font-medium',
                      daysUntilReview <= 0
                        ? 'text-yellow'
                        : daysUntilReview <= 3
                        ? 'text-teal'
                        : 'text-navy'
                    )}
                  >
                    {daysUntilReview <= 0
                      ? 'Now'
                      : `${daysUntilReview}d`}
                  </p>
                  <p className="text-rich-black/50">Next review</p>
                </div>
              </div>

              {/* FSRS Info */}
              <div className="flex items-center justify-between text-xs text-rich-black/50">
                <span>
                  Stability: {mastery.fsrsState.stability.toFixed(1)} days
                </span>
                <span>
                  Difficulty: {mastery.fsrsState.difficulty.toFixed(1)}/10
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================
// CONCEPT GRID COMPONENT
// ============================================

type ConceptGridProps = {
  masteryRecords: ConceptMastery[];
  onConceptClick?: (conceptId: string) => void;
  filterCategory?: string;
};

export function ConceptGrid({
  masteryRecords,
  onConceptClick,
  filterCategory,
}: ConceptGridProps) {
  const sortedRecords = useMemo(() => {
    let filtered = [...masteryRecords];

    if (filterCategory) {
      filtered = filtered.filter(m => {
        const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[m.conceptId];
        return concept?.category === filterCategory;
      });
    }

    // Sort by: due for review first, then by mastery level
    return filtered.sort((a, b) => {
      const now = new Date();
      const aIsDue = a.nextReviewAt <= now;
      const bIsDue = b.nextReviewAt <= now;

      if (aIsDue && !bIsDue) return -1;
      if (!aIsDue && bIsDue) return 1;

      return a.masteryLevel - b.masteryLevel;
    });
  }, [masteryRecords, filterCategory]);

  if (sortedRecords.length === 0) {
    return (
      <Card variant="outlined" padding="lg" className="text-center">
        <Brain size={32} className="mx-auto text-grey mb-2" />
        <p className="text-rich-black/60">No concepts to display</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sortedRecords.map(mastery => (
        <ConceptProgress
          key={mastery.conceptId}
          mastery={mastery}
          showDetails={false}
          onClick={onConceptClick ? () => onConceptClick(mastery.conceptId) : undefined}
        />
      ))}
    </div>
  );
}
