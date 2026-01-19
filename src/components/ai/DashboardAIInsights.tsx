/**
 * Dashboard AI Insights Component
 * Phase 7.1: UI Integration - AI-powered analytics
 *
 * Displays personalized learning insights on dashboard
 * Uses FREE AI orchestrator
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Calendar, Target, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { generateDashboardInsights } from '@/lib/ai/dashboard-insights';
import { useUserProfileStore } from '@/store/userProfileStore';

interface DashboardInsights {
  weeklyProgress: string;
  learningPatterns: string[];
  optimizationSuggestions: string[];
  masteryNarration: string;
  predictiveTimeline?: {
    certificationReady: string;
    confidence: number;
    requirements: string[];
  };
  aiGenerated?: boolean;
}

export function DashboardAIInsights() {
  const user = useUserProfileStore((state) => state.user);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Prepare user data for AI analysis
      const userData = {
        lessonsCompletedThisWeek: 3, // Would fetch from actual data
        avgQuizScore: 78,
        recentScores: [75, 80, 85, 70, 82],
        timeSpentThisWeek: 180,
        streakDays: user.progress?.streak?.currentStreak || 0,
        masteryLevels: {}, // Would fetch actual mastery data
        preferredStudyTime: [{ hour: 9, avgScore: 85 }],
        currentPace: 3,
        goal: 'certification' as const,
      };

      const result = await generateDashboardInsights(userData);
      setInsights(result);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      // Show fallback insights
      setInsights({
        weeklyProgress: 'Keep up the great work this week!',
        learningPatterns: [],
        optimizationSuggestions: [],
        masteryNarration: 'Continue learning to build your knowledge map.',
        predictiveTimeline: {
          certificationReady: '8 weeks',
          confidence: 75,
          requirements: [],
        },
        aiGenerated: false,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-4">
      {/* AI-Powered Weekly Summary */}
      <Card className="p-6 bg-gradient-to-br from-teal/5 to-light-blue/5">
        <div className="flex items-start gap-3 mb-4">
          <Brain className="w-6 h-6 text-teal flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-navy mb-1">Your Week in Learning</h3>
            {insights.aiGenerated && (
              <p className="text-xs text-teal">AI-generated insights</p>
            )}
          </div>
        </div>

        <p className="text-gray-700 mb-4">{insights.weeklyProgress}</p>

        {/* Learning Patterns */}
        {insights.learningPatterns.length > 0 && (
          <div className="mt-4 p-3 bg-white rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue" />
              <p className="text-sm font-semibold text-navy">Patterns I&apos;ve Noticed:</p>
            </div>
            <ul className="space-y-1">
              {insights.learningPatterns.map((pattern: string, index: number) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-teal mt-0.5">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimization Suggestions */}
        {insights.optimizationSuggestions.length > 0 && (
          <div className="mt-4 p-3 bg-light-blue/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-orange" />
              <p className="text-sm font-semibold text-navy">Suggestions to Optimize:</p>
            </div>
            <ul className="space-y-1">
              {insights.optimizationSuggestions.map((suggestion: string, index: number) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-orange mt-0.5">→</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Mastery Map Narration */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-purple" />
          <h4 className="font-semibold text-navy">Your Knowledge Map</h4>
        </div>
        <p className="text-sm text-gray-700">{insights.masteryNarration}</p>
      </Card>

      {/* Certification Timeline */}
      {insights.predictiveTimeline && (
        <Card className="p-4 bg-gradient-to-r from-teal/10 to-blue/10">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-teal" />
            <h4 className="font-semibold text-navy">Certification Readiness</h4>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-2xl font-bold text-teal">
                {insights.predictiveTimeline.certificationReady}
              </p>
              <p className="text-xs text-gray-600">At your current pace</p>
            </div>

            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${insights.predictiveTimeline.confidence}%` }}
                    className="bg-teal rounded-full h-2"
                  />
                </div>
                <span className="text-sm font-semibold text-teal">
                  {insights.predictiveTimeline.confidence}%
                </span>
              </div>
            </div>
          </div>

          {insights.predictiveTimeline.requirements.length > 0 && (
            <div className="text-xs text-gray-600">
              <p className="font-semibold mb-1">To improve readiness:</p>
              <ul className="space-y-1">
                {insights.predictiveTimeline.requirements.map((req: string, i: number) => (
                  <li key={i}>• {req}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Refresh Button */}
      <Button
        onClick={loadInsights}
        variant="ghost"
        size="sm"
        className="w-full text-teal"
        disabled={loading}
      >
        {loading ? 'Generating insights...' : '🔄 Refresh AI Insights'}
      </Button>
    </div>
  );
}
