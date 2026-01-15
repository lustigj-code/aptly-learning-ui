/**
 * Teacher Analytics Types and Constants
 *
 * Shared between API routes and client components
 */

import type { MasteryLevel } from '@/types';

// FSM Course concepts extracted from quiz questions
export const FSM_CONCEPTS = [
  { id: 'facebook-history', name: 'Facebook History', lesson: 1 },
  { id: 'platform-knowledge', name: 'Platform Knowledge', lesson: 1 },
  { id: 'facebook-business', name: 'Facebook Business', lesson: 1 },
  { id: 'facebook-features', name: 'Facebook Features', lesson: 1 },
  { id: 'instagram-strategy', name: 'Instagram Strategy', lesson: 2 },
  { id: 'content-strategy', name: 'Content Strategy', lesson: 2 },
  { id: 'hashtag-strategy', name: 'Hashtag Strategy', lesson: 2 },
  { id: 'instagram-analytics', name: 'Instagram Analytics', lesson: 2 },
  { id: 'engagement-tactics', name: 'Engagement Tactics', lesson: 2 },
  { id: 'snapchat-demographics', name: 'Snapchat Demographics', lesson: 3 },
  { id: 'snapchat-features', name: 'Snapchat Features', lesson: 3 },
  { id: 'snapchat-best-practices', name: 'Snapchat Best Practices', lesson: 3 },
  { id: 'snapchat-strategy', name: 'Snapchat Strategy', lesson: 3 },
  { id: 'policy-fundamentals', name: 'Policy Fundamentals', lesson: 4 },
  { id: 'policy-management', name: 'Policy Management', lesson: 4 },
  { id: 'policy-ethics', name: 'Policy Ethics', lesson: 4 },
  { id: 'policy-guidelines', name: 'Policy Guidelines', lesson: 4 },
  { id: 'policy-implementation', name: 'Policy Implementation', lesson: 4 },
  { id: 'channel-strategy', name: 'Channel Strategy', lesson: 5 },
  { id: 'platform-selection', name: 'Platform Selection', lesson: 5 },
  { id: 'platform-demographics', name: 'Platform Demographics', lesson: 5 },
  { id: 'campaign-objectives', name: 'Campaign Objectives', lesson: 6 },
  { id: 'marketing-funnel', name: 'Marketing Funnel', lesson: 6 },
  { id: 'objective-selection', name: 'Objective Selection', lesson: 6 },
  { id: 'campaign-strategy', name: 'Campaign Strategy', lesson: 6 },
  { id: 'budget-types', name: 'Budget Types', lesson: 7 },
  { id: 'learning-phase', name: 'Learning Phase', lesson: 7 },
  { id: 'scaling-strategy', name: 'Scaling Strategy', lesson: 7 },
  { id: 'cbo', name: 'CBO (Budget Optimization)', lesson: 7 },
] as const;

export type ConceptInfo = (typeof FSM_CONCEPTS)[number];

export interface StudentMasteryData {
  id: string;
  name: string;
  email: string;
  masteryLevels: MasteryLevel[];
  averageMastery: number;
  lastActiveAt: string | null;
}

export interface ClassAnalyticsResponse {
  success: boolean;
  data: {
    students: StudentMasteryData[];
    concepts: typeof FSM_CONCEPTS;
    classAverageMastery: number;
    totalStudents: number;
  };
}
