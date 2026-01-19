/**
 * Relationship Progression System
 *
 * Tracks and evolves the relationship between Sage and the user over time.
 * Creates a sense of journey and deepening connection as they learn together.
 */

// ============================================
// TYPES
// ============================================

export type RelationshipStage =
  | 'new_friend'       // Day 1-3: Just getting to know each other
  | 'building_trust'   // Day 4-14: Establishing patterns
  | 'good_rapport'     // Day 15-30: Comfortable working together
  | 'trusted_mentor'   // Day 31-60: Deep understanding
  | 'mastery_partner'  // Day 61+: Collaborative growth
  | 'certification_complete'; // After certification

export type RelationshipMilestone = {
  id: string;
  name: string;
  description: string;
  triggerCondition: MilestoneTrigger;
  sageMessage: string;
  emotionalWeight: 'subtle' | 'meaningful' | 'significant';
};

export type MilestoneTrigger =
  | { type: 'days_active'; days: number }
  | { type: 'lessons_completed'; count: number }
  | { type: 'streak_reached'; days: number }
  | { type: 'quiz_score'; score: number; count: number }
  | { type: 'module_completed'; moduleId: string }
  | { type: 'certification_ready' }
  | { type: 'first_struggle_overcome' }
  | { type: 'concept_mastered'; conceptId: string };

export type RelationshipState = {
  userId: string;
  stage: RelationshipStage;
  firstInteractionDate: Date;
  totalDaysActive: number;
  currentStreak: number;
  longestStreak: number;
  milestonesReached: string[];
  sharedMemories: SharedMemory[];
  lastInteractionDate: Date;
  emotionalDeposits: number; // Positive interactions accumulate
};

export type SharedMemory = {
  id: string;
  date: Date;
  type: 'struggle_overcome' | 'breakthrough' | 'milestone' | 'joke' | 'personal_share';
  description: string;
  canReference: boolean; // Can Sage reference this in future conversations?
};

export type RelationshipContext = {
  stage: RelationshipStage;
  stageDescription: string;
  daysKnown: number;
  recentMemories: SharedMemory[];
  suggestedReference?: string;
  appropriateIntimacyLevel: 'formal' | 'friendly' | 'warm' | 'close';
  contextualGreeting: string;
};

// ============================================
// RELATIONSHIP MILESTONES
// ============================================

export const RELATIONSHIP_MILESTONES: RelationshipMilestone[] = [
  // Day-based milestones
  {
    id: 'day_1',
    name: 'First Steps',
    description: 'Started the learning journey',
    triggerCondition: { type: 'days_active', days: 1 },
    sageMessage: "You showed up. That's the hardest part, honestly. Most people just think about learning - you're actually doing it.",
    emotionalWeight: 'meaningful',
  },
  {
    id: 'day_7',
    name: 'Week One Complete',
    description: 'One week of consistent learning',
    triggerCondition: { type: 'days_active', days: 7 },
    sageMessage: "A full week! You've been showing up, and I've noticed. This is when things start to really stick.",
    emotionalWeight: 'significant',
  },
  {
    id: 'day_14',
    name: 'Two Weeks Strong',
    description: 'Two weeks of learning',
    triggerCondition: { type: 'days_active', days: 14 },
    sageMessage: "Two weeks in. You're past the point where most people give up. That says something about you.",
    emotionalWeight: 'meaningful',
  },
  {
    id: 'day_30',
    name: 'Month One',
    description: 'One month of learning',
    triggerCondition: { type: 'days_active', days: 30 },
    sageMessage: "A whole month. Remember when targeting sounded like a foreign language? Look at you now, talking about lookalike audiences like it's nothing.",
    emotionalWeight: 'significant',
  },
  {
    id: 'day_60',
    name: 'Two Months',
    description: 'Two months of dedicated learning',
    triggerCondition: { type: 'days_active', days: 60 },
    sageMessage: "Two months. I've watched you grow from asking basic questions to having real insights. This journey has been something.",
    emotionalWeight: 'significant',
  },
  {
    id: 'day_90',
    name: 'Quarter Champion',
    description: 'Three months of learning',
    triggerCondition: { type: 'days_active', days: 90 },
    sageMessage: "Three months. You're not the same learner who started this journey. The questions you ask now? They're marketer questions. Professional questions. I'm proud of you.",
    emotionalWeight: 'significant',
  },

  // Progress-based milestones
  {
    id: 'first_quiz_ace',
    name: 'First Perfect Score',
    description: 'Got 100% on first quiz',
    triggerCondition: { type: 'quiz_score', score: 100, count: 1 },
    sageMessage: "Perfect score! And on your first try. That's not just luck - that's understanding.",
    emotionalWeight: 'meaningful',
  },
  {
    id: 'first_struggle_overcome',
    name: 'Persistence Pays Off',
    description: 'Mastered a concept after struggling',
    triggerCondition: { type: 'first_struggle_overcome' },
    sageMessage: "Remember when this concept had you stuck? Look at you now. This is why I believe in the struggle - it makes the victory real.",
    emotionalWeight: 'significant',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day learning streak',
    triggerCondition: { type: 'streak_reached', days: 7 },
    sageMessage: "Seven days in a row! Consistency beats intensity every time. You're proving it.",
    emotionalWeight: 'meaningful',
  },
  {
    id: 'streak_30',
    name: 'Streak Master',
    description: '30-day learning streak',
    triggerCondition: { type: 'streak_reached', days: 30 },
    sageMessage: "Thirty. Days. Straight. Do you realize how rare that is? You've built a real habit. This will serve you forever.",
    emotionalWeight: 'significant',
  },
  {
    id: 'certification_ready',
    name: 'Certification Ready',
    description: 'Ready to take the certification exam',
    triggerCondition: { type: 'certification_ready' },
    sageMessage: "You're ready. Not because I'm saying you are - because you've earned it. Every concept, every quiz, every conversation has led to this moment. Go get that certification. I'll be here when you pass.",
    emotionalWeight: 'significant',
  },
];

