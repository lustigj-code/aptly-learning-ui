/**
 * Learning Style Adaptation System
 *
 * Adapts content presentation based on user preferences and observed behavior.
 * Tracks which formats lead to better outcomes for each user.
 */

// ============================================
// TYPES
// ============================================

export type LearningStyle = 'visual' | 'reading' | 'kinesthetic' | 'mixed';
export type ContentFormat = 'video' | 'reading' | 'interactive' | 'practice';

export type UserPreferences = {
  preferredStyle: LearningStyle;
  preferVideoOrReading: 'video' | 'reading' | 'mixed';
  sessionLengthPreference: 'short' | 'medium' | 'long'; // 5-10, 15-20, 30+ min
  dailyGoalMinutes: number;
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  timezone: string;
  preferredStudyTime?: 'morning' | 'afternoon' | 'evening' | 'any';
};

export type FormatEffectiveness = {
  format: ContentFormat;
  completionRate: number; // 0-1
  averageScore: number; // 0-100
  engagementTime: number; // seconds
  retentionScore: number; // 0-100 (based on spaced rep performance)
  sampleSize: number;
};

export type AdaptationProfile = {
  userId: string;
  preferences: UserPreferences;
  formatEffectiveness: FormatEffectiveness[];
  observedBehavior: {
    averageSessionLength: number;
    preferredTimeOfDay: string;
    skipRate: number;
    replayRate: number; // Video-specific
    scrollSpeed: number; // Reading-specific
    hintUsage: number; // Practice-specific
  };
  lastUpdated: Date;
};

export type ContentRecommendation = {
  format: ContentFormat;
  reason: string;
  confidence: number; // 0-1
  alternativeFormats: ContentFormat[];
};

// ============================================
// LEARNING STYLE DETECTION
// ============================================

/**
 * Detect learning style from behavioral patterns
 */
export function detectLearningStyle(profile: AdaptationProfile): LearningStyle {
  const { formatEffectiveness, observedBehavior } = profile;

  // Calculate effectiveness scores for each style
  const videoEffectiveness = formatEffectiveness.find(f => f.format === 'video');
  const readingEffectiveness = formatEffectiveness.find(f => f.format === 'reading');
  const interactiveEffectiveness = formatEffectiveness.find(f => f.format === 'interactive');
  const practiceEffectiveness = formatEffectiveness.find(f => f.format === 'practice');

  // Weight by retention and completion
  const scores = {
    visual: calculateStyleScore(videoEffectiveness, observedBehavior.replayRate),
    reading: calculateStyleScore(readingEffectiveness, 1 - observedBehavior.scrollSpeed / 100),
    kinesthetic: calculateStyleScore(interactiveEffectiveness, 1 - observedBehavior.hintUsage / 100) +
                 calculateStyleScore(practiceEffectiveness, 1 - observedBehavior.hintUsage / 100),
    mixed: 50, // Base score for mixed
  };

  // Find best style
  const entries = Object.entries(scores) as [LearningStyle, number][];
  entries.sort((a, b) => b[1] - a[1]);

  // If top score isn't significantly better, default to mixed
  if (entries[0][1] - entries[1][1] < 15) {
    return 'mixed';
  }

  return entries[0][0];
}

function calculateStyleScore(
  effectiveness: FormatEffectiveness | undefined,
  engagementFactor: number
): number {
  if (!effectiveness || effectiveness.sampleSize < 3) return 40; // Default

  return (
    effectiveness.retentionScore * 0.4 +
    effectiveness.averageScore * 0.3 +
    effectiveness.completionRate * 100 * 0.2 +
    engagementFactor * 100 * 0.1
  );
}

// ============================================
// CONTENT ADAPTATION
// ============================================

/**
 * Get recommended content format for a user
 */
export function getRecommendedFormat(
  profile: AdaptationProfile,
  availableFormats: ContentFormat[],
  conceptDifficulty: number = 3 // 1-5
): ContentRecommendation {
  const { preferences, formatEffectiveness } = profile;

  // Start with user preference
  let primaryFormat: ContentFormat = preferences.preferVideoOrReading === 'video'
    ? 'video'
    : preferences.preferVideoOrReading === 'reading'
    ? 'reading'
    : 'video'; // Default for mixed

  // Check if we have effectiveness data
  const formatStats = formatEffectiveness.reduce((acc, f) => {
    acc[f.format] = f;
    return acc;
  }, {} as Record<ContentFormat, FormatEffectiveness>);

  // Override based on observed effectiveness (if we have enough data)
  let reason = `Based on your ${preferences.preferVideoOrReading} preference`;
  let confidence = 0.6;

  // For difficult concepts, prefer more interactive formats
  if (conceptDifficulty >= 4) {
    if (availableFormats.includes('interactive')) {
      primaryFormat = 'interactive';
      reason = 'Interactive content recommended for complex topics';
      confidence = 0.7;
    } else if (availableFormats.includes('practice')) {
      primaryFormat = 'practice';
      reason = 'Practice exercises help with challenging concepts';
      confidence = 0.65;
    }
  }

  // Check effectiveness data
  const relevantStats = Object.entries(formatStats)
    .filter(([format]) => availableFormats.includes(format as ContentFormat))
    .sort((a, b) => {
      const aScore = calculateEffectivenessScore(a[1]);
      const bScore = calculateEffectivenessScore(b[1]);
      return bScore - aScore;
    });

  if (relevantStats.length > 0 && relevantStats[0][1].sampleSize >= 5) {
    const bestFormat = relevantStats[0][0] as ContentFormat;
    const bestStats = relevantStats[0][1];

    if (bestStats.retentionScore > 70 && bestStats.completionRate > 0.8) {
      primaryFormat = bestFormat;
      reason = `${bestFormat} works best for you (${Math.round(bestStats.retentionScore)}% retention)`;
      confidence = 0.85;
    }
  }

  // Get alternatives
  const alternativeFormats = availableFormats
    .filter(f => f !== primaryFormat)
    .sort((a, b) => {
      const aStats = formatStats[a];
      const bStats = formatStats[b];
      if (!aStats && !bStats) return 0;
      if (!aStats) return 1;
      if (!bStats) return -1;
      return calculateEffectivenessScore(bStats) - calculateEffectivenessScore(aStats);
    });

  return {
    format: primaryFormat,
    reason,
    confidence,
    alternativeFormats,
  };
}

