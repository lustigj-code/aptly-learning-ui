/**
 * Knowledge Graph Migration Utility
 *
 * Migrates the static hardcoded graph to the new Firestore-backed system.
 * Run once to populate the database, or use programmatically for testing.
 */

import {
  SOCIAL_MEDIA_MARKETING_GRAPH,
  type Concept as LegacyConcept,
  type KnowledgeGraph as LegacyGraph,
  type ConceptEdge as LegacyEdge,
} from '@/lib/mastery/knowledgeGraph';
import {
  createGraph,
  getGraph,
  importConcepts,
  importEdges,
  addCategory,
  getAllConcepts,
} from './KnowledgeGraphService';
import { Concept, ConceptEdge, EdgeRelationship } from './types';

// ============================================
// MIGRATION RESULT
// ============================================

export interface MigrationResult {
  success: boolean;
  courseId: string;
  conceptsImported: number;
  edgesImported: number;
  categoriesImported: number;
  errors: string[];
  warnings: string[];
}

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================

/**
 * Migrate the Social Media Marketing static graph to Firestore
 */
export async function migrateSocialMediaMarketingGraph(): Promise<MigrationResult> {
  return migrateStaticGraph(SOCIAL_MEDIA_MARKETING_GRAPH);
}

/**
 * Migrate any static graph to Firestore
 */
export async function migrateStaticGraph(
  legacyGraph: LegacyGraph
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    courseId: legacyGraph.courseId,
    conceptsImported: 0,
    edgesImported: 0,
    categoriesImported: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Check if graph already exists
    const existingGraph = await getGraph(legacyGraph.courseId);
    if (existingGraph) {
      const existingConcepts = await getAllConcepts(legacyGraph.courseId);
      if (existingConcepts.length > 0) {
        result.warnings.push(
          `Graph ${legacyGraph.courseId} already has ${existingConcepts.length} concepts. ` +
            'Skipping migration to avoid duplicates. Delete existing data first if you want to re-migrate.'
        );
        result.success = true; // Not an error, just nothing to do
        return result;
      }
    }

    // Create the graph if it doesn't exist
    if (!existingGraph) {
      await createGraph(
        legacyGraph.courseId,
        getCourseDisplayName(legacyGraph.courseId),
        `Knowledge graph for ${legacyGraph.courseId}`
      );
    }

    // Convert and import concepts
    const convertedConcepts = convertLegacyConcepts(legacyGraph.concepts);
    await importConcepts(legacyGraph.courseId, convertedConcepts);
    result.conceptsImported = convertedConcepts.length;

    // Convert and import edges
    const convertedEdges = convertLegacyEdges(legacyGraph.edges);
    await importEdges(legacyGraph.courseId, convertedEdges);
    result.edgesImported = convertedEdges.length;

    // Import categories
    for (const category of legacyGraph.categories) {
      await addCategory(legacyGraph.courseId, {
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        courseId: legacyGraph.courseId,
      });
      result.categoriesImported++;
    }

    result.success = true;
  } catch (error) {
    result.errors.push(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert legacy concept format to new format
 */
function convertLegacyConcepts(
  legacyConcepts: Record<string, LegacyConcept>
): Omit<Concept, 'createdAt' | 'updatedAt'>[] {
  const converted: Omit<Concept, 'createdAt' | 'updatedAt'>[] = [];

  for (const [id, legacy] of Object.entries(legacyConcepts)) {
    converted.push({
      id,
      name: legacy.name,
      description: legacy.description,
      category: legacy.category,
      difficulty: legacy.difficulty as 1 | 2 | 3 | 4 | 5,
      prerequisites: legacy.prerequisites,
      relatedConcepts: legacy.relatedConcepts,
      masteryThreshold: legacy.masteryThreshold,
      decayRate: legacy.decayRate,
      atomIds: legacy.atomIds,
      sourceContentIds: [], // New field, no legacy data
      keyTerms: legacy.keyTerms,
      aliases: [], // New field, no legacy data
      createdBy: 'manual',
      confidence: 1.0, // Manual = 100% confidence
    });
  }

  return converted;
}

/**
 * Convert legacy edge format to new format
 */
function convertLegacyEdges(
  legacyEdges: LegacyEdge[]
): Omit<ConceptEdge, 'createdAt'>[] {
  return legacyEdges.map((legacy) => ({
    id: `${legacy.from}_${legacy.relationship}_${legacy.to}`,
    from: legacy.from,
    to: legacy.to,
    relationship: legacy.relationship as EdgeRelationship,
    strength: legacy.strength,
    createdBy: 'manual' as const,
    confidence: 1.0,
  }));
}

/**
 * Get display name for a course ID
 */
function getCourseDisplayName(courseId: string): string {
  const displayNames: Record<string, string> = {
    'social-media-marketing': 'Social Media Marketing',
    'ai-at-work': 'AI at Work',
    // Add more as needed
  };
  return displayNames[courseId] || courseId;
}

// ============================================
// VERIFICATION
// ============================================

/**
 * Verify migration was successful by comparing counts
 */
export async function verifyMigration(
  legacyGraph: LegacyGraph
): Promise<{
  valid: boolean;
  expectedConcepts: number;
  actualConcepts: number;
  expectedEdges: number;
  // Note: We can't easily count edges without a separate query
  errors: string[];
}> {
  const result = {
    valid: false,
    expectedConcepts: Object.keys(legacyGraph.concepts).length,
    actualConcepts: 0,
    expectedEdges: legacyGraph.edges.length,
    errors: [] as string[],
  };

  try {
    const concepts = await getAllConcepts(legacyGraph.courseId);
    result.actualConcepts = concepts.length;

    if (result.actualConcepts === result.expectedConcepts) {
      result.valid = true;
    } else {
      result.errors.push(
        `Concept count mismatch: expected ${result.expectedConcepts}, got ${result.actualConcepts}`
      );
    }
  } catch (error) {
    result.errors.push(
      `Verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

// ============================================
// ROLLBACK
// ============================================

/**
 * Delete all data for a course (use with caution!)
 * For development/testing purposes
 */
export async function rollbackMigration(_courseId: string): Promise<{
  success: boolean;
  message: string;
}> {
  // This would require deleting the graph document and all subcollections
  // Firestore doesn't support recursive deletes from client SDK
  // This should be done via Firebase Admin SDK or Cloud Functions

  return {
    success: false,
    message:
      'Rollback not implemented in client SDK. Use Firebase Console or Admin SDK to delete data.',
  };
}

// ============================================
// CLI HELPER
// ============================================

/**
 * Run migration (for use in scripts)
 */
export async function runMigration(): Promise<void> {
  console.log('Starting knowledge graph migration...\n');

  const result = await migrateSocialMediaMarketingGraph();

  if (result.success) {
    console.log('✅ Migration completed successfully!\n');
    console.log(`  Course: ${result.courseId}`);
    console.log(`  Concepts imported: ${result.conceptsImported}`);
    console.log(`  Edges imported: ${result.edgesImported}`);
    console.log(`  Categories imported: ${result.categoriesImported}`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach((w) => console.log(`  - ${w}`));
    }
  } else {
    console.log('❌ Migration failed!\n');
    console.log('Errors:');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }
}