// ============================================
// STAGE DEFINITIONS
// ============================================

const STAGE_DEFINITIONS: Record<RelationshipStage, {
  description: string;
  intimacyLevel: 'formal' | 'friendly' | 'warm' | 'close';
  greetingStyle: string[];
  memoryReferenceFrequency: 'never' | 'rare' | 'occasional' | 'frequent';
}> = {
  new_friend: {
    description: 'Just getting to know each other - building initial rapport',
    intimacyLevel: 'friendly',
    greetingStyle: [
      "Good to see you!",
      "Ready to learn something new?",
      "Let's tackle this together.",
    ],
    memoryReferenceFrequency: 'never',
  },
  building_trust: {
    description: 'Establishing patterns and building familiarity',
    intimacyLevel: 'friendly',
    greetingStyle: [
      "Welcome back! I've been looking forward to this.",
      "There you are! Ready to pick up where we left off?",
      "Good timing - I was thinking about what we should explore next.",
    ],
    memoryReferenceFrequency: 'rare',
  },
  good_rapport: {
    description: 'Comfortable working relationship with mutual understanding',
    intimacyLevel: 'warm',
    greetingStyle: [
      "Hey! Your consistency is really paying off.",
      "Look who's back! I've been impressed with your progress.",
      "Perfect timing. I have something I think you'll find interesting.",
    ],
    memoryReferenceFrequency: 'occasional',
  },
  trusted_mentor: {
    description: 'Deep understanding of each other\'s style and needs',
    intimacyLevel: 'warm',
    greetingStyle: [
      "Great to see you. You know, I was thinking about something you said last time...",
      "You're here! I've been looking forward to continuing our conversation.",
      "Ah, perfect. I had a thought about your learning path I wanted to share.",
    ],
    memoryReferenceFrequency: 'frequent',
  },
  mastery_partner: {
    description: 'Collaborative relationship focused on advanced growth',
    intimacyLevel: 'close',
    greetingStyle: [
      "Here we are again. You know, at this point you could probably teach some of this yourself.",
      "The expert returns! What shall we dive into today?",
      "I always enjoy our sessions. You ask the kinds of questions that make me think.",
    ],
    memoryReferenceFrequency: 'frequent',
  },
  certification_complete: {
    description: 'Celebrating achievement while continuing advanced growth',
    intimacyLevel: 'close',
    greetingStyle: [
      "The certified marketer is here! Still can't believe how far you've come.",
      "There's my favorite success story! What's on your mind today?",
      "You did it, and you're still here learning. That's what separates good from great.",
    ],
    memoryReferenceFrequency: 'frequent',
  },
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Determine relationship stage based on user data
 */
export function determineRelationshipStage(
  daysActive: number,
  isCertified: boolean,
  lessonsCompleted: number
): RelationshipStage {
  if (isCertified) {
    return 'certification_complete';
  }

  if (daysActive >= 61 || lessonsCompleted >= 50) {
    return 'mastery_partner';
  }

  if (daysActive >= 31 || lessonsCompleted >= 25) {
    return 'trusted_mentor';
  }

  if (daysActive >= 15 || lessonsCompleted >= 10) {
    return 'good_rapport';
  }

  if (daysActive >= 4 || lessonsCompleted >= 3) {
    return 'building_trust';
  }

  return 'new_friend';
}

/**
 * Create initial relationship state for a new user
 */
export function createInitialRelationshipState(userId: string): RelationshipState {
  return {
    userId,
    stage: 'new_friend',
    firstInteractionDate: new Date(),
    totalDaysActive: 1,
    currentStreak: 1,
    longestStreak: 1,
    milestonesReached: [],
    sharedMemories: [],
    lastInteractionDate: new Date(),
    emotionalDeposits: 0,
  };
}

/**
 * Update relationship state based on new interaction
 */
export function updateRelationshipState(
  state: RelationshipState,
  newData: {
    lessonsCompleted: number;
    currentStreak: number;
    isCertified: boolean;
    newMemory?: Omit<SharedMemory, 'id' | 'date'>;
  }
): RelationshipState {
  const now = new Date();
  const daysSinceFirst = Math.floor(
    (now.getTime() - state.firstInteractionDate.getTime()) / (24 * 60 * 60 * 1000)
  ) + 1;

  const newStage = determineRelationshipStage(
    daysSinceFirst,
    newData.isCertified,
    newData.lessonsCompleted
  );

  const updatedState: RelationshipState = {
    ...state,
    stage: newStage,
    totalDaysActive: daysSinceFirst,
    currentStreak: newData.currentStreak,
    longestStreak: Math.max(state.longestStreak, newData.currentStreak),
    lastInteractionDate: now,
    emotionalDeposits: state.emotionalDeposits + 1,
  };

  // Add new memory if provided
  if (newData.newMemory) {
    updatedState.sharedMemories = [
      ...state.sharedMemories.slice(-20), // Keep last 20 memories
      {
        ...newData.newMemory,
        id: `mem_${Date.now()}`,
        date: now,
      },
    ];
  }

  return updatedState;
}

/**
 * Check for newly reached milestones
 */
export function checkForNewMilestones(
  state: RelationshipState,
  performanceData: {
    quizScores: number[];
    lessonsCompleted: number;
    hasOvercomeStruggle: boolean;
    isCertificationReady: boolean;
  }
): RelationshipMilestone[] {
  const newMilestones: RelationshipMilestone[] = [];

  for (const milestone of RELATIONSHIP_MILESTONES) {
    // Skip already reached milestones
    if (state.milestonesReached.includes(milestone.id)) {
      continue;
    }

    // Check trigger condition
    const triggered = checkMilestoneTrigger(milestone.triggerCondition, state, performanceData);

    if (triggered) {
      newMilestones.push(milestone);
    }
  }

  return newMilestones;
}

/**
 * Check if a milestone trigger condition is met
 */
function checkMilestoneTrigger(
  trigger: MilestoneTrigger,
  state: RelationshipState,
  performanceData: {
    quizScores: number[];
    lessonsCompleted: number;
    hasOvercomeStruggle: boolean;
    isCertificationReady: boolean;
  }
): boolean {
  switch (trigger.type) {
    case 'days_active':
      return state.totalDaysActive >= trigger.days;

    case 'streak_reached':
      return state.currentStreak >= trigger.days;

    case 'quiz_score':
      return performanceData.quizScores.filter(s => s >= trigger.score).length >= trigger.count;

    case 'first_struggle_overcome':
      return performanceData.hasOvercomeStruggle;

    case 'certification_ready':
      return performanceData.isCertificationReady;

    case 'lessons_completed':
      return performanceData.lessonsCompleted >= trigger.count;

    default:
      return false;
  }
}

/**
 * Build relationship context for coach system prompt
 */
export function buildRelationshipContext(state: RelationshipState): RelationshipContext {
  const stageConfig = STAGE_DEFINITIONS[state.stage];
  const daysKnown = state.totalDaysActive;

  // Get recent memories that can be referenced
  const recentMemories = state.sharedMemories
    .filter(m => m.canReference)
    .slice(-5);

  // Select an appropriate greeting
  const greetings = stageConfig.greetingStyle;
  const contextualGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  // Determine if we should suggest a memory reference
  let suggestedReference: string | undefined;
  if (
    stageConfig.memoryReferenceFrequency !== 'never' &&
    recentMemories.length > 0 &&
    Math.random() < getMemoryReferenceChance(stageConfig.memoryReferenceFrequency)
  ) {
    const memory = recentMemories[Math.floor(Math.random() * recentMemories.length)];
    suggestedReference = generateMemoryReference(memory, daysKnown);
  }

  return {
    stage: state.stage,
    stageDescription: stageConfig.description,
    daysKnown,
    recentMemories,
    suggestedReference,
    appropriateIntimacyLevel: stageConfig.intimacyLevel,
    contextualGreeting,
  };
}

/**
 * Get probability of referencing a past memory
 */
function getMemoryReferenceChance(frequency: 'never' | 'rare' | 'occasional' | 'frequent'): number {
  const chances: Record<string, number> = {
    never: 0,
    rare: 0.1,
    occasional: 0.3,
    frequent: 0.5,
  };
  return chances[frequency];
}

/**
 * Generate a natural reference to a shared memory
 */
function generateMemoryReference(memory: SharedMemory, _daysKnown: number): string {
  const timeAgo = Math.floor((Date.now() - memory.date.getTime()) / (24 * 60 * 60 * 1000));

  const prefixes = {
    struggle_overcome: [
      `Remember when ${memory.description}? Look how far you've come.`,
      `You know what I keep thinking about? When you finally got ${memory.description.toLowerCase()}. That was a moment.`,
    ],
    breakthrough: [
      `I still remember the moment ${memory.description}. That's when I knew you were going to succeed.`,
      `That breakthrough you had with ${memory.description.toLowerCase()} - that's still one of my favorite moments.`,
    ],
    milestone: [
      `Hard to believe it's been ${timeAgo} days since ${memory.description.toLowerCase()}.`,
      `${memory.description} was a turning point. Do you remember that day?`,
    ],
    joke: [
      `Still laughing about ${memory.description.toLowerCase()} by the way.`,
    ],
    personal_share: [
      `I've been thinking about what you said about ${memory.description.toLowerCase()}.`,
    ],
  };

  const options = prefixes[memory.type] || [];
  return options.length > 0 ? options[Math.floor(Math.random() * options.length)] : '';
}

/**
 * Build relationship context string for system prompt
 */
export function buildRelationshipContextString(context: RelationshipContext): string {
  const sections: string[] = [];

  sections.push(`
=== RELATIONSHIP WITH STUDENT ===
Relationship Stage: ${context.stage.replace('_', ' ').toUpperCase()}
Days Learning Together: ${context.daysKnown}
Description: ${context.stageDescription}
Appropriate Intimacy: ${context.appropriateIntimacyLevel}`);

  if (context.suggestedReference) {
    sections.push(`
Consider naturally referencing: "${context.suggestedReference}"`);
  }

  if (context.recentMemories.length > 0) {
    sections.push(`
Shared History (can reference if natural):
${context.recentMemories.map(m => `- ${m.description} (${m.type})`).join('\n')}`);
  }

  sections.push(`
Suggested Greeting Style: "${context.contextualGreeting}"`);

  return sections.join('\n');
}

/**
 * Record a new shared memory
 */
export function createSharedMemory(
  type: SharedMemory['type'],
  description: string,
  canReference: boolean = true
): Omit<SharedMemory, 'id' | 'date'> {
  return {
    type,
    description,
    canReference,
  };
}
