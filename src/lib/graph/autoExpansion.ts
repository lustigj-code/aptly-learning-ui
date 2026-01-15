/**
 * Auto-Expansion Module
 *
 * Handles automatic expansion of the knowledge graph when new content is ingested.
 * Takes AI-extracted concepts and integrates them into the existing graph.
 */

import {
  Concept,
  ConceptEdge,
  ConceptId,
  ExtractedConcept,
  ExtractedRelationship,
  ExtractionResult,
  MergeResult,
  EdgeRelationship,
} from './types';
import {
  addConcept,
  addEdge,
  getConcept,
  getAllConcepts,
  findConceptByName,
  updateConcept,
  generateConceptId,
  getGraph,
  createGraph,
} from './KnowledgeGraphService';
import { findSimilarConcepts, mergeConcepts } from './conceptMerger';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Minimum confidence threshold for auto-adding concepts
 * Concepts below this threshold require manual review
 */
const MIN_AUTO_ADD_CONFIDENCE = 0.7;

/**
 * Minimum confidence for auto-creating relationships
 */
const MIN_RELATIONSHIP_CONFIDENCE = 0.6;

/**
 * Similarity threshold for considering concepts as duplicates
 */
const SIMILARITY_THRESHOLD = 0.8;

// ============================================
// MAIN EXPANSION FUNCTION
// ============================================

/**
 * Result of graph expansion operation
 */
export interface ExpansionResult {
  addedConcepts: Concept[];
  mergedConcepts: { extracted: ExtractedConcept; merged: Concept; existingId: ConceptId }[];
  addedEdges: ConceptEdge[];
  skippedConcepts: { concept: ExtractedConcept; reason: string }[];
  skippedRelationships: { relationship: ExtractedRelationship; reason: string }[];
  warnings: string[];
}

/**
 * Expand the knowledge graph with extracted concepts and relationships
 * This is the main entry point for content ingestion
 */
export async function expandGraph(
  courseId: string,
  extraction: ExtractionResult
): Promise<ExpansionResult> {
  const result: ExpansionResult = {
    addedConcepts: [],
    mergedConcepts: [],
    addedEdges: [],
    skippedConcepts: [],
    skippedRelationships: [],
    warnings: [...extraction.warnings],
  };

  // Ensure graph exists
  const graph = await getGraph(courseId);
  if (!graph) {
    await createGraph(courseId, `Knowledge Graph for ${courseId}`, 'Auto-generated graph');
  }

  // Process concepts first
  const conceptMapping = new Map<string, ConceptId>(); // Map extracted names to IDs

  for (const extracted of extraction.concepts) {
    const conceptResult = await processExtractedConcept(courseId, extracted);

    if (conceptResult.added) {
      result.addedConcepts.push(conceptResult.concept!);
      conceptMapping.set(extracted.name.toLowerCase(), conceptResult.concept!.id);
    } else if (conceptResult.merged) {
      result.mergedConcepts.push({
        extracted,
        merged: conceptResult.existingConcept!,
        existingId: conceptResult.existingConcept!.id,
      });
      conceptMapping.set(extracted.name.toLowerCase(), conceptResult.existingConcept!.id);
    } else if (conceptResult.skipped) {
      result.skippedConcepts.push({
        concept: extracted,
        reason: conceptResult.reason || 'Unknown reason',
      });
    }
  }

  // Process relationships
  for (const relationship of extraction.relationships) {
    const edgeResult = await processExtractedRelationship(
      courseId,
      relationship,
      conceptMapping
    );

    if (edgeResult.added) {
      result.addedEdges.push(edgeResult.edge!);
    } else if (edgeResult.skipped) {
      result.skippedRelationships.push({
        relationship,
        reason: edgeResult.reason || 'Unknown reason',
      });
    }
  }

  return result;
}

// ============================================
// CONCEPT PROCESSING
// ============================================

interface ConceptProcessingResult {
  added: boolean;
  merged: boolean;
  skipped: boolean;
  concept?: Concept;
  existingConcept?: Concept;
  reason?: string;
}

/**
 * Process a single extracted concept
 * Decides whether to add, merge, or skip
 */
