/**
 * Goal-Based Personalization System
 *
 * Tailors the learning experience based on user's stated goals:
 * - Get certified
 * - Learn for work
 * - Career change
 * - General knowledge
 */

// ============================================
// TYPES
// ============================================

export type UserGoal =
  | 'certification'
  | 'work_skills'
  | 'career_change'
  | 'general_knowledge'
  | 'specific_skill';

export type GoalProfile = {
  primaryGoal: UserGoal;
  targetDate?: Date;
  specificSkills?: string[];
  industryContext?: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  timeCommitment: 'casual' | 'moderate' | 'intensive'; // <15, 15-30, 30+ min/day
  motivations: string[];
};

export type PersonalizedExperience = {
  contentPrioritization: ContentPriority[];
  dashboardLayout: DashboardConfig;
  coachPersonality: CoachPersonality;
  milestones: Milestone[];
  recommendedPath: string[];
  motivationalMessages: string[];
};

export type ContentPriority = {
  contentType: 'theory' | 'practice' | 'case_study' | 'exam_prep' | 'real_world';
  priority: number; // 1-10
  reason: string;
};

export type DashboardConfig = {
  primaryWidget: 'progress' | 'review_queue' | 'next_lesson' | 'exam_countdown';
  showCertificationProgress: boolean;
  showIndustryTips: boolean;
  showCareerResources: boolean;
  showQuickPractice: boolean;
};

export type CoachPersonality = {
  tone: 'encouraging' | 'professional' | 'casual' | 'challenging';
  focusArea: 'conceptual' | 'practical' | 'exam_focused';
  exampleStyle: 'industry_specific' | 'general' | 'case_study';
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  targetDate?: Date;
  progress: number;
  isComplete: boolean;
  reward?: string;
};

// ============================================
// GOAL PROFILES
// ============================================

const GOAL_CONFIGS: Record<UserGoal, {
  contentPriorities: ContentPriority[];
  dashboard: DashboardConfig;
  coach: CoachPersonality;
  motivations: string[];
}> = {
  certification: {
    contentPriorities: [
      { contentType: 'exam_prep', priority: 10, reason: 'Direct exam preparation' },
      { contentType: 'theory', priority: 8, reason: 'Core concepts for certification' },
      { contentType: 'practice', priority: 7, reason: 'Reinforce exam topics' },
      { contentType: 'case_study', priority: 5, reason: 'Real-world context' },
      { contentType: 'real_world', priority: 4, reason: 'Practical application' },
    ],
    dashboard: {
      primaryWidget: 'exam_countdown',
      showCertificationProgress: true,
      showIndustryTips: false,
      showCareerResources: false,
      showQuickPractice: true,
    },
    coach: {
      tone: 'professional',
      focusArea: 'exam_focused',
      exampleStyle: 'general',
    },
    motivations: [
      'Every study session gets you closer to that certification!',
      'Your future employer will see that credential on your resume.',
      "Passing this exam proves you've mastered the fundamentals.",
      'Certification opens doors to new opportunities.',
    ],
  },
  work_skills: {
    contentPriorities: [
      { contentType: 'real_world', priority: 10, reason: 'Immediate job application' },
      { contentType: 'practice', priority: 9, reason: 'Hands-on skill building' },
      { contentType: 'case_study', priority: 8, reason: 'Learn from real campaigns' },
      { contentType: 'theory', priority: 6, reason: 'Foundation knowledge' },
      { contentType: 'exam_prep', priority: 3, reason: 'Optional certification' },
    ],
    dashboard: {
      primaryWidget: 'next_lesson',
      showCertificationProgress: false,
      showIndustryTips: true,
      showCareerResources: false,
      showQuickPractice: true,
    },
    coach: {
      tone: 'professional',
      focusArea: 'practical',
      exampleStyle: 'industry_specific',
    },
    motivations: [
      'These skills will make an impact at work tomorrow!',
      'Your team will notice your new expertise.',
      "Learning by doing is the fastest path to proficiency.",
      'Real campaigns, real results. Apply what you learn immediately.',
    ],
  },
  career_change: {
    contentPriorities: [
      { contentType: 'theory', priority: 9, reason: 'Build strong foundation' },
      { contentType: 'real_world', priority: 8, reason: 'Understand the industry' },
      { contentType: 'case_study', priority: 8, reason: 'Learn industry standards' },
      { contentType: 'practice', priority: 7, reason: 'Build portfolio skills' },
      { contentType: 'exam_prep', priority: 6, reason: 'Credential for career change' },
    ],
    dashboard: {
      primaryWidget: 'progress',
      showCertificationProgress: true,
      showIndustryTips: true,
      showCareerResources: true,
      showQuickPractice: false,
    },
    coach: {
      tone: 'encouraging',
      focusArea: 'conceptual',
      exampleStyle: 'case_study',
    },
    motivations: [
      'Every expert was once a beginner. You\'re on your way!',
      'Career changes take courage. You\'ve got this.',
      'Building a new skill set is an investment in your future.',
      'Soon you\'ll be speaking the language of digital marketing fluently.',
    ],
  },
  general_knowledge: {
    contentPriorities: [
      { contentType: 'theory', priority: 8, reason: 'Broad understanding' },
      { contentType: 'case_study', priority: 8, reason: 'Interesting examples' },
      { contentType: 'real_world', priority: 7, reason: 'Practical context' },
      { contentType: 'practice', priority: 5, reason: 'Hands-on experience' },
      { contentType: 'exam_prep', priority: 2, reason: 'Not a priority' },
    ],
    dashboard: {
      primaryWidget: 'next_lesson',
      showCertificationProgress: false,
      showIndustryTips: true,
      showCareerResources: false,
      showQuickPractice: false,
    },
    coach: {
      tone: 'casual',
      focusArea: 'conceptual',
      exampleStyle: 'general',
    },
    motivations: [
      'Curiosity is the best teacher. Keep exploring!',
      'Understanding digital marketing helps in any modern career.',
      "There's always something new to discover.",
      'Knowledge is power. You\'re getting more powerful every day.',
    ],
  },
  specific_skill: {
    contentPriorities: [
      { contentType: 'practice', priority: 10, reason: 'Focus on the skill' },
      { contentType: 'real_world', priority: 9, reason: 'Immediate application' },
      { contentType: 'theory', priority: 6, reason: 'Just enough context' },
      { contentType: 'case_study', priority: 5, reason: 'Relevant examples' },
      { contentType: 'exam_prep', priority: 1, reason: 'Not relevant' },
    ],
    dashboard: {
      primaryWidget: 'review_queue',
      showCertificationProgress: false,
      showIndustryTips: false,
      showCareerResources: false,
      showQuickPractice: true,
    },
    coach: {
      tone: 'challenging',
      focusArea: 'practical',
      exampleStyle: 'industry_specific',
    },
    motivations: [
      'Focused practice leads to mastery.',
      'You\'re developing a specialized skill. That\'s valuable.',
      'Deep expertise in one area opens doors.',
      'Practice makes permanent. Keep at it!',
    ],
  },
};

