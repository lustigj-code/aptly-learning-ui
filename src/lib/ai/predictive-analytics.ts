/**
 * Predictive Analytics for Learning
 * Phase 6: Predict where users will struggle and intervene proactively
 *
 * Uses ML model to predict quiz performance before user attempts
 * Cost: $0 (client-side inference using simple model)
 *
 * Upgrade Path: Can enhance with more sophisticated ML when needed
 */

export type UserLearningFeatures = {
  // Past performance
  recentQuizScores: number[];
  avgTimePerAtom: number;
  completionRate: number;

  // Current state
  currentConceptMastery: number;
  prerequisiteMastery: number[];
  totalXP: number;
  currentLevel: number;
  streakDays: number;

  // Behavioral patterns
  preferredLearningTime: 'morning' | 'afternoon' | 'evening' | 'night';
  avgSessionLength: number;
  quizRetakeRate: number;

  // Demographics
  experienceLevel: number; // 0-100
  learningPace: 'light' | 'moderate' | 'intensive';
  goal: 'certification' | 'practical' | 'career_change';
};

export type StrugglePrediction = {
  willStruggle: boolean;
  confidence: number; // 0-100
  predictedScore: number; // 0-100
  riskFactors: string[];
  recommendations: string[];
};

/**
 * Predict if user will struggle on upcoming content
 * Simple rule-based model (FREE)
 * Upgrade: Can replace with trained ML model
 */
export function predictStruggle(
  features: UserLearningFeatures,
  upcomingConcept: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    prerequisites: string[];
    avgStudentScore: number;
  }
): StrugglePrediction {
  const riskFactors: string[] = [];
  let struggleScore = 0;

  // Factor 1: Prerequisite mastery (30% weight)
  const avgPrerequisiteMastery =
    features.prerequisiteMastery.length > 0
      ? features.prerequisiteMastery.reduce((a, b) => a + b, 0) / features.prerequisiteMastery.length
      : 70;

  if (avgPrerequisiteMastery < 70) {
    struggleScore += 30;
    riskFactors.push(`Prerequisite mastery is ${Math.round(avgPrerequisiteMastery)}% (recommend >70%)`);
  } else if (avgPrerequisiteMastery < 80) {
    struggleScore += 15;
  }

  // Factor 2: Recent performance trend (25% weight)
  const recentAvg =
    features.recentQuizScores.length > 0
      ? features.recentQuizScores.reduce((a, b) => a + b, 0) / features.recentQuizScores.length
      : 70;

  if (recentAvg < 60) {
    struggleScore += 25;
    riskFactors.push(`Recent quiz average is ${Math.round(recentAvg)}% (below passing)`);
  } else if (recentAvg < 70) {
    struggleScore += 15;
  }

  // Factor 3: Difficulty match (20% weight)
  if (upcomingConcept.difficulty === 'advanced' && features.experienceLevel < 70) {
    struggleScore += 20;
    riskFactors.push('Advanced content but intermediate experience level');
  }

  // Factor 4: Current concept mastery (15% weight)
  if (features.currentConceptMastery < 75) {
    struggleScore += 15;
    riskFactors.push('Current concept not yet mastered (rushing ahead?)');
  }

  // Factor 5: Retake rate (10% weight)
  if (features.quizRetakeRate > 0.3) {
    struggleScore += 10;
    riskFactors.push('High quiz retake rate indicates consistent struggles');
  }

  // Predict score based on patterns
  const predictedScore = Math.max(
    20,
    Math.min(
      95,
      avgPrerequisiteMastery * 0.4 + recentAvg * 0.4 + features.currentConceptMastery * 0.2
    )
  );

  // Generate recommendations
  const recommendations = generateRecommendations(riskFactors, features, upcomingConcept);

  return {
    willStruggle: struggleScore > 50,
    confidence: Math.min(struggleScore, 85), // Cap confidence at 85%
    predictedScore: Math.round(predictedScore),
    riskFactors,
    recommendations,
  };
}

/**
 * Generate personalized recommendations to prevent struggle
 */