async function processExtractedConcept(
  courseId: string,
  extracted: ExtractedConcept
): Promise<ConceptProcessingResult> {
  // Check confidence threshold
  if (extracted.confidence < MIN_AUTO_ADD_CONFIDENCE) {
    return {
      added: false,
      merged: false,
      skipped: true,
      reason: `Confidence ${extracted.confidence} below threshold ${MIN_AUTO_ADD_CONFIDENCE}`,
    };
  }

  // Check for exact name match
  const exactMatch = await findConceptByName(courseId, extracted.name);
  if (exactMatch) {
    // Merge with existing concept
    const merged = await mergeConcepts(exactMatch, extracted);
    await updateConcept(courseId, exactMatch.id, merged);

    return {
      added: false,
      merged: true,
      skipped: false,
      existingConcept: { ...exactMatch, ...merged },
    };
  }

  // Check for similar concepts (fuzzy matching)
  const similarConcepts = await findSimilarConcepts(courseId, extracted.name, extracted.keyTerms);

  if (similarConcepts.length > 0 && similarConcepts[0].similarity >= SIMILARITY_THRESHOLD) {
    const bestMatch = similarConcepts[0];
    const existingConcept = await getConcept(courseId, bestMatch.conceptId);

    if (existingConcept) {
      // Merge with similar concept
      const merged = await mergeConcepts(existingConcept, extracted);
      await updateConcept(courseId, existingConcept.id, merged);

      return {
        added: false,
        merged: true,
        skipped: false,
        existingConcept: { ...existingConcept, ...merged },
      };
    }
  }

  // No match found - add as new concept
  const newConcept = await addConcept(courseId, {
    name: extracted.name,
    description: extracted.description,
    category: extracted.suggestedCategory,
    difficulty: extracted.suggestedDifficulty,
    prerequisites: [], // Will be set via relationships
    relatedConcepts: [],
    masteryThreshold: 75,
    decayRate: 21,
    atomIds: [],
    sourceContentIds: [extracted.sourceContentId],
    keyTerms: extracted.keyTerms,
    aliases: [],
    createdBy: 'ai_extraction',
    confidence: extracted.confidence,
  });

  return {
    added: true,
    merged: false,
    skipped: false,
    concept: newConcept,
  };
}

// ============================================
// RELATIONSHIP PROCESSING
// ============================================

interface RelationshipProcessingResult {
  added: boolean;
  skipped: boolean;
  edge?: ConceptEdge;
  reason?: string;
}

/**
 * Process a single extracted relationship
 */
async function processExtractedRelationship(
  courseId: string,
  relationship: ExtractedRelationship,
  conceptMapping: Map<string, ConceptId>
): Promise<RelationshipProcessingResult> {
  // Check confidence threshold
  if (relationship.confidence < MIN_RELATIONSHIP_CONFIDENCE) {
    return {
      added: false,
      skipped: true,
      reason: `Confidence ${relationship.confidence} below threshold ${MIN_RELATIONSHIP_CONFIDENCE}`,
    };
  }

  // Resolve concept IDs
  const fromId = await resolveConceptId(
    courseId,
    relationship.fromConceptName,
    conceptMapping
  );
  const toId = await resolveConceptId(
    courseId,
    relationship.toConceptName,
    conceptMapping
  );

  if (!fromId) {
    return {
      added: false,
      skipped: true,
      reason: `Could not resolve concept: ${relationship.fromConceptName}`,
    };
  }

  if (!toId) {
    return {
      added: false,
      skipped: true,
      reason: `Could not resolve concept: ${relationship.toConceptName}`,
    };
  }

  // Don't create self-loops
  if (fromId === toId) {
    return {
      added: false,
      skipped: true,
      reason: 'Self-referential relationship',
    };
  }

  // Add the edge
  const edge = await addEdge(
    courseId,
    fromId,
    toId,
    relationship.relationship,
    calculateEdgeStrength(relationship),
    relationship.confidence,
    'ai_extraction'
  );

  return {
    added: true,
    skipped: false,
    edge,
  };
}

/**
 * Resolve a concept name to its ID
 * First checks the mapping (for newly added concepts), then searches existing
 */
async function resolveConceptId(
  courseId: string,
  conceptName: string,
  conceptMapping: Map<string, ConceptId>
): Promise<ConceptId | null> {
  const normalizedName = conceptName.toLowerCase().trim();

  // Check mapping first (newly added concepts)
  if (conceptMapping.has(normalizedName)) {
    return conceptMapping.get(normalizedName)!;
  }

  // Search existing concepts
  const existing = await findConceptByName(courseId, conceptName);
  if (existing) {
    return existing.id;
  }

  // Try fuzzy matching
  const similar = await findSimilarConcepts(courseId, conceptName, []);
  if (similar.length > 0 && similar[0].similarity >= 0.7) {
    return similar[0].conceptId;
  }

  return null;
}

/**
 * Calculate edge strength based on relationship type and confidence
 */
function calculateEdgeStrength(relationship: ExtractedRelationship): number {
  // Prerequisites are stronger connections
  const baseStrength = relationship.relationship === 'prerequisite' ? 0.9 : 0.7;

  // Scale by confidence
  return Math.min(1.0, baseStrength * relationship.confidence);
}

// ============================================
// PREREQUISITE INFERENCE
// ============================================

/**
 * Infer prerequisites from extracted concept's suggested prerequisites
 * Called after initial concept processing
 */
