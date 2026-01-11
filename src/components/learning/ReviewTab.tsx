/**
 * Review Tab Component
 * Phase 2.2: FSRS Integration - Show review queue in learn page
 *
 * Displays due review items for spaced repetition
 * Fetches from /api/review/due and submits to /api/review/complete
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, Calendar, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ReviewQueue } from '@/components/mastery/ReviewQueue';
import { useUnifiedStore } from '@/store/unifiedStore';
import { get, post } from '@/lib/api/client';
import { SOCIAL_MEDIA_MARKETING_GRAPH } from '@/lib/mastery/knowledgeGraph';
import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';

type ReviewItem = {
  conceptId: string;
  conceptName: string;
  conceptDescription: string;
  category: string;
  masteryLevel: number;
  lastReviewedAt: string | null;
  dueDate: string | null;
  reviewCount: number;
  fsrsState: unknown;
  keyTerms: string[];
};

export function ReviewTab() {
  const user = useUnifiedStore((state) => state.user);
  const [reviewItems, setReviewItems] = useState<ConceptMastery[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewQueue, setShowReviewQueue] = useState(false);

  const loadReviewQueue = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Fetch due reviews from API
      const response = await get<{ items: ReviewItem[]; dueCount?: number }>('/api/review/due?limit=20');

      if (response.success && response.data?.items) {
        // Transform API items to ConceptMastery format for ReviewQueue component
        const masteryRecords: ConceptMastery[] = response.data.items.map((item: ReviewItem) => {
          const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[item.conceptId];
          return {
            conceptId: item.conceptId,
            userId: user.id,
            masteryLevel: item.masteryLevel || 0,
            lastReviewedAt: item.lastReviewedAt ? new Date(item.lastReviewedAt) : new Date(),
            lastQuizScore: 0,
            reviewCount: item.reviewCount || 0,
            correctStreak: 0,
            incorrectStreak: 0,
            fsrsState: (item.fsrsState as ConceptMastery['fsrsState']) || {
              stability: 0,
              difficulty: 0,
              elapsedDays: 0,
              scheduledDays: 0,
              reps: 0,
              lapses: 0,
              state: 'new',
            },
            nextReviewAt: item.dueDate ? new Date(item.dueDate) : new Date(),
            history: [],
          };
        });

        setReviewItems(masteryRecords);
        setDueCount(response.data?.dueCount || 0);
      }
    } catch (error) {
      console.error('Failed to load review queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadReviewQueue();
  }, [loadReviewQueue]);

  const handleMasteryUpdate = async (updated: ConceptMastery) => {
    // Submit review completion to API
    try {
      await post('/api/review/complete', {
        conceptId: updated.conceptId,
        score: updated.lastQuizScore || 80,
        timeSpentSeconds: 60,
      });

      // Remove from local state (it's no longer due)
      setReviewItems((prev) =>
        prev.filter((item) => item.conceptId !== updated.conceptId)
      );
      setDueCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to update mastery:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (showReviewQueue && dueCount > 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-navy">Review Session</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowReviewQueue(false)}>
            Back
          </Button>
        </div>

        <ReviewQueue
          userId={user?.id || ''}
          masteryRecords={reviewItems}
          onMasteryUpdate={handleMasteryUpdate}
          onComplete={() => {
            setShowReviewQueue(false);
            loadReviewQueue(); // Refresh the queue
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-teal" />
        <h2 className="text-2xl font-bold text-navy">Spaced Repetition</h2>
      </div>

      {dueCount === 0 ? (
        <Card className="p-8 text-center">
          <TrendingUp className="w-16 h-16 text-green mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-navy mb-2">All Caught Up!</h3>
          <p className="text-gray-600 mb-4">
            You don't have any reviews due today. Great work staying on top of your learning!
          </p>
          <p className="text-sm text-gray-500">
            Complete more lessons to build your review queue and strengthen long-term retention.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-navy">Reviews Due Today</h3>
                <p className="text-sm text-gray-600">
                  Strengthen your knowledge with spaced repetition
                </p>
              </div>
              <div className="text-3xl font-bold text-teal">{dueCount}</div>
            </div>

            <ProgressBar
              value={0}
              max={dueCount}
              showLabel
              className="mb-4"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Takes ~{Math.ceil(dueCount * 0.5)} minutes</span>
              </div>
              <Button onClick={() => setShowReviewQueue(true)}>
                Start Reviewing
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-light-blue/10">
            <h4 className="font-semibold text-navy mb-2">Why Review?</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-teal mt-1">•</span>
                <span>
                  <strong>Spaced repetition</strong> increases long-term retention by 30-50%
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal mt-1">•</span>
                <span>
                  Reviews are timed for when you're <strong>about to forget</strong> - maximizing learning
                  efficiency
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal mt-1">•</span>
                <span>Each review strengthens neural pathways and deepens understanding</span>
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