function generateRecommendations(
  riskFactors: string[],
  features: UserLearningFeatures,
  _upcomingConcept: Record<string, unknown>
): string[] {
  const recommendations: string[] = [];

  if (riskFactors.some((r) => r.includes('Prerequisite'))) {
    recommendations.push(
      'Complete a 5-minute prerequisite refresher before starting this lesson. It will significantly improve your understanding.'
    );
  }

  if (riskFactors.some((r) => r.includes('Recent quiz average'))) {
    recommendations.push(
      'Your recent scores suggest you might be moving too fast. Consider reviewing previous lessons before continuing.'
    );
  }

  if (riskFactors.some((r) => r.includes('Advanced content'))) {
    recommendations.push(
      'This is advanced content. I recommend completing the intermediate lessons first, then returning to this.'
    );
  }

  if (features.streakDays > 7 && features.avgSessionLength < 15) {
    recommendations.push(
      'You\'re on a great streak! Consider slightly longer sessions (20-25 minutes) to deepen understanding.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('You\'re well-prepared for this content. Proceed with confidence!');
  }

  return recommendations;
}

/**
 * Adaptive scaffolding - adjust content difficulty on the fly
 */
export function determineAdaptiveScaffolding(
  prediction: StrugglePrediction,
  _userProgress: UserLearningFeatures
): {
  shouldScaffold: boolean;
  scaffoldingType: 'examples' | 'prerequisites' | 'simplified' | 'none';
  message: string;
} {
  if (!prediction.willStruggle) {
    return {
      shouldScaffold: false,
      scaffoldingType: 'none',
      message: '',
    };
  }

  // High confidence prediction of struggle
  if (prediction.confidence > 70) {
    if (prediction.riskFactors.some((r) => r.includes('Prerequisite'))) {
      return {
        shouldScaffold: true,
        scaffoldingType: 'prerequisites',
        message:
          'I predict this lesson will be challenging without stronger prerequisites. Let me offer a quick refresher first.',
      };
    }

    return {
      shouldScaffold: true,
      scaffoldingType: 'simplified',
      message:
        'Based on your learning pattern, I recommend starting with a simplified overview before the full lesson.',
    };
  }

  // Moderate confidence - offer examples
  if (prediction.confidence > 50) {
    return {
      shouldScaffold: true,
      scaffoldingType: 'examples',
      message: 'This concept can be tricky. Would extra examples help before diving in?',
    };
  }

  return {
    shouldScaffold: false,
    scaffoldingType: 'none',
    message: '',
  };
}

/**
 * Learning path optimization
 * Reorder lessons based on predicted success probability
 */
export function optimizeLearningPath(
  availableLessons: Array<{ id: string; title: string; difficulty: string; prerequisites: string[] }>,
  userFeatures: UserLearningFeatures,
  userMastery: Record<string, number>
): Array<{ lessonId: string; recommendationScore: number; reasoning: string }> {
  return availableLessons
    .map((lesson) => {
      // Calculate recommendation score (0-100)
      let score = 50; // Base

      // Boost if prerequisites are strong
      const prereqStrength =
        lesson.prerequisites.length > 0
          ? lesson.prerequisites
              .map((p) => userMastery[p] || 0)
              .reduce((a, b) => a + b, 0) / lesson.prerequisites.length
          : 100;

      score += (prereqStrength - 70) * 0.5; // +/- up to 15 points

      // Boost if difficulty matches experience
      if (lesson.difficulty === 'beginner' && userFeatures.experienceLevel < 40) score += 10;
      if (lesson.difficulty === 'intermediate' && userFeatures.experienceLevel >= 40 && userFeatures.experienceLevel < 70)
        score += 10;
      if (lesson.difficulty === 'advanced' && userFeatures.experienceLevel >= 70) score += 10;

      // Penalize if difficulty mismatch
      if (lesson.difficulty === 'advanced' && userFeatures.experienceLevel < 60) score -= 20;

      const reasoning = `Prerequisites: ${Math.round(prereqStrength)}%, Difficulty match: ${lesson.difficulty}`;

      return {
        lessonId: lesson.id,
        recommendationScore: Math.max(0, Math.min(100, score)),
        reasoning,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
}
