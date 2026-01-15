/**
 * Concept Merger Module
 *
 * Handles deduplication and merging of similar concepts in the knowledge graph.
 * Uses text similarity algorithms to identify potential duplicates.
 */

import {
  Concept,
  ConceptId,
  ExtractedConcept,
  MergeResult,
} from './types';
import { getAllConcepts } from './KnowledgeGraphService';

// ============================================
// SIMILARITY CALCULATION
// ============================================

/**
 * Result of similarity comparison
 */
export interface SimilarityResult {
  conceptId: ConceptId;
  conceptName: string;
  similarity: number;
  matchType: 'exact' | 'alias' | 'keyterm' | 'fuzzy';
}

/**
 * Find concepts similar to a given name/terms
 */
export async function findSimilarConcepts(
  courseId: string,
  name: string,
  keyTerms: string[] = []
): Promise<SimilarityResult[]> {
  const allConcepts = await getAllConcepts(courseId);
  const results: SimilarityResult[] = [];
  const normalizedName = name.toLowerCase().trim();

  for (const concept of allConcepts) {
    const similarity = calculateConceptSimilarity(
      normalizedName,
      keyTerms,
      concept
    );

    if (similarity.score > 0.3) {
      results.push({
        conceptId: concept.id,
        conceptName: concept.name,
        similarity: similarity.score,
        matchType: similarity.matchType,
      });
    }
  }

  // Sort by similarity descending
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate similarity between search terms and an existing concept
 */
function calculateConceptSimilarity(
  searchName: string,
  searchTerms: string[],
  concept: Concept
): { score: number; matchType: 'exact' | 'alias' | 'keyterm' | 'fuzzy' } {
  const conceptName = concept.name.toLowerCase();

  // Exact name match
  if (searchName === conceptName) {
    return { score: 1.0, matchType: 'exact' };
  }

  // Alias match
  const aliasMatch = concept.aliases.find(
    (alias) => alias.toLowerCase() === searchName
  );
  if (aliasMatch) {
    return { score: 0.95, matchType: 'alias' };
  }

  // Key term exact match
  const keyTermMatch = concept.keyTerms.find(
    (term) => term.toLowerCase() === searchName
  );
  if (keyTermMatch) {
    return { score: 0.85, matchType: 'keyterm' };
  }

  // Calculate fuzzy similarity
  const nameSimilarity = levenshteinSimilarity(searchName, conceptName);

  // Check for word overlap
  const searchWords = new Set(searchName.split(/\s+/));
  const conceptWords = new Set(conceptName.split(/\s+/));
  const wordOverlap = calculateSetOverlap(searchWords, conceptWords);

  // Check key term overlap
  const searchTermSet = new Set(searchTerms.map((t) => t.toLowerCase()));
  const conceptTermSet = new Set(concept.keyTerms.map((t) => t.toLowerCase()));
  const termOverlap = calculateSetOverlap(searchTermSet, conceptTermSet);

  // Combined score
  const fuzzyScore = nameSimilarity * 0.5 + wordOverlap * 0.3 + termOverlap * 0.2;

  return { score: fuzzyScore, matchType: 'fuzzy' };
}

// ============================================
// TEXT SIMILARITY ALGORITHMS
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Convert Levenshtein distance to similarity score (0-1)
 */
function levenshteinSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function calculateSetOverlap<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  const arrayA = Array.from(setA);
  for (const item of arrayA) {
    if (setB.has(item)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * N-gram based similarity (for handling typos and word order)
 */
function nGramSimilarity(a: string, b: string, n: number = 2): number {
  const ngramsA = getNGrams(a, n);
  const ngramsB = getNGrams(b, n);
  return calculateSetOverlap(ngramsA, ngramsB);
}

/**
 * Get n-grams from a string
 */
function getNGrams(text: string, n: number): Set<string> {
  const ngrams = new Set<string>();
  const normalized = text.toLowerCase().replace(/\s+/g, '');

  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.substring(i, i + n));
  }

  return ngrams;
}

// ============================================
// CONCEPT MERGING
// ============================================

/**
 * Merge an extracted concept into an existing concept
 * Returns the fields that should be updated
 */
export async function mergeConcepts(
  existing: Concept,
  extracted: ExtractedConcept
): Promise<Partial<Concept>> {
  const updates: Partial<Concept> = {};

  // Merge key terms (union)
  const mergedTerms = new Set([...existing.keyTerms, ...extracted.keyTerms]);
  if (mergedTerms.size > existing.keyTerms.length) {
    updates.keyTerms = [...mergedTerms];
  }

  // Add source content ID
  if (!existing.sourceContentIds.includes(extracted.sourceContentId)) {
    updates.sourceContentIds = [
      ...existing.sourceContentIds,
      extracted.sourceContentId,
    ];
  }

  // Potentially add the extracted name as an alias if it's different
  const extractedNameNormalized = extracted.name.toLowerCase().trim();
  const existingNameNormalized = existing.name.toLowerCase().trim();
  if (
    extractedNameNormalized !== existingNameNormalized &&
    !existing.aliases.some((a) => a.toLowerCase() === extractedNameNormalized)
  ) {
    updates.aliases = [...existing.aliases, extracted.name];
  }

  // Update description if the new one is longer (more detailed)
  if (extracted.description.length > existing.description.length * 1.5) {
    updates.description = extracted.description;
  }

  // Update confidence if we're getting more confirmations (increase confidence)
  if (extracted.confidence > 0.8 && existing.confidence < 1.0) {
    // Bayesian-ish update: more confirmations increase confidence
    const newConfidence = Math.min(
      1.0,
      existing.confidence + (1 - existing.confidence) * 0.2
    );
    updates.confidence = newConfidence;
  }

  return updates;
}

/**
 * Determine if two concepts should be merged
 */
export function shouldMergeConcepts(
  existing: Concept,
  extracted: ExtractedConcept,
  similarity: number
): { shouldMerge: boolean; reason: string } {
  // High similarity = definitely merge
  if (similarity >= 0.9) {
    return { shouldMerge: true, reason: 'High name similarity' };
  }

  // Check for shared key terms
  const existingTerms = new Set(existing.keyTerms.map((t) => t.toLowerCase()));
  const extractedTerms = extracted.keyTerms.map((t) => t.toLowerCase());
  const sharedTerms = extractedTerms.filter((t) => existingTerms.has(t));

  if (sharedTerms.length >= 3) {
    return { shouldMerge: true, reason: 'Many shared key terms' };
  }

  // Same category with moderate similarity
  if (
    existing.category === extracted.suggestedCategory &&
    similarity >= 0.7
  ) {
    return { shouldMerge: true, reason: 'Same category with good similarity' };
  }

  // Low similarity or different categories = don't merge
  if (similarity < 0.7) {
    return { shouldMerge: false, reason: 'Insufficient similarity' };
  }

  // Edge case: moderate similarity, different categories
  return { shouldMerge: false, reason: 'Different categories' };
}

// ============================================
// DUPLICATE DETECTION
// ============================================

/**
 * Find potential duplicates in the graph
 * Useful for cleanup and quality control
 */
export async function findPotentialDuplicates(
  courseId: string
): Promise<{ concept1: Concept; concept2: Concept; similarity: number }[]> {
  const allConcepts = await getAllConcepts(courseId);
  const duplicates: { concept1: Concept; concept2: Concept; similarity: number }[] = [];

  // Compare all pairs
  for (let i = 0; i < allConcepts.length; i++) {
    for (let j = i + 1; j < allConcepts.length; j++) {
      const concept1 = allConcepts[i];
      const concept2 = allConcepts[j];

      const nameSimilarity = levenshteinSimilarity(
        concept1.name.toLowerCase(),
        concept2.name.toLowerCase()
      );

      const termOverlap = calculateSetOverlap(
        new Set(concept1.keyTerms.map((t) => t.toLowerCase())),
        new Set(concept2.keyTerms.map((t) => t.toLowerCase()))
      );

      const combinedSimilarity = nameSimilarity * 0.7 + termOverlap * 0.3;

      if (combinedSimilarity >= 0.7) {
        duplicates.push({
          concept1,
          concept2,
          similarity: combinedSimilarity,
        });
      }
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Merge two existing concepts (for manual cleanup)
 * The second concept is merged into the first, and the second is marked for deletion
 */
export function mergeExistingConcepts(
  primary: Concept,
  secondary: Concept
): {
  updatedPrimary: Partial<Concept>;
  conceptToDelete: ConceptId;
  edgesToUpdate: { oldConceptId: ConceptId; newConceptId: ConceptId }[];
} {
  const updates: Partial<Concept> = {};

  // Merge key terms
  const mergedTerms = new Set([...primary.keyTerms, ...secondary.keyTerms]);
  updates.keyTerms = Array.from(mergedTerms);

  // Merge aliases (include secondary name)
  const mergedAliases = new Set([
    ...primary.aliases,
    ...secondary.aliases,
    secondary.name,
  ]);
  // Remove primary name from aliases if present
  mergedAliases.delete(primary.name);
  updates.aliases = Array.from(mergedAliases);

  // Merge source content IDs
  const mergedSources = new Set([
    ...primary.sourceContentIds,
    ...secondary.sourceContentIds,
  ]);
  updates.sourceContentIds = Array.from(mergedSources);

  // Merge atom IDs
  const mergedAtoms = new Set([...primary.atomIds, ...secondary.atomIds]);
  updates.atomIds = Array.from(mergedAtoms);

  // Keep the longer/better description
  if (secondary.description.length > primary.description.length) {
    updates.description = secondary.description;
  }

  // Keep higher confidence
  if (secondary.confidence > primary.confidence) {
    updates.confidence = secondary.confidence;
  }

  // Edges that referenced secondary should now reference primary
  const edgesToUpdate = [{ oldConceptId: secondary.id, newConceptId: primary.id }];

  return {
    updatedPrimary: updates,
    conceptToDelete: secondary.id,
    edgesToUpdate,
  };
}

// ============================================
// ALIAS MANAGEMENT
// ============================================

/**
 * Add an alias to a concept
 */
export function addAlias(concept: Concept, alias: string): string[] {
  const normalizedAlias = alias.trim();
  const existingNormalized = concept.aliases.map((a) => a.toLowerCase());

  if (
    normalizedAlias.toLowerCase() !== concept.name.toLowerCase() &&
    !existingNormalized.includes(normalizedAlias.toLowerCase())
  ) {
    return [...concept.aliases, normalizedAlias];
  }

  return concept.aliases;
}

/**
 * Suggest aliases based on common variations
 */
export function suggestAliases(name: string): string[] {
  const suggestions: string[] = [];
  const normalized = name.toLowerCase();

  // Acronym if multi-word
  const words = name.split(/\s+/);
  if (words.length > 1) {
    const acronym = words.map((w) => w[0]).join('').toUpperCase();
    if (acronym.length >= 2) {
      suggestions.push(acronym);
    }
  }

  // Common abbreviations
  const abbreviations: Record<string, string[]> = {
    'campaign budget optimization': ['CBO'],
    'cost per mille': ['CPM'],
    'cost per click': ['CPC'],
    'return on ad spend': ['ROAS'],
    'click-through rate': ['CTR'],
    'conversion rate optimization': ['CRO'],
    'a/b testing': ['split testing'],
    'lookalike audiences': ['LAL', 'lookalikes'],
    'custom audiences': ['CA'],
  };

  if (abbreviations[normalized]) {
    suggestions.push(...abbreviations[normalized]);
  }

  return suggestions;
}

// ============================================
// QUALITY SCORING
// ============================================

/**
 * Calculate quality score for a concept (for ranking and cleanup)
 */
export function calculateConceptQuality(concept: Concept): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Description quality
  if (concept.description.length < 20) {
    score -= 20;
    issues.push('Description too short');
  }

  // Key terms
  if (concept.keyTerms.length === 0) {
    score -= 15;
    issues.push('No key terms defined');
  } else if (concept.keyTerms.length < 3) {
    score -= 5;
    issues.push('Few key terms');
  }

  // Source tracking
  if (concept.sourceContentIds.length === 0 && concept.atomIds.length === 0) {
    score -= 10;
    issues.push('No source content linked');
  }

  // Confidence
  if (concept.confidence < 0.7) {
    score -= 15;
    issues.push('Low extraction confidence');
  }

  // Prerequisites (only for non-entry concepts)
  if (concept.difficulty > 1 && concept.prerequisites.length === 0) {
    score -= 10;
    issues.push('No prerequisites defined for non-beginner concept');
  }

  return {
    score: Math.max(0, score),
    issues,
  };
}
