/**
 * Semantic Similarity - Content Relevance Matching
 *
 * Phase 13.1: Adaptive Interleaving Algorithm
 *
 * Compares review items to current lesson content to determine
 * semantic relevance for interleaving. Uses embeddings when available,
 * falls back to keyword matching.
 *
 * Key features:
 * - Embedding-based similarity (cosine distance)
 * - Keyword/term overlap fallback
 * - Skill-based relevance scoring
 * - Configurable similarity threshold
 */

import type { ReviewItem } from './reviewDueQuery';

// ============================================
// TYPES
// ============================================

/**
 * Content representation for similarity comparison
 */
export interface ContentRepresentation {
  id: string;
  text: string;
  skillIds: string[];
  keyTerms: string[];
  embedding?: number[];
  category?: string;
}

/**
 * Similarity result between two pieces of content
 */
export interface SimilarityResult {
  itemId: string;
  score: number;
  matchType: 'embedding' | 'keyword' | 'skill';
  matchDetails: {
    embeddingScore?: number;
    keywordScore?: number;
    skillScore?: number;
    sharedTerms?: string[];
    sharedSkills?: string[];
  };
}

/**
 * Configuration for similarity calculation
 */
export interface SimilarityConfig {
  /** Weight for embedding similarity (default: 0.5) */
  embeddingWeight: number;
  /** Weight for keyword similarity (default: 0.3) */
  keywordWeight: number;
  /** Weight for skill overlap (default: 0.2) */
  skillWeight: number;
  /** Minimum similarity threshold (default: 0.3) */
  minThreshold: number;
  /** Use embeddings if available (default: true) */
  useEmbeddings: boolean;
}

/**
 * Review item with similarity score
 */
export interface ScoredReviewItem extends ReviewItem {
  similarity: number;
  matchDetails: SimilarityResult['matchDetails'];
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  embeddingWeight: 0.5,
  keywordWeight: 0.3,
  skillWeight: 0.2,
  minThreshold: 0.3,
  useEmbeddings: true,
};

// ============================================
// EMBEDDING-BASED SIMILARITY
// ============================================

/**
 * Calculate cosine similarity between two embedding vectors
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  // Cosine similarity ranges from -1 to 1; normalize to 0-1
  return (dotProduct / denominator + 1) / 2;
}

/**
 * Calculate embedding-based similarity between content items
 */
function calculateEmbeddingSimilarity(
  target: ContentRepresentation,
  candidate: ContentRepresentation
): number {
  if (!target.embedding || !candidate.embedding) {
    return 0;
  }

  return cosineSimilarity(target.embedding, candidate.embedding);
}

// ============================================
// KEYWORD-BASED SIMILARITY
// ============================================

/**
 * Normalize text for keyword matching
 */
function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/**
 * Calculate Jaccard similarity between two sets of terms
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Calculate keyword-based similarity between content items
 *
 * Uses combination of:
 * - Key terms overlap
 * - Text content overlap
 */
function calculateKeywordSimilarity(
  target: ContentRepresentation,
  candidate: ContentRepresentation
): { score: number; sharedTerms: string[] } {
  // Key terms similarity (weighted higher)
  const targetTerms = new Set(target.keyTerms.map((t) => t.toLowerCase()));
  const candidateTerms = new Set(candidate.keyTerms.map((t) => t.toLowerCase()));

  const sharedTerms = [...targetTerms].filter((t) => candidateTerms.has(t));
  const termSimilarity = jaccardSimilarity(targetTerms, candidateTerms);

  // Text content similarity
  const targetWords = new Set(normalizeText(target.text));
  const candidateWords = new Set(normalizeText(candidate.text));
  const textSimilarity = jaccardSimilarity(targetWords, candidateWords);

  // Combine with weight toward key terms
  const score = termSimilarity * 0.7 + textSimilarity * 0.3;

  return { score, sharedTerms };
}

// ============================================
// SKILL-BASED SIMILARITY
// ============================================

