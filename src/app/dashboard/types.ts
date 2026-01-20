/**
 * Dashboard Types
 * Type definitions for the bento grid dashboard components
 */

// ============================================
// API Response Types
// ============================================

export interface VelocityData {
  atomsPerHour: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  percentChange: number;
}

export interface CompletionPrediction {
  predictedDate: string;
  confidence: number;
  daysRemaining: number;
}

export interface SkillInfo {
  name: string;
  mastery: number;
  reason: string;
}

export interface SkillsData {
  strongest: SkillInfo;
  focusArea: SkillInfo;
}

export interface ModelInfo {
  type: 'BKT' | 'Hybrid' | 'DKT';
  version: string;
  lastUpdated: string;
}

export interface DashboardInsights {
  velocity: VelocityData;
  completion: CompletionPrediction;
  skills: SkillsData;
  averageDailyMinutes: number;
  modelInfo: ModelInfo;
}

// ============================================
// Review Queue Types
// ============================================

export interface ReviewItem {
  conceptId: string;
  conceptName: string;
  masteryLevel: number;
  dueDate: string | null;
  urgency: 'high' | 'medium' | 'low';
  mlMastery: number;
  confidence: number;
}

export interface ReviewBatch {
  estimatedDurationMinutes: number;
  expectedRetentionGain: number;
  batchReasoning: string;
}

export interface OptimalReviewTime {
  hour: number;
  confidence: number;
  reasoning: string;
}

export interface ReviewForecastDay {
  date: string;
  dueCount: number;
  estimatedMinutes: number;
}

export interface UrgencySummary {
  high: number;
  medium: number;
  low: number;
}

export interface ReviewDueResponse {
  success: boolean;
  dueCount: number;
  items: ReviewItem[];
  batch: ReviewBatch;
  optimalTime: OptimalReviewTime;
  urgencySummary: UrgencySummary;
  forecast?: ReviewForecastDay[];
}

// ============================================
// Activity Heatmap Types
// ============================================

export interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = no activity, 4 = max activity
}

// ============================================
// Dashboard Data Hook Types
// ============================================

export interface DashboardData {
  // From /api/dashboard/insights
  insights: DashboardInsights | null;

  // From /api/review/due
  reviewQueue: ReviewDueResponse | null;

  // Derived from user store
  progress: {
    overallPercentage: number;
    lessonsCompleted: number;
    atomsCompleted: number;
    totalLessons: number;
    currentCourseId: string;
    currentModuleId?: string;
    currentLessonId?: string;
    xp: number;
  } | null;

  streak: {
    currentStreak: number;
    longestStreak: number;
    freezesAvailable: number;
  } | null;

  // Activity data (computed from interactions)
  activityData: ActivityDay[];

  // Loading states
  isLoading: boolean;
  isCourseLoading: boolean;
  isInsightsLoading: boolean;
  isReviewLoading: boolean;

  // Error state
  error: string | null;
}

// ============================================
// Component Props Types
// ============================================

export interface BentoCardProps {
  className?: string;
  children: React.ReactNode;
  span?: '1x1' | '1x2' | '2x1' | '2x2' | '3x1';
}

export interface ProgressRingCardProps {
  percentage: number;
  courseName: string;
  moduleTitle: string;
  lessonsCompleted: number;
  totalLessons: number;
  atomsCompleted?: number;
  onContinueLearning?: () => void;
}

export interface SkillSpotlightCardProps {
  strongest: SkillInfo;
  focusArea: SkillInfo;
  onPractice: (skillName: string) => void;
}

export interface ReviewQueueCardProps {
  dueCount: number;
  urgencySummary: UrgencySummary;
  estimatedMinutes: number;
  forecast?: ReviewForecastDay[];
  onStartReview: () => void;
}

export interface VelocityCardProps {
  trend: 'increasing' | 'stable' | 'decreasing';
  daysRemaining: number;
  confidence: number;
}

export interface ActivityHeatmapProps {
  data: ActivityDay[];
  weeks?: number;
}

export interface FloatingActionButtonProps {
  label: string;
  onClick: () => void;
  isNewUser?: boolean;
}
