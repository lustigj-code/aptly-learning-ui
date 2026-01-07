/**
 * Knowledge Graph System
 *
 * Maps concepts, their relationships, and mastery requirements.
 * Used for:
 * - Prerequisite gating (can't proceed without mastering dependencies)
 * - Spaced repetition scheduling
 * - Adaptive learning paths
 */

// ============================================
// TYPES
// ============================================

export type ConceptId = string;

/**
 * A single concept in the knowledge graph
 */
export type Concept = {
  id: ConceptId;
  name: string;
  description: string;
  category: string; // e.g., 'targeting', 'bidding', 'creative'
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: ConceptId[]; // Concepts that must be mastered first
  relatedConcepts: ConceptId[]; // Similar or related concepts
  masteryThreshold: number; // 0-100, minimum score to consider "mastered"
  decayRate: number; // How quickly mastery decays (days until 50% decay)
  atomIds: string[]; // Which atoms teach this concept
  keyTerms: string[]; // Keywords associated with this concept
};

/**
 * User's mastery of a concept
 */
export type ConceptMastery = {
  conceptId: ConceptId;
  userId: string;
  masteryLevel: number; // 0-100
  lastReviewedAt: Date;
  lastQuizScore: number;
  reviewCount: number;
  correctStreak: number;
  incorrectStreak: number;
  fsrsState: FSRSState; // For spaced repetition
  nextReviewAt: Date;
  history: MasteryEvent[];
};

/**
 * FSRS (Free Spaced Repetition Scheduler) state
 */
export type FSRSState = {
  stability: number; // How stable the memory is (days)
  difficulty: number; // 0-10, how hard this concept is for this user
  elapsedDays: number; // Days since last review
  scheduledDays: number; // Days until next scheduled review
  reps: number; // Number of repetitions
  lapses: number; // Number of times forgotten
  state: 'new' | 'learning' | 'review' | 'relearning';
};

/**
 * A mastery event (quiz attempt, review, etc.)
 */
export type MasteryEvent = {
  timestamp: Date;
  eventType: 'quiz' | 'review' | 'practice' | 'lesson_complete';
  score: number;
  timeSpentSeconds: number;
  correct: boolean;
};

/**
 * The full knowledge graph for a course
 */
export type KnowledgeGraph = {
  courseId: string;
  concepts: Record<ConceptId, Concept>;
  edges: ConceptEdge[];
  categories: ConceptCategory[];
};

/**
 * An edge in the knowledge graph
 */
export type ConceptEdge = {
  from: ConceptId;
  to: ConceptId;
  relationship: 'prerequisite' | 'related' | 'builds_on';
  strength: number; // 0-1, how strongly connected
};

/**
 * Category for organizing concepts
 */
export type ConceptCategory = {
  id: string;
  name: string;
  description: string;
  color: string;
  conceptIds: ConceptId[];
};

// ============================================
// KNOWLEDGE GRAPH FOR SOCIAL MEDIA MARKETING
// ============================================

/**
 * Social Media Marketing certification knowledge graph
 * Based on Meta Blueprint certification content
 */
