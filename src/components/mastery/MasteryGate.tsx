'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, TrendingUp, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import {
  type ConceptId,
  type Concept,
  SOCIAL_MEDIA_MARKETING_GRAPH,
  isConceptUnlocked,
} from '@/lib/mastery';

// ============================================
// TYPES
// ============================================

type MasteryGateProps = {
  conceptId: ConceptId;
  masteryLevels: Record<ConceptId, number>;
  onReviewPrerequisite: (conceptId: ConceptId) => void;
  children: React.ReactNode;
};

type PrerequisiteStatus = {
  concept: Concept;
  mastery: number;
  threshold: number;
  isMastered: boolean;
};

// ============================================
// MASTERY GATE COMPONENT
// ============================================

export function MasteryGate({
  conceptId,
  masteryLevels,
  onReviewPrerequisite,
  children,
}: MasteryGateProps) {
  const [showDetails, setShowDetails] = useState(false);

  const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[conceptId];

  // Calculate prerequisite status
  const prerequisiteStatus = useMemo<PrerequisiteStatus[]>(() => {
    if (!concept) return [];

    return concept.prerequisites.map(prereqId => {
      const prereqConcept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[prereqId];
      if (!prereqConcept) {
        return {
          concept: { id: prereqId, name: 'Unknown', description: '', category: '', difficulty: 1, prerequisites: [], relatedConcepts: [], masteryThreshold: 70, decayRate: 30, atomIds: [], keyTerms: [] } as Concept,
          mastery: 0,
          threshold: 70,
          isMastered: false,
        };
      }
      const mastery = masteryLevels[prereqId] || 0;
      return {
        concept: prereqConcept,
        mastery,
        threshold: prereqConcept.masteryThreshold,
        isMastered: mastery >= prereqConcept.masteryThreshold,
      };
    });
  }, [concept, masteryLevels]);

  const isUnlocked = useMemo(() => {
    return isConceptUnlocked(SOCIAL_MEDIA_MARKETING_GRAPH, conceptId, masteryLevels);
  }, [conceptId, masteryLevels]);

  const overallProgress = useMemo(() => {
    if (prerequisiteStatus.length === 0) return 100;
    const total = prerequisiteStatus.reduce((sum, p) => sum + Math.min(p.mastery / p.threshold, 1), 0);
    return Math.round((total / prerequisiteStatus.length) * 100);
  }, [prerequisiteStatus]);

  const unmasteredPrereqs = prerequisiteStatus.filter(p => !p.isMastered);

  // If unlocked, render children
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Locked state
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Locked Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          variant="outlined"
          padding="lg"
          className="border-2 border-yellow/50 bg-yellow-light/10"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow/20 flex items-center justify-center flex-shrink-0">
              <Lock size={24} className="text-yellow" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-navy mb-1">
                {concept?.name || 'Content Locked'}
              </h3>
              <p className="text-sm text-rich-black/70">
                Master the prerequisite concepts to unlock this content.
                This ensures you have the foundation needed to succeed.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Progress Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-navy">Prerequisites Progress</h4>
            <span className="text-sm font-medium text-teal">{overallProgress}%</span>
          </div>
          <ProgressBar
            value={overallProgress}
            max={100}
            size="md"
            animated
          />
          <p className="text-xs text-rich-black/60">
            {unmasteredPrereqs.length} of {prerequisiteStatus.length} prerequisites remaining
          </p>
        </Card>
      </motion.div>

      {/* Prerequisite List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-navy">What You Need</h4>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-teal hover:underline"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {prerequisiteStatus.map((prereq, idx) => (
          <motion.div
            key={prereq.concept.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.3 + idx * 0.05 }}
          >
            <Card
              variant={prereq.isMastered ? 'default' : 'outlined'}
              padding="md"
              className={cn(
                'flex items-center gap-4 transition-all',
                prereq.isMastered
                  ? 'bg-success-light/20 border-success/30'
                  : 'hover:border-teal/50 cursor-pointer'
              )}
              onClick={() => !prereq.isMastered && onReviewPrerequisite(prereq.concept.id)}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  prereq.isMastered ? 'bg-success/20' : 'bg-light-grey'
                )}
              >
                {prereq.isMastered ? (
                  <Unlock size={20} className="text-success" />
                ) : (
                  <Lock size={20} className="text-grey" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-medium truncate',
                    prereq.isMastered ? 'text-success' : 'text-navy'
                  )}
                >
                  {prereq.concept.name}
                </p>
                {showDetails && (
                  <p className="text-xs text-rich-black/60 mt-1">
                    {prereq.concept.description}
                  </p>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    'text-sm font-bold',
                    prereq.isMastered
                      ? 'text-success'
                      : prereq.mastery >= prereq.threshold * 0.7
                      ? 'text-yellow'
                      : 'text-rich-black/60'
                  )}
                >
                  {Math.round(prereq.mastery)}%
                </p>
                <p className="text-xs text-rich-black/50">
                  / {prereq.threshold}%
                </p>
              </div>

              {!prereq.isMastered && (
                <ChevronRight size={20} className="text-grey flex-shrink-0" />
              )}
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Learning Path Suggestion */}
      {unmasteredPrereqs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card variant="gradient" padding="lg" className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-teal" />
              <h4 className="font-semibold text-navy">Recommended Next Step</h4>
            </div>
            <p className="text-sm text-rich-black/70">
              Start with <strong>{unmasteredPrereqs[0].concept.name}</strong> to
              build your foundation. You&apos;re{' '}
              {Math.round(
                (unmasteredPrereqs[0].mastery / unmasteredPrereqs[0].threshold) * 100
              )}
              % of the way there!
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => onReviewPrerequisite(unmasteredPrereqs[0].concept.id)}
              rightIcon={<TrendingUp size={18} />}
            >
              Continue Learning
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Motivational Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="text-center text-sm text-rich-black/60"
      >
        <p>
          Taking time to master fundamentals leads to deeper understanding and
          better long-term retention.
        </p>
      </motion.div>
    </div>
  );
}