/**
 * Calculate skill overlap similarity
 */
function calculateSkillSimilarity(
  target: ContentRepresentation,
  candidate: ContentRepresentation
): { score: number; sharedSkills: string[] } {
  const targetSkills = new Set(target.skillIds);
  const candidateSkills = new Set(candidate.skillIds);

  const sharedSkills = [...targetSkills].filter((s) => candidateSkills.has(s));

  // Direct skill match is strongest signal
  if (sharedSkills.length > 0) {
    // Score based on proportion of skills that match
    const score = sharedSkills.length / Math.max(targetSkills.size, candidateSkills.size);
    return { score, sharedSkills };
  }

  return { score: 0, sharedSkills: [] };
}

// ============================================
// COMBINED SIMILARITY
// ============================================

/**
 * Calculate combined similarity score between content items
 *
 * Uses weighted combination of embedding, keyword, and skill similarity.
 * Falls back gracefully when embeddings are not available.
 */
export function calculateSimilarity(
  target: ContentRepresentation,
  candidate: ContentRepresentation,
  config: Partial<SimilarityConfig> = {}
): SimilarityResult {
  const finalConfig: SimilarityConfig = {
    ...DEFAULT_SIMILARITY_CONFIG,
    ...config,
  };

  const { embeddingWeight, keywordWeight, skillWeight, useEmbeddings } = finalConfig;

  // Calculate individual similarity scores
  const embeddingScore =
    useEmbeddings && target.embedding && candidate.embedding
      ? calculateEmbeddingSimilarity(target, candidate)
      : 0;

  const keywordResult = calculateKeywordSimilarity(target, candidate);
  const skillResult = calculateSkillSimilarity(target, candidate);

  // Determine weights based on available data
  let effectiveEmbeddingWeight = useEmbeddings && embeddingScore > 0 ? embeddingWeight : 0;
  let effectiveKeywordWeight = keywordWeight;
  let effectiveSkillWeight = skillWeight;

  // Redistribute weights if embeddings not available
  if (effectiveEmbeddingWeight === 0) {
    const redistributed = embeddingWeight / 2;
    effectiveKeywordWeight += redistributed;
    effectiveSkillWeight += redistributed;
  }

  // Normalize weights
  const totalWeight =
    effectiveEmbeddingWeight + effectiveKeywordWeight + effectiveSkillWeight;
  if (totalWeight > 0) {
    effectiveEmbeddingWeight /= totalWeight;
    effectiveKeywordWeight /= totalWeight;
    effectiveSkillWeight /= totalWeight;
  }

  // Calculate weighted score
  const score =
    embeddingScore * effectiveEmbeddingWeight +
    keywordResult.score * effectiveKeywordWeight +
    skillResult.score * effectiveSkillWeight;

  // Determine primary match type
  let matchType: SimilarityResult['matchType'] = 'keyword';
  if (embeddingScore >= keywordResult.score && embeddingScore >= skillResult.score) {
    matchType = 'embedding';
  } else if (skillResult.score >= keywordResult.score) {
    matchType = 'skill';
  }

  return {
    itemId: candidate.id,
    score: Math.min(1, Math.max(0, score)),
    matchType,
    matchDetails: {
      embeddingScore,
      keywordScore: keywordResult.score,
      skillScore: skillResult.score,
      sharedTerms: keywordResult.sharedTerms,
      sharedSkills: skillResult.sharedSkills,
    },
  };
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Score multiple review items against current lesson content
 *
 * @param lessonContent - Current lesson content representation
 * @param reviewItems - Review items to score
 * @param itemContents - Map of concept IDs to content representations
 * @param config - Similarity configuration
 */
export function scoreReviewItemsBySimilarity(
  lessonContent: ContentRepresentation,
  reviewItems: ReviewItem[],
  itemContents: Map<string, ContentRepresentation>,
  config: Partial<SimilarityConfig> = {}
): ScoredReviewItem[] {
  const finalConfig: SimilarityConfig = {
    ...DEFAULT_SIMILARITY_CONFIG,
    ...config,
  };

  const scoredItems: ScoredReviewItem[] = [];

  for (const item of reviewItems) {
    const content = itemContents.get(item.conceptId);

    if (!content) {
      // Fallback: create minimal content representation from item
      const fallbackContent: ContentRepresentation = {
        id: item.conceptId,
        text: item.conceptName,
        skillIds: [item.skillId],
        keyTerms: item.conceptName.toLowerCase().split(/\s+/),
      };

      const result = calculateSimilarity(lessonContent, fallbackContent, finalConfig);
      scoredItems.push({
        ...item,
        similarity: result.score,
        matchDetails: result.matchDetails,
      });
    } else {
      const result = calculateSimilarity(lessonContent, content, finalConfig);
      scoredItems.push({
        ...item,
        similarity: result.score,
        matchDetails: result.matchDetails,
      });
    }
  }

  // Sort by similarity (highest first)
  return scoredItems.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Filter review items by similarity threshold
 *
 * Returns only items that meet the minimum similarity threshold
 * for contextual interleaving.
 */
export function filterBySimilarity(
  scoredItems: ScoredReviewItem[],
  threshold: number = DEFAULT_SIMILARITY_CONFIG.minThreshold
): ScoredReviewItem[] {
  return scoredItems.filter((item) => item.similarity >= threshold);
}

/**
 * Create content representation from lesson data
 *
 * Helper to build ContentRepresentation from lesson information.
 */
export function createLessonContentRepresentation(
  lessonId: string,
  lessonTitle: string,
  lessonObjectives: string[],
  skillIds: string[],
  keyTerms: string[],
  embedding?: number[]
): ContentRepresentation {
  const text = [lessonTitle, ...lessonObjectives].join(' ');

  return {
    id: lessonId,
    text,
    skillIds,
    keyTerms,
    embedding,
  };
}

/**
 * Create content representation from concept data
 *
 * Helper to build ContentRepresentation from concept/review item.
 */
export function createConceptContentRepresentation(
  conceptId: string,
  conceptName: string,
  description: string,
  skillId: string,
  keyTerms: string[],
  embedding?: number[]
): ContentRepresentation {
  return {
    id: conceptId,
    text: `${conceptName} ${description}`,
    skillIds: [skillId],
    keyTerms,
    embedding,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract key terms from text using simple heuristics
 *
 * Useful when key terms are not explicitly provided.
 * Extracts capitalized phrases and common domain terms.
 */
export function extractKeyTerms(text: string): string[] {
  const terms: string[] = [];

  // Extract capitalized phrases (likely proper nouns/terms)
  const capitalizedPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
  const capitalizedMatches = text.match(capitalizedPattern) || [];
  terms.push(...capitalizedMatches);

  // Extract quoted phrases
  const quotedPattern = /"([^"]+)"/g;
  let quotedMatch;
  while ((quotedMatch = quotedPattern.exec(text)) !== null) {
    terms.push(quotedMatch[1]);
  }

  // Deduplicate and return
  return [...new Set(terms.map((t) => t.toLowerCase()))];
}

/**
 * Check if review item is semantically related to lesson
 *
 * Quick check without full scoring - useful for filtering.
 */
export function isSemanticMatch(
  lessonSkillIds: string[],
  lessonKeyTerms: string[],
  reviewSkillId: string,
  reviewKeyTerms: string[]
): boolean {
  // Direct skill match
  if (lessonSkillIds.includes(reviewSkillId)) {
    return true;
  }

  // Key term overlap (at least 2 shared terms)
  const lessonTermSet = new Set(lessonKeyTerms.map((t) => t.toLowerCase()));
  const sharedTerms = reviewKeyTerms.filter((t) =>
    lessonTermSet.has(t.toLowerCase())
  );

  return sharedTerms.length >= 2;
}