function calculateEffectivenessScore(stats: FormatEffectiveness): number {
  return (
    stats.retentionScore * 0.4 +
    stats.averageScore * 0.3 +
    stats.completionRate * 100 * 0.2 +
    Math.min(stats.sampleSize, 20) * 0.5 // Bonus for more data
  );
}

// ============================================
// SESSION ADAPTATION
// ============================================

/**
 * Adapt session based on user's current state
 */
export function getSessionRecommendation(profile: AdaptationProfile): {
  suggestedDuration: number;
  suggestedActivity: 'learn_new' | 'review' | 'practice';
  message: string;
} {
  const { preferences, observedBehavior } = profile;
  const currentHour = new Date().getHours();

  // Determine ideal duration
  let suggestedDuration = preferences.dailyGoalMinutes || 15;

  // Adjust based on observed behavior
  if (observedBehavior.averageSessionLength > 0) {
    // Blend preference with behavior
    suggestedDuration = Math.round(
      suggestedDuration * 0.4 + observedBehavior.averageSessionLength * 0.6
    );
  }

  // Time of day adjustments
  if (currentHour >= 21 || currentHour <= 6) {
    suggestedDuration = Math.min(suggestedDuration, 15);
  }

  // Determine activity type
  let suggestedActivity: 'learn_new' | 'review' | 'practice' = 'learn_new';
  let message = 'Ready to learn something new!';

  // If high skip rate recently, suggest review
  if (observedBehavior.skipRate > 0.3) {
    suggestedActivity = 'review';
    message = "Let's reinforce what you've learned before moving on.";
  }

  // If high hint usage, suggest practice
  if (observedBehavior.hintUsage > 0.5) {
    suggestedActivity = 'practice';
    message = 'Practice makes perfect! Try applying what you know.';
  }

  // Morning = fresh learning, evening = review
  if (preferences.preferredStudyTime) {
    if (
      preferences.preferredStudyTime === 'morning' &&
      currentHour >= 6 &&
      currentHour < 12
    ) {
      suggestedActivity = 'learn_new';
      message = 'Great morning energy! Perfect time for new concepts.';
    } else if (
      preferences.preferredStudyTime === 'evening' &&
      currentHour >= 18
    ) {
      suggestedActivity = 'review';
      message = 'Evening review helps consolidate learning.';
    }
  }

  return {
    suggestedDuration,
    suggestedActivity,
    message,
  };
}

// ============================================
// TRACKING & UPDATES
// ============================================

/**
 * Update format effectiveness based on completed content
 */
export function updateFormatEffectiveness(
  profile: AdaptationProfile,
  format: ContentFormat,
  completed: boolean,
  score: number,
  timeSpent: number,
  retentionScore?: number
): AdaptationProfile {
  const existingIndex = profile.formatEffectiveness.findIndex(
    f => f.format === format
  );

  const existing = existingIndex >= 0
    ? profile.formatEffectiveness[existingIndex]
    : {
        format,
        completionRate: 0,
        averageScore: 0,
        engagementTime: 0,
        retentionScore: 0,
        sampleSize: 0,
      };

  // Update with running average
  const newSampleSize = existing.sampleSize + 1;
  const updated: FormatEffectiveness = {
    format,
    completionRate:
      (existing.completionRate * existing.sampleSize + (completed ? 1 : 0)) / newSampleSize,
    averageScore:
      (existing.averageScore * existing.sampleSize + score) / newSampleSize,
    engagementTime:
      (existing.engagementTime * existing.sampleSize + timeSpent) / newSampleSize,
    retentionScore: retentionScore !== undefined
      ? (existing.retentionScore * existing.sampleSize + retentionScore) / newSampleSize
      : existing.retentionScore,
    sampleSize: newSampleSize,
  };

  const newEffectiveness = [...profile.formatEffectiveness];
  if (existingIndex >= 0) {
    newEffectiveness[existingIndex] = updated;
  } else {
    newEffectiveness.push(updated);
  }

  return {
    ...profile,
    formatEffectiveness: newEffectiveness,
    lastUpdated: new Date(),
  };
}

/**
 * Create initial adaptation profile for new user
 */
export function createInitialProfile(
  userId: string,
  preferences: Partial<UserPreferences>
): AdaptationProfile {
  return {
    userId,
    preferences: {
      preferredStyle: 'mixed',
      preferVideoOrReading: preferences.preferVideoOrReading || 'mixed',
      sessionLengthPreference: 'medium',
      dailyGoalMinutes: preferences.dailyGoalMinutes || 15,
      voiceEnabled: preferences.voiceEnabled || false,
      notificationsEnabled: true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...preferences,
    },
    formatEffectiveness: [],
    observedBehavior: {
      averageSessionLength: 0,
      preferredTimeOfDay: 'any',
      skipRate: 0,
      replayRate: 0,
      scrollSpeed: 50,
      hintUsage: 0,
    },
    lastUpdated: new Date(),
  };
}