export const SOCIAL_MEDIA_MARKETING_GRAPH: KnowledgeGraph = {
  courseId: 'social-media-marketing',
  concepts: {
    // === FUNDAMENTALS ===
    'smm-fundamentals': {
      id: 'smm-fundamentals',
      name: 'Social Media Marketing Fundamentals',
      description: 'Core understanding of social media as a marketing channel',
      category: 'fundamentals',
      difficulty: 1,
      prerequisites: [],
      relatedConcepts: ['platform-overview', 'content-basics'],
      masteryThreshold: 70,
      decayRate: 60, // Very stable, slow decay
      atomIds: ['intro-to-smm', 'why-social-media'],
      keyTerms: ['social media', 'marketing', 'digital', 'brand awareness'],
    },
    'platform-overview': {
      id: 'platform-overview',
      name: 'Social Media Platform Overview',
      description: 'Understanding of major social platforms and their differences',
      category: 'fundamentals',
      difficulty: 1,
      prerequisites: ['smm-fundamentals'],
      relatedConcepts: ['facebook-basics', 'instagram-basics'],
      masteryThreshold: 70,
      decayRate: 45,
      atomIds: ['platform-comparison', 'choosing-platforms'],
      keyTerms: ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'platform'],
    },

    // === AUDIENCE TARGETING ===
    'audience-basics': {
      id: 'audience-basics',
      name: 'Understanding Your Audience',
      description: 'Fundamentals of identifying and understanding target audiences',
      category: 'targeting',
      difficulty: 2,
      prerequisites: ['smm-fundamentals'],
      relatedConcepts: ['audience-personas', 'core-audiences'],
      masteryThreshold: 75,
      decayRate: 30,
      atomIds: ['know-your-audience', 'audience-research'],
      keyTerms: ['audience', 'target market', 'demographics', 'interests'],
    },
    'core-audiences': {
      id: 'core-audiences',
      name: 'Core Audience Targeting',
      description: 'Using demographics, interests, and behaviors for targeting',
      category: 'targeting',
      difficulty: 2,
      prerequisites: ['audience-basics'],
      relatedConcepts: ['custom-audiences', 'lookalike-audiences'],
      masteryThreshold: 75,
      decayRate: 21,
      atomIds: ['core-targeting', 'detailed-targeting'],
      keyTerms: ['core audience', 'demographics', 'interests', 'behaviors'],
    },
    'custom-audiences': {
      id: 'custom-audiences',
      name: 'Custom Audiences',
      description: 'Creating audiences from your own data sources',
      category: 'targeting',
      difficulty: 3,
      prerequisites: ['core-audiences'],
      relatedConcepts: ['lookalike-audiences', 'retargeting'],
      masteryThreshold: 80,
      decayRate: 14,
      atomIds: ['custom-audience-types', 'customer-list-upload'],
      keyTerms: ['custom audience', 'customer list', 'website visitors', 'pixel'],
    },
    'lookalike-audiences': {
      id: 'lookalike-audiences',
      name: 'Lookalike Audiences',
      description: 'Finding new people similar to your best customers',
      category: 'targeting',
      difficulty: 3,
      prerequisites: ['custom-audiences'],
      relatedConcepts: ['audience-expansion', 'scale-strategies'],
      masteryThreshold: 80,
      decayRate: 14,
      atomIds: ['lookalike-basics', 'lookalike-optimization'],
      keyTerms: ['lookalike', 'similar audiences', 'source audience', 'percentage'],
    },

    // === CAMPAIGN STRUCTURE ===
    'campaign-objectives': {
      id: 'campaign-objectives',
      name: 'Campaign Objectives',
      description: 'Understanding and choosing the right campaign objective',
      category: 'campaigns',
      difficulty: 2,
      prerequisites: ['smm-fundamentals'],
      relatedConcepts: ['awareness-objective', 'conversion-objective'],
      masteryThreshold: 80,
      decayRate: 21,
      atomIds: ['choosing-objectives', 'objective-types'],
      keyTerms: ['objective', 'awareness', 'consideration', 'conversion'],
    },
    'campaign-structure': {
      id: 'campaign-structure',
      name: 'Campaign Structure',
      description: 'Organizing campaigns, ad sets, and ads effectively',
      category: 'campaigns',
      difficulty: 2,
      prerequisites: ['campaign-objectives'],
      relatedConcepts: ['ad-set-optimization', 'campaign-budget'],
      masteryThreshold: 75,
      decayRate: 21,
      atomIds: ['campaign-hierarchy', 'structure-best-practices'],
      keyTerms: ['campaign', 'ad set', 'ad', 'hierarchy', 'organization'],
    },

    // === BUDGETING & BIDDING ===
    'budget-basics': {
      id: 'budget-basics',
      name: 'Budget Fundamentals',
      description: 'Understanding daily and lifetime budgets',
      category: 'budgeting',
      difficulty: 2,
      prerequisites: ['campaign-structure'],
      relatedConcepts: ['bid-strategies', 'cbo'],
      masteryThreshold: 75,
      decayRate: 21,
      atomIds: ['budget-types', 'budget-allocation'],
      keyTerms: ['budget', 'daily budget', 'lifetime budget', 'spending'],
    },
    'bid-strategies': {
      id: 'bid-strategies',
      name: 'Bid Strategies',
      description: 'Understanding automatic and manual bidding',
      category: 'budgeting',
      difficulty: 3,
      prerequisites: ['budget-basics'],
      relatedConcepts: ['cost-control', 'auction-dynamics'],
      masteryThreshold: 80,
      decayRate: 14,
      atomIds: ['bidding-options', 'bid-optimization'],
      keyTerms: ['bid', 'cost cap', 'bid cap', 'lowest cost', 'auction'],
    },
    'cbo': {
      id: 'cbo',
      name: 'Campaign Budget Optimization',
      description: 'Using CBO to optimize spend across ad sets',
      category: 'budgeting',
      difficulty: 4,
      prerequisites: ['bid-strategies', 'campaign-structure'],
      relatedConcepts: ['abo-vs-cbo', 'budget-allocation'],
      masteryThreshold: 85,
      decayRate: 14,
      atomIds: ['cbo-setup', 'cbo-best-practices'],
      keyTerms: ['CBO', 'campaign budget optimization', 'automatic allocation'],
    },

    // === AD CREATIVE ===
    'creative-fundamentals': {
      id: 'creative-fundamentals',
      name: 'Creative Fundamentals',
      description: 'Understanding what makes effective ad creative',
      category: 'creative',
      difficulty: 2,
      prerequisites: ['smm-fundamentals'],
      relatedConcepts: ['image-ads', 'video-ads'],
      masteryThreshold: 75,
      decayRate: 30,
      atomIds: ['creative-best-practices', 'ad-format-basics'],
      keyTerms: ['creative', 'ad copy', 'visual', 'headline', 'CTA'],
    },
    'ad-formats': {
      id: 'ad-formats',
      name: 'Ad Formats',
      description: 'Understanding image, video, carousel, and collection ads',
      category: 'creative',
      difficulty: 2,
      prerequisites: ['creative-fundamentals'],
      relatedConcepts: ['stories-ads', 'reels-ads'],
      masteryThreshold: 75,
      decayRate: 21,
      atomIds: ['format-types', 'format-selection'],
      keyTerms: ['carousel', 'collection', 'image ad', 'video ad', 'format'],
    },

    // === MEASUREMENT ===
    'analytics-basics': {
      id: 'analytics-basics',
      name: 'Analytics Fundamentals',
      description: 'Understanding key metrics and how to read reports',
      category: 'measurement',
      difficulty: 2,
      prerequisites: ['campaign-structure'],
      relatedConcepts: ['attribution', 'conversion-tracking'],
      masteryThreshold: 75,
      decayRate: 21,
      atomIds: ['key-metrics', 'reading-reports'],
      keyTerms: ['metrics', 'CTR', 'CPC', 'CPM', 'ROAS', 'analytics'],
    },
    'conversion-tracking': {
      id: 'conversion-tracking',
      name: 'Conversion Tracking',
      description: 'Setting up and using the Meta Pixel and Conversions API',
      category: 'measurement',
      difficulty: 3,
      prerequisites: ['analytics-basics'],
      relatedConcepts: ['attribution', 'custom-conversions'],
      masteryThreshold: 80,
      decayRate: 14,
      atomIds: ['pixel-setup', 'capi-basics'],
      keyTerms: ['pixel', 'conversions API', 'events', 'tracking'],
    },
    'attribution': {
      id: 'attribution',
      name: 'Attribution',
      description: 'Understanding how conversions are attributed to ads',
      category: 'measurement',
      difficulty: 4,
      prerequisites: ['conversion-tracking'],
      relatedConcepts: ['attribution-windows', 'view-through'],
      masteryThreshold: 85,
      decayRate: 14,
      atomIds: ['attribution-models', 'attribution-settings'],
      keyTerms: ['attribution', 'click-through', 'view-through', 'window'],
    },

    // === OPTIMIZATION ===
    'optimization-basics': {
      id: 'optimization-basics',
      name: 'Optimization Fundamentals',
      description: 'Basic principles of campaign optimization',
      category: 'optimization',
      difficulty: 3,
      prerequisites: ['analytics-basics', 'campaign-structure'],
      relatedConcepts: ['ab-testing', 'scaling'],
      masteryThreshold: 80,
      decayRate: 21,
      atomIds: ['optimization-principles', 'when-to-optimize'],
      keyTerms: ['optimization', 'learning phase', 'significant results'],
    },
    'ab-testing': {
      id: 'ab-testing',
      name: 'A/B Testing',
      description: 'Running controlled experiments to improve performance',
      category: 'optimization',
      difficulty: 3,
      prerequisites: ['optimization-basics'],
      relatedConcepts: ['creative-testing', 'audience-testing'],
      masteryThreshold: 80,
      decayRate: 21,
      atomIds: ['testing-methodology', 'test-setup'],
      keyTerms: ['A/B test', 'split test', 'control', 'variant', 'experiment'],
    },
  },

  edges: [
    // Fundamentals flow
    { from: 'smm-fundamentals', to: 'platform-overview', relationship: 'prerequisite', strength: 1.0 },
    { from: 'smm-fundamentals', to: 'audience-basics', relationship: 'prerequisite', strength: 1.0 },
    { from: 'smm-fundamentals', to: 'campaign-objectives', relationship: 'prerequisite', strength: 1.0 },
    { from: 'smm-fundamentals', to: 'creative-fundamentals', relationship: 'prerequisite', strength: 1.0 },

    // Targeting flow
    { from: 'audience-basics', to: 'core-audiences', relationship: 'prerequisite', strength: 1.0 },
    { from: 'core-audiences', to: 'custom-audiences', relationship: 'prerequisite', strength: 0.9 },
    { from: 'custom-audiences', to: 'lookalike-audiences', relationship: 'prerequisite', strength: 0.8 },
    { from: 'core-audiences', to: 'lookalike-audiences', relationship: 'related', strength: 0.5 },

    // Campaign flow
    { from: 'campaign-objectives', to: 'campaign-structure', relationship: 'prerequisite', strength: 1.0 },
    { from: 'campaign-structure', to: 'budget-basics', relationship: 'prerequisite', strength: 0.9 },
    { from: 'budget-basics', to: 'bid-strategies', relationship: 'prerequisite', strength: 0.9 },
    { from: 'bid-strategies', to: 'cbo', relationship: 'prerequisite', strength: 0.8 },
    { from: 'campaign-structure', to: 'cbo', relationship: 'prerequisite', strength: 0.7 },

    // Creative flow
    { from: 'creative-fundamentals', to: 'ad-formats', relationship: 'prerequisite', strength: 1.0 },

    // Measurement flow
    { from: 'campaign-structure', to: 'analytics-basics', relationship: 'prerequisite', strength: 0.8 },
    { from: 'analytics-basics', to: 'conversion-tracking', relationship: 'prerequisite', strength: 0.9 },
    { from: 'conversion-tracking', to: 'attribution', relationship: 'prerequisite', strength: 0.9 },

    // Optimization flow
    { from: 'analytics-basics', to: 'optimization-basics', relationship: 'prerequisite', strength: 0.8 },
    { from: 'campaign-structure', to: 'optimization-basics', relationship: 'prerequisite', strength: 0.7 },
    { from: 'optimization-basics', to: 'ab-testing', relationship: 'prerequisite', strength: 0.9 },

    // Cross-category relationships
    { from: 'lookalike-audiences', to: 'cbo', relationship: 'related', strength: 0.4 },
    { from: 'attribution', to: 'optimization-basics', relationship: 'related', strength: 0.5 },
  ],

  categories: [
    {
      id: 'fundamentals',
      name: 'Fundamentals',
      description: 'Core concepts every social media marketer needs',
      color: '#38B2AC', // teal
      conceptIds: ['smm-fundamentals', 'platform-overview'],
    },
    {
      id: 'targeting',
      name: 'Audience Targeting',
      description: 'Finding and reaching the right people',
      color: '#F56565', // red
      conceptIds: ['audience-basics', 'core-audiences', 'custom-audiences', 'lookalike-audiences'],
    },
    {
      id: 'campaigns',
      name: 'Campaigns',
      description: 'Building and structuring campaigns',
      color: '#4299E1', // blue
      conceptIds: ['campaign-objectives', 'campaign-structure'],
    },
    {
      id: 'budgeting',
      name: 'Budgeting & Bidding',
      description: 'Managing spend and auction strategies',
      color: '#48BB78', // green
      conceptIds: ['budget-basics', 'bid-strategies', 'cbo'],
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Creating effective ad content',
      color: '#9F7AEA', // purple
      conceptIds: ['creative-fundamentals', 'ad-formats'],
    },
    {
      id: 'measurement',
      name: 'Measurement',
      description: 'Tracking and understanding results',
      color: '#ED8936', // orange
      conceptIds: ['analytics-basics', 'conversion-tracking', 'attribution'],
    },
    {
      id: 'optimization',
      name: 'Optimization',
      description: 'Improving campaign performance',
      color: '#667EEA', // indigo
      conceptIds: ['optimization-basics', 'ab-testing'],
    },
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all prerequisites for a concept (including transitive)
 */
export function getAllPrerequisites(
  graph: KnowledgeGraph,
  conceptId: ConceptId,
  visited: Set<ConceptId> = new Set()
): ConceptId[] {
  if (visited.has(conceptId)) return [];
  visited.add(conceptId);

  const concept = graph.concepts[conceptId];
  if (!concept) return [];

  const directPrereqs = concept.prerequisites;
  const allPrereqs = [...directPrereqs];

  for (const prereqId of directPrereqs) {
    const transitivePrereqs = getAllPrerequisites(graph, prereqId, visited);
    allPrereqs.push(...transitivePrereqs);
  }

  return [...new Set(allPrereqs)]; // Deduplicate
}

/**
 * Check if a concept is unlocked based on mastery
 */
export function isConceptUnlocked(
  graph: KnowledgeGraph,
  conceptId: ConceptId,
  masteryLevels: Record<ConceptId, number>
): boolean {
  const concept = graph.concepts[conceptId];
  if (!concept) return false;

  // A concept is unlocked if all prerequisites meet their mastery threshold
  for (const prereqId of concept.prerequisites) {
    const prereq = graph.concepts[prereqId];
    if (!prereq) continue;

    const mastery = masteryLevels[prereqId] || 0;
    if (mastery < prereq.masteryThreshold) {
      return false;
    }
  }

  return true;
}

/**
 * Get concepts that are ready to be learned (unlocked but not mastered)
 */
export function getReadyConcepts(
  graph: KnowledgeGraph,
  masteryLevels: Record<ConceptId, number>
): ConceptId[] {
  const ready: ConceptId[] = [];

  for (const conceptId of Object.keys(graph.concepts)) {
    const concept = graph.concepts[conceptId];
    const mastery = masteryLevels[conceptId] || 0;

    // Already mastered? Skip
    if (mastery >= concept.masteryThreshold) continue;

    // Is it unlocked?
    if (isConceptUnlocked(graph, conceptId, masteryLevels)) {
      ready.push(conceptId);
    }
  }

  return ready;
}

/**
 * Get concepts that need review (mastery decaying)
 */
export function getDecayingConcepts(
  graph: KnowledgeGraph,
  masteryStates: Record<ConceptId, ConceptMastery>
): ConceptId[] {
  const decaying: ConceptId[] = [];
  const now = new Date();

  for (const [conceptId, mastery] of Object.entries(masteryStates)) {
    if (mastery.nextReviewAt <= now) {
      decaying.push(conceptId);
    }
  }

  // Sort by how overdue they are
  return decaying.sort((a, b) => {
    const aOverdue = now.getTime() - masteryStates[a].nextReviewAt.getTime();
    const bOverdue = now.getTime() - masteryStates[b].nextReviewAt.getTime();
    return bOverdue - aOverdue; // Most overdue first
  });
}

/**
 * Calculate which concept should be reviewed next
 */
export function getNextReviewConcept(
  graph: KnowledgeGraph,
  masteryStates: Record<ConceptId, ConceptMastery>
): ConceptId | null {
  const decaying = getDecayingConcepts(graph, masteryStates);
  return decaying[0] || null;
}

/**
 * Get a learning path from current state to a target concept
 */
export function getLearningPath(
  graph: KnowledgeGraph,
  targetConceptId: ConceptId,
  masteryLevels: Record<ConceptId, number>
): ConceptId[] {
  const path: ConceptId[] = [];
  const allPrereqs = getAllPrerequisites(graph, targetConceptId);

  // Add unmastered prerequisites in order
  for (const prereqId of allPrereqs) {
    const concept = graph.concepts[prereqId];
    const mastery = masteryLevels[prereqId] || 0;
    if (mastery < concept.masteryThreshold) {
      path.push(prereqId);
    }
  }

  // Add the target concept
  path.push(targetConceptId);

  // Sort by dependency (topological sort approximation)
  return path.sort((a, b) => {
    const aPrereqs = graph.concepts[a].prerequisites.length;
    const bPrereqs = graph.concepts[b].prerequisites.length;
    return aPrereqs - bPrereqs;
  });
}