// ============================================
// PERSONALIZATION FUNCTIONS
// ============================================

/**
 * Generate personalized experience based on goal profile
 */
export function generatePersonalizedExperience(
  profile: GoalProfile
): PersonalizedExperience {
  const config = GOAL_CONFIGS[profile.primaryGoal];

  // Generate milestones based on goal
  const milestones = generateMilestones(profile);

  // Generate recommended learning path
  const recommendedPath = generateLearningPath(profile);

  // Select motivational messages
  const motivationalMessages = selectMotivationalMessages(profile, config.motivations);

  return {
    contentPrioritization: config.contentPriorities,
    dashboardLayout: config.dashboard,
    coachPersonality: config.coach,
    milestones,
    recommendedPath,
    motivationalMessages,
  };
}

/**
 * Generate personalized milestones based on goal
 */
function generateMilestones(profile: GoalProfile): Milestone[] {
  const milestones: Milestone[] = [];
  const now = new Date();

  // Common early milestone
  milestones.push({
    id: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    progress: 0,
    isComplete: false,
    reward: '25 XP',
  });

  // Goal-specific milestones
  switch (profile.primaryGoal) {
    case 'certification':
      milestones.push(
        {
          id: 'complete_module_1',
          title: 'Foundation Complete',
          description: 'Master the fundamentals module',
          targetDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          progress: 0,
          isComplete: false,
          reward: 'Foundation Badge',
        },
        {
          id: 'practice_exam',
          title: 'Practice Exam Ready',
          description: 'Score 80%+ on practice exams',
          targetDate: profile.targetDate,
          progress: 0,
          isComplete: false,
          reward: 'Exam Ready Badge',
        },
        {
          id: 'certification_ready',
          title: 'Certification Ready',
          description: 'Complete all modules with 85%+ mastery',
          targetDate: profile.targetDate,
          progress: 0,
          isComplete: false,
          reward: 'Certification Ready Badge',
        }
      );
      break;

    case 'work_skills':
      milestones.push(
        {
          id: 'first_campaign',
          title: 'Campaign Creator',
          description: 'Complete your first campaign simulation',
          progress: 0,
          isComplete: false,
          reward: 'Campaign Creator Badge',
        },
        {
          id: 'analytics_master',
          title: 'Analytics Master',
          description: 'Master the measurement module',
          progress: 0,
          isComplete: false,
          reward: 'Analytics Badge',
        }
      );
      break;

    case 'career_change':
      milestones.push(
        {
          id: 'industry_overview',
          title: 'Industry Overview',
          description: 'Complete introduction to digital marketing',
          progress: 0,
          isComplete: false,
          reward: '50 XP',
        },
        {
          id: 'portfolio_piece',
          title: 'Portfolio Ready',
          description: 'Complete a case study you can show employers',
          progress: 0,
          isComplete: false,
          reward: 'Portfolio Badge',
        }
      );
      break;

    default:
      milestones.push({
        id: 'explorer',
        title: 'Explorer',
        description: 'Complete 5 lessons in any area',
        progress: 0,
        isComplete: false,
        reward: 'Explorer Badge',
      });
  }

  return milestones;
}

