'use client';

import { useState, useCallback, useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import type { ProgressReportData } from '@/components/progress/ExportProgressReport';
import type { MasteryDataPoint } from '@/components/progress/MasteryTrajectoryChart';
import type { PredictionStats } from '@/components/progress/PredictionAccuracyWidget';
import type { SkillGap } from '@/components/progress/SkillGapAnalysis';
import type { SkillPrediction } from '@/components/progress/TimeToMasteryWidget';

export type ProgressVisualizationData = {
  masteryHistory: MasteryDataPoint[];
  skillGaps: SkillGap[];
  masteryPredictions: SkillPrediction[];
  predictionStats: PredictionStats;
};

export type UseProgressReportResult = {
  report: ProgressReportData | null;
  visualization: ProgressVisualizationData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useProgressReport(userId: string | null): UseProgressReportResult {
  const [report, setReport] = useState<ProgressReportData | null>(null);
  const [visualization, setVisualization] = useState<ProgressVisualizationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!userId) {
      setReport(null);
      setVisualization(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `/api/progress/report?userId=${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch report: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
        setVisualization(data.visualization);
      } else {
        throw new Error(data.error || 'Failed to fetch report');
      }
    } catch (err) {
      console.error('Error fetching progress report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    report,
    visualization,
    isLoading,
    error,
    refresh: fetchReport,
  };
}

// Generate mock data for demo/development
export function generateMockProgressData(): {
  report: ProgressReportData;
  visualization: ProgressVisualizationData;
} {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  // Generate mastery history
  const masteryHistory: MasteryDataPoint[] = [];
  for (let i = 0; i <= 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    masteryHistory.push({
      date: date.toISOString(),
      pMastery: Math.min(0.85, 0.1 + (i / 30) * 0.75 + Math.random() * 0.1),
    });
  }

  // Generate skill gaps
  const skillGaps: SkillGap[] = [
    {
      skillId: 'prompt-engineering',
      skillName: 'Prompt Engineering',
      currentMastery: 0.45,
      targetMastery: 0.95,
      gap: 0.5,
      reason: 'More practice recommended',
      lessonId: '1.2',
    },
    {
      skillId: 'ai-ethics',
      skillName: 'AI Ethics & Bias',
      currentMastery: 0.55,
      targetMastery: 0.95,
      gap: 0.4,
      reason: 'More practice recommended',
      lessonId: '2.1',
    },
    {
      skillId: 'tool-integration',
      skillName: 'AI Tool Integration',
      currentMastery: 0.65,
      targetMastery: 0.95,
      gap: 0.3,
      reason: 'Almost mastered',
      lessonId: '3.1',
    },
    {
      skillId: 'data-analysis',
      skillName: 'AI Data Analysis',
      currentMastery: 0.72,
      targetMastery: 0.95,
      gap: 0.23,
      reason: 'Almost mastered',
      lessonId: '4.1',
    },
  ];

  // Generate mastery predictions
  const masteryPredictions: SkillPrediction[] = skillGaps.map(gap => ({
    skillId: gap.skillId,
    skillName: gap.skillName,
    currentMastery: gap.currentMastery,
    targetMastery: 0.95,
    estimatedDays: Math.ceil(gap.gap / 0.03),
    learningVelocity: 0.025 + Math.random() * 0.02,
    confidence: 0.7 + gap.currentMastery * 0.2,
  }));

  const report: ProgressReportData = {
    user: {
      name: 'Demo User',
      email: 'demo@example.com',
      joinedAt: startDate.toISOString(),
    },
    summary: {
      overallProgress: 62,
      totalTimeSpent: 485,
      lessonsCompleted: 18,
      totalLessons: 47,
      averageMastery: 0.65,
      currentStreak: 7,
      longestStreak: 12,
    },
    skills: {
      mastered: [
        { name: 'AI Fundamentals', mastery: 0.98, masteredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
        { name: 'ChatGPT Basics', mastery: 0.96 },
      ],
      inProgress: skillGaps.map(g => ({
        name: g.skillName,
        mastery: g.currentMastery,
        estimatedDays: Math.ceil(g.gap / 0.03),
      })),
      notStarted: [
        { name: 'Advanced AI Workflows' },
        { name: 'AI Collaboration' },
      ],
    },
    predictions: {
      estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      predictedExamScore: 78,
      readinessLevel: 'almost_ready',
    },
    recentActivity: [
      { date: new Date().toISOString(), description: 'Completed Prompt Engineering Lesson', xpEarned: 50 },
      { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), description: 'Passed AI Ethics Quiz', xpEarned: 75 },
      { date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), description: 'Started new module', xpEarned: 25 },
    ],
  };

  const visualization: ProgressVisualizationData = {
    masteryHistory,
    skillGaps,
    masteryPredictions,
    predictionStats: {
      totalPredictions: 156,
      correctPredictions: 127,
      modelType: 'Hybrid',
      lastUpdated: new Date(),
      confidenceScore: 0.81,
    },
  };

  return { report, visualization };
}

export default useProgressReport;