export async function inferPrerequisites(
  courseId: string,
  conceptId: ConceptId,
  suggestedPrerequisites: string[]
): Promise<ConceptId[]> {
  const resolvedPrereqs: ConceptId[] = [];

  for (const prereqName of suggestedPrerequisites) {
    // Try to find matching concept
    const existing = await findConceptByName(courseId, prereqName);
    if (existing) {
      resolvedPrereqs.push(existing.id);

      // Create prerequisite edge
      await addEdge(
        courseId,
        existing.id,
        conceptId,
        'prerequisite',
        0.8, // Default strength for inferred prerequisites
        0.7, // Default confidence
        'ai_extraction'
      );
    }
  }

  return resolvedPrereqs;
}

// ============================================
// CATEGORY MANAGEMENT
// ============================================

/**
 * Infer category from concept content if not provided
 */
export function inferCategory(
  name: string,
  description: string,
  keyTerms: string[],
  existingCategories: string[]
): string {
  const text = `${name} ${description} ${keyTerms.join(' ')}`.toLowerCase();

  // Simple keyword-based category inference
  const categoryKeywords: Record<string, string[]> = {
    fundamentals: ['basic', 'introduction', 'overview', 'fundamentals', 'core'],
    targeting: ['audience', 'targeting', 'demographics', 'segment', 'persona'],
    campaigns: ['campaign', 'ad set', 'objective', 'structure'],
    budgeting: ['budget', 'bid', 'cost', 'spend', 'allocation'],
    creative: ['creative', 'ad copy', 'visual', 'image', 'video', 'design'],
    measurement: ['analytics', 'metrics', 'tracking', 'conversion', 'attribution'],
    optimization: ['optimize', 'test', 'improve', 'performance', 'scale'],
  };

  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Prefer existing categories if they match
  for (const existing of existingCategories) {
    if (text.includes(existing.toLowerCase())) {
      return existing;
    }
  }

  return bestCategory;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate extracted concepts before adding to graph
 */
export function validateExtractedConcept(concept: ExtractedConcept): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!concept.name || concept.name.trim().length === 0) {
    errors.push('Concept name is required');
  }

  if (!concept.description || concept.description.trim().length < 10) {
    errors.push('Concept description must be at least 10 characters');
  }

  if (concept.confidence < 0 || concept.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  }

  if (concept.suggestedDifficulty < 1 || concept.suggestedDifficulty > 5) {
    errors.push('Difficulty must be between 1 and 5');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate extraction result
 */
export function validateExtractionResult(result: ExtractionResult): {
  valid: boolean;
  errors: string[];
  validConcepts: ExtractedConcept[];
  invalidConcepts: { concept: ExtractedConcept; errors: string[] }[];
} {
  const validConcepts: ExtractedConcept[] = [];
  const invalidConcepts: { concept: ExtractedConcept; errors: string[] }[] = [];

  for (const concept of result.concepts) {
    const validation = validateExtractedConcept(concept);
    if (validation.valid) {
      validConcepts.push(concept);
    } else {
      invalidConcepts.push({ concept, errors: validation.errors });
    }
  }

  return {
    valid: invalidConcepts.length === 0,
    errors: invalidConcepts.flatMap((ic) => ic.errors),
    validConcepts,
    invalidConcepts,
  };
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Process multiple extraction results at once (e.g., from multiple content pieces)
 */
export async function batchExpandGraph(
  courseId: string,
  extractions: ExtractionResult[]
): Promise<ExpansionResult> {
  const combined: ExpansionResult = {
    addedConcepts: [],
    mergedConcepts: [],
    addedEdges: [],
    skippedConcepts: [],
    skippedRelationships: [],
    warnings: [],
  };

  for (const extraction of extractions) {
    const result = await expandGraph(courseId, extraction);

    combined.addedConcepts.push(...result.addedConcepts);
    combined.mergedConcepts.push(...result.mergedConcepts);
    combined.addedEdges.push(...result.addedEdges);
    combined.skippedConcepts.push(...result.skippedConcepts);
    combined.skippedRelationships.push(...result.skippedRelationships);
    combined.warnings.push(...result.warnings);
  }

  return combined;
}

/**
 * Rebuild all prerequisite edges from concept.prerequisites arrays
 * Useful for migration or repair
 */
export async function rebuildPrerequisiteEdges(courseId: string): Promise<number> {
  const allConcepts = await getAllConcepts(courseId);
  let edgesCreated = 0;

  for (const concept of allConcepts) {
    for (const prereqId of concept.prerequisites) {
      const prereq = await getConcept(courseId, prereqId);
      if (prereq) {
        await addEdge(
          courseId,
          prereqId,
          concept.id,
          'prerequisite',
          1.0,
          1.0,
          'manual'
        );
        edgesCreated++;
      }
    }
  }

  return edgesCreated;
}