/**
 * Generate recommended learning path
 */
function generateLearningPath(profile: GoalProfile): string[] {
  const path: string[] = [];

  // Core path based on experience level
  if (profile.experienceLevel === 'beginner') {
    path.push(
      'smm-fundamentals',
      'platform-overview',
      'audience-basics',
      'content-basics'
    );
  }

  // Goal-specific additions
  switch (profile.primaryGoal) {
    case 'certification':
      path.push(
        'campaign-objectives',
        'campaign-structure',
        'budget-basics',
        'ad-formats',
        'analytics-basics',
        'conversion-tracking',
        'optimization-basics'
      );
      break;

    case 'work_skills':
      path.push(
        'audience-targeting',
        'ad-formats',
        'analytics-basics',
        'optimization-basics',
        'ab-testing'
      );
      break;

    case 'career_change':
      path.push(
        'campaign-objectives',
        'audience-basics',
        'creative-fundamentals',
        'analytics-basics',
        'industry-overview'
      );
      break;

    default:
      // Flexible path for general knowledge
      path.push('campaign-objectives', 'audience-basics', 'creative-fundamentals');
  }

  // Add specific skills if mentioned
  if (profile.specificSkills) {
    for (const skill of profile.specificSkills) {
      if (!path.includes(skill)) {
        path.push(skill);
      }
    }
  }

  return path;
}

/**
 * Select appropriate motivational messages
 */
function selectMotivationalMessages(
  profile: GoalProfile,
  baseMessages: string[]
): string[] {
  const messages = [...baseMessages];

  // Add time-based messages if target date exists
  if (profile.targetDate) {
    const daysUntil = Math.ceil(
      (profile.targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    if (daysUntil <= 7) {
      messages.push("You're in the final stretch! Stay focused.");
    } else if (daysUntil <= 30) {
      messages.push(`${daysUntil} days until your goal. You've got this!`);
    }
  }

  // Add commitment-based messages
  switch (profile.timeCommitment) {
    case 'intensive':
      messages.push('Your dedication is impressive. Keep that momentum!');
      break;
    case 'casual':
      messages.push('Even small steps lead to big progress over time.');
      break;
  }

  return messages;
}

/**
 * Get a random motivational message for the user
 */
export function getMotivationalMessage(experience: PersonalizedExperience): string {
  const messages = experience.motivationalMessages;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get coach instructions based on personality settings
 */
export function getCoachInstructions(personality: CoachPersonality): string {
  const toneInstructions = {
    encouraging: 'Be warm, supportive, and celebrate small wins. Use phrases like "Great job!" and "You\'re making progress!"',
    professional: 'Be clear, direct, and business-like. Focus on actionable insights and best practices.',
    casual: 'Be friendly and conversational. Use everyday language and relatable examples.',
    challenging: 'Push the student to think deeper. Ask tough questions and don\'t accept surface-level answers.',
  };

  const focusInstructions = {
    conceptual: 'Emphasize understanding "why" before "how". Connect concepts to bigger picture.',
    practical: 'Focus on immediate application. Give actionable steps they can use right away.',
    exam_focused: 'Highlight what\'s likely to be tested. Use practice questions and exam-style scenarios.',
  };

  const exampleInstructions = {
    industry_specific: 'Use examples from real companies and current campaigns in their industry.',
    general: 'Use universal examples that anyone can relate to, like local businesses or personal experiences.',
    case_study: 'Reference specific case studies and documented campaign results.',
  };

  return `
COACH PERSONALITY INSTRUCTIONS:
Tone: ${toneInstructions[personality.tone]}
Focus: ${focusInstructions[personality.focusArea]}
Examples: ${exampleInstructions[personality.exampleStyle]}
`;
}
