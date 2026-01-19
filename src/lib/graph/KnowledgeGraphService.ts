/**
 * Knowledge Graph Service
 *
 * Provides CRUD operations for the knowledge graph stored in Firestore.
 * Supports both client-side and server-side usage.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Concept,
  ConceptEdge,
  ConceptCategory,
  KnowledgeGraph,
  ConceptMastery,
  ConceptId,
  COLLECTIONS,
  DEFAULT_CONCEPT,
  EdgeRelationship,
} from './types';

// ============================================
// GRAPH OPERATIONS
// ============================================

/**
 * Create a new knowledge graph for a course
 */
export async function createGraph(
  courseId: string,
  name: string,
  description: string
): Promise<KnowledgeGraph> {
  if (!db) throw new Error('Firestore not initialized');

  const graph: KnowledgeGraph = {
    courseId,
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    conceptCount: 0,
    edgeCount: 0,
  };

  const graphRef = doc(db, COLLECTIONS.GRAPHS, courseId);
  await setDoc(graphRef, {
    ...graph,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return graph;
}

/**
 * Get a knowledge graph by course ID
 */
export async function getGraph(courseId: string): Promise<KnowledgeGraph | null> {
  if (!db) throw new Error('Firestore not initialized');

  const graphRef = doc(db, COLLECTIONS.GRAPHS, courseId);
  const snapshot = await getDoc(graphRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    ...data,
    courseId: snapshot.id,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
  } as KnowledgeGraph;
}

/**
 * Update graph metadata (e.g., after adding/removing concepts)
 */
export async function updateGraphStats(
  courseId: string,
  conceptCount: number,
  edgeCount: number
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const graphRef = doc(db, COLLECTIONS.GRAPHS, courseId);
  await updateDoc(graphRef, {
    conceptCount,
    edgeCount,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// CONCEPT OPERATIONS
// ============================================

/**
 * Add a new concept to the graph
 */
export async function addConcept(
  courseId: string,
  concept: Omit<Concept, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Concept> {
  if (!db) throw new Error('Firestore not initialized');

  // Generate ID from name (slug)
  const id = generateConceptId(concept.name);

  const fullConcept: Concept = {
    ...DEFAULT_CONCEPT,
    ...concept,
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conceptRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.CONCEPTS, id);
  await setDoc(conceptRef, {
    ...fullConcept,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update graph stats
  const graph = await getGraph(courseId);
  if (graph) {
    await updateGraphStats(courseId, graph.conceptCount + 1, graph.edgeCount);
  }

  return fullConcept;
}

/**
 * Get a concept by ID
 */
export async function getConcept(
  courseId: string,
  conceptId: ConceptId
): Promise<Concept | null> {
  if (!db) throw new Error('Firestore not initialized');

  const conceptRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.CONCEPTS, conceptId);
  const snapshot = await getDoc(conceptRef);

  if (!snapshot.exists()) return null;

  return snapshotToConcept(snapshot);
}

/**
 * Get all concepts for a course
 */
export async function getAllConcepts(courseId: string): Promise<Concept[]> {
  if (!db) throw new Error('Firestore not initialized');

  const conceptsRef = collection(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.CONCEPTS);
  const snapshot = await getDocs(conceptsRef);

  return snapshot.docs.map(snapshotToConcept);
}

/**
 * Get concepts by category
 */
export async function getConceptsByCategory(
  courseId: string,
  category: string
): Promise<Concept[]> {
  if (!db) throw new Error('Firestore not initialized');

  const conceptsRef = collection(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.CONCEPTS);
  const q = query(conceptsRef, where('category', '==', category));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(snapshotToConcept);
}

/**
 * Get concepts by difficulty range
 */
export async function getConceptsByDifficulty(
  courseId: string,
  minDifficulty: number,
  maxDifficulty: number
): Promise<Concept[]> {
  if (!db) throw new Error('Firestore not initialized');

  const conceptsRef = collection(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.CONCEPTS);
  const q = query(
    conceptsRef,
    where('difficulty', '>=', minDifficulty),
    where('difficulty', '<=', maxDifficulty)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(snapshotToConcept);
}

/**
 * Update a concept
 */
export async function updateConcept(
  courseId: string,
  conceptId: ConceptId,
  updates: Partial<Omit<Concept, 'id' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const conceptRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.CONCEPTS, conceptId);
  await updateDoc(conceptRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a concept and its edges
 */
export async function deleteConcept(
  courseId: string,
  conceptId: ConceptId
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const batch = writeBatch(db);

  // Delete the concept
  const conceptRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.CONCEPTS, conceptId);
  batch.delete(conceptRef);

  // Delete all edges involving this concept
  const edges = await getEdgesForConcept(courseId, conceptId);
  for (const edge of edges) {
    const edgeRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.EDGES, edge.id);
    batch.delete(edgeRef);
  }

  await batch.commit();

  // Update graph stats
  const graph = await getGraph(courseId);
  if (graph) {
    await updateGraphStats(
      courseId,
      Math.max(0, graph.conceptCount - 1),
      Math.max(0, graph.edgeCount - edges.length)
    );
  }
}

/**
 * Search concepts by name or key terms
 */
export async function searchConcepts(
  courseId: string,
  searchTerm: string
): Promise<Concept[]> {
  if (!db) throw new Error('Firestore not initialized');

  const normalizedTerm = searchTerm.toLowerCase().trim();

  // Get all concepts and filter client-side
  // Note: For production, consider using Algolia or similar for full-text search
  const allConcepts = await getAllConcepts(courseId);

  return allConcepts.filter((concept) => {
    const nameMatch = concept.name.toLowerCase().includes(normalizedTerm);
    const aliasMatch = concept.aliases.some((alias) =>
      alias.toLowerCase().includes(normalizedTerm)
    );
    const termMatch = concept.keyTerms.some((term) =>
      term.toLowerCase().includes(normalizedTerm)
    );
    return nameMatch || aliasMatch || termMatch;
  });
}

/**
 * Find concept by name (for matching during ingestion)
 */
export async function findConceptByName(
  courseId: string,
  name: string
): Promise<Concept | null> {
  const normalizedName = name.toLowerCase().trim();
  const allConcepts = await getAllConcepts(courseId);

  // Try exact match first
  let found = allConcepts.find(
    (c) => c.name.toLowerCase() === normalizedName
  );

  // Then try aliases
  if (!found) {
    found = allConcepts.find((c) =>
      c.aliases.some((alias) => alias.toLowerCase() === normalizedName)
    );
  }

  return found || null;
}

// ============================================
// EDGE OPERATIONS
// ============================================

/**
 * Add an edge between two concepts
 */
export async function addEdge(
  courseId: string,
  fromConceptId: ConceptId,
  toConceptId: ConceptId,
  relationship: EdgeRelationship,
  strength: number = 1.0,
  confidence: number = 1.0,
  createdBy: 'manual' | 'ai_extraction' = 'manual'
): Promise<ConceptEdge> {
  if (!db) throw new Error('Firestore not initialized');

  const id = `${fromConceptId}_${relationship}_${toConceptId}`;

  const edge: ConceptEdge = {
    id,
    from: fromConceptId,
    to: toConceptId,
    relationship,
    strength,
    createdAt: new Date(),
    createdBy,
    confidence,
  };

  const edgeRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.EDGES, id);
  await setDoc(edgeRef, {
    ...edge,
    createdAt: serverTimestamp(),
  });

  // Update graph stats
  const graph = await getGraph(courseId);
  if (graph) {
    await updateGraphStats(courseId, graph.conceptCount, graph.edgeCount + 1);
  }

  // If this is a prerequisite edge, update the concept's prerequisites array
  if (relationship === 'prerequisite') {
    const toConcept = await getConcept(courseId, toConceptId);
    if (toConcept && !toConcept.prerequisites.includes(fromConceptId)) {
      await updateConcept(courseId, toConceptId, {
        prerequisites: [...toConcept.prerequisites, fromConceptId],
      });
    }
  }

  return edge;
}

/**
 * Get all edges for a course
 */
export async function getAllEdges(courseId: string): Promise<ConceptEdge[]> {
  if (!db) throw new Error('Firestore not initialized');

  const edgesRef = collection(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.EDGES);
  const snapshot = await getDocs(edgesRef);

  return snapshot.docs.map(snapshotToEdge);
}

/**
 * Get edges for a specific concept (both incoming and outgoing)
 */
export async function getEdgesForConcept(
  courseId: string,
  conceptId: ConceptId
): Promise<ConceptEdge[]> {
  if (!db) throw new Error('Firestore not initialized');

  const edgesRef = collection(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.EDGES);

  // Get outgoing edges
  const outgoingQuery = query(edgesRef, where('from', '==', conceptId));
  const outgoingSnapshot = await getDocs(outgoingQuery);

  // Get incoming edges
  const incomingQuery = query(edgesRef, where('to', '==', conceptId));
  const incomingSnapshot = await getDocs(incomingQuery);

  const outgoing = outgoingSnapshot.docs.map(snapshotToEdge);
  const incoming = incomingSnapshot.docs.map(snapshotToEdge);

  // Deduplicate
  const edgeMap = new Map<string, ConceptEdge>();
  [...outgoing, ...incoming].forEach((edge) => edgeMap.set(edge.id, edge));

  return Array.from(edgeMap.values());
}

/**
 * Get prerequisite edges for a concept
 */
export async function getPrerequisiteEdges(
  courseId: string,
  conceptId: ConceptId
): Promise<ConceptEdge[]> {
  if (!db) throw new Error('Firestore not initialized');

  const edgesRef = collection(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.EDGES);
  const q = query(
    edgesRef,
    where('to', '==', conceptId),
    where('relationship', '==', 'prerequisite')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(snapshotToEdge);
}

/**
 * Delete an edge
 */
export async function deleteEdge(
  courseId: string,
  edgeId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  // Get the edge first to update prerequisite arrays
  const edgeRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.EDGES, edgeId);
  const edgeSnapshot = await getDoc(edgeRef);

  if (edgeSnapshot.exists()) {
    const edge = snapshotToEdge(edgeSnapshot);

    // If this was a prerequisite, remove from concept's prerequisites array
    if (edge.relationship === 'prerequisite') {
      const toConcept = await getConcept(courseId, edge.to);
      if (toConcept) {
        await updateConcept(courseId, edge.to, {
          prerequisites: toConcept.prerequisites.filter((p) => p !== edge.from),
        });
      }
    }

    await deleteDoc(edgeRef);

    // Update graph stats
    const graph = await getGraph(courseId);
    if (graph) {
      await updateGraphStats(courseId, graph.conceptCount, Math.max(0, graph.edgeCount - 1));
    }
  }
}

// ============================================
// CATEGORY OPERATIONS
// ============================================

/**
 * Add a category to the graph
 */
export async function addCategory(
  courseId: string,
  category: Omit<ConceptCategory, 'conceptIds'>
): Promise<ConceptCategory> {
  if (!db) throw new Error('Firestore not initialized');

  const fullCategory: ConceptCategory = {
    ...category,
    conceptIds: [],
    courseId,
  };

  const categoryRef = doc(
    db,
    COLLECTIONS.GRAPHS,
    courseId,
    COLLECTIONS.CATEGORIES,
    category.id
  );
  await setDoc(categoryRef, fullCategory);

  return fullCategory;
}

/**
 * Get all categories for a course
 */
export async function getAllCategories(courseId: string): Promise<ConceptCategory[]> {
  if (!db) throw new Error('Firestore not initialized');

  const categoriesRef = collection(
    db,
    COLLECTIONS.GRAPHS,
    courseId,
    COLLECTIONS.CATEGORIES
  );
  const snapshot = await getDocs(categoriesRef);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ConceptCategory[];
}

/**
 * Update a category
 */
export async function updateCategory(
  courseId: string,
  categoryId: string,
  updates: Partial<Omit<ConceptCategory, 'id' | 'courseId'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const categoryRef = doc(
    db,
    COLLECTIONS.GRAPHS,
    courseId,
    COLLECTIONS.CATEGORIES,
    categoryId
  );
  await updateDoc(categoryRef, updates);
}

// ============================================
// MASTERY OPERATIONS
// ============================================

/**
 * Get user's mastery for a concept
 */
export async function getConceptMastery(
  userId: string,
  conceptId: ConceptId
): Promise<ConceptMastery | null> {
  if (!db) throw new Error('Firestore not initialized');

  const masteryRef = doc(db, COLLECTIONS.MASTERY, `${userId}_${conceptId}`);
  const snapshot = await getDoc(masteryRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    lastReviewedAt: (data.lastReviewedAt as Timestamp)?.toDate() || new Date(),
    nextReviewAt: (data.nextReviewAt as Timestamp)?.toDate() || new Date(),
    history: (data.history || []).map((event: { timestamp: Timestamp; correct?: boolean; score?: number }) => ({
      ...event,
      timestamp: (event.timestamp as Timestamp)?.toDate() || new Date(),
    })),
  } as ConceptMastery;
}

/**
 * Get all mastery records for a user
 */
export async function getUserMastery(userId: string): Promise<ConceptMastery[]> {
  if (!db) throw new Error('Firestore not initialized');

  const masteryRef = collection(db, COLLECTIONS.MASTERY);
  const q = query(masteryRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      lastReviewedAt: (data.lastReviewedAt as Timestamp)?.toDate() || new Date(),
      nextReviewAt: (data.nextReviewAt as Timestamp)?.toDate() || new Date(),
      history: (data.history || []).map((event: { timestamp: Timestamp; correct?: boolean; score?: number }) => ({
        ...event,
        timestamp: (event.timestamp as Timestamp)?.toDate() || new Date(),
      })),
    } as ConceptMastery;
  });
}

/**
 * Update user's mastery for a concept
 */
export async function updateConceptMastery(
  userId: string,
  conceptId: ConceptId,
  updates: Partial<Omit<ConceptMastery, 'id' | 'userId' | 'conceptId'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const masteryRef = doc(db, COLLECTIONS.MASTERY, `${userId}_${conceptId}`);
  const existing = await getDoc(masteryRef);

  if (existing.exists()) {
    await updateDoc(masteryRef, updates);
  } else {
    // Create new mastery record
    await setDoc(masteryRef, {
      userId,
      conceptId,
      masteryLevel: 0,
      lastReviewedAt: new Date(),
      lastQuizScore: 0,
      reviewCount: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      fsrsState: {
        stability: 0,
        difficulty: 0.3,
        elapsedDays: 0,
        scheduledDays: 1,
        reps: 0,
        lapses: 0,
        state: 'new',
      },
      nextReviewAt: new Date(),
      history: [],
      ...updates,
    });
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Import multiple concepts at once (for migration or bulk import)
 */
export async function importConcepts(
  courseId: string,
  concepts: Omit<Concept, 'createdAt' | 'updatedAt'>[]
): Promise<Concept[]> {
  if (!db) throw new Error('Firestore not initialized');

  const batch = writeBatch(db);
  const importedConcepts: Concept[] = [];

  for (const concept of concepts) {
    const fullConcept: Concept = {
      ...DEFAULT_CONCEPT,
      ...concept,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const conceptRef = doc(
      db,
      COLLECTIONS.GRAPHS,
      courseId,
      COLLECTIONS.CONCEPTS,
      concept.id
    );
    batch.set(conceptRef, {
      ...fullConcept,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    importedConcepts.push(fullConcept);
  }

  await batch.commit();

  // Update graph stats
  const graph = await getGraph(courseId);
  if (graph) {
    await updateGraphStats(courseId, graph.conceptCount + concepts.length, graph.edgeCount);
  }

  return importedConcepts;
}

/**
 * Import multiple edges at once
 */
export async function importEdges(
  courseId: string,
  edges: Omit<ConceptEdge, 'createdAt'>[]
): Promise<ConceptEdge[]> {
  if (!db) throw new Error('Firestore not initialized');

  const batch = writeBatch(db);
  const importedEdges: ConceptEdge[] = [];

  for (const edge of edges) {
    const fullEdge: ConceptEdge = {
      ...edge,
      createdAt: new Date(),
    };

    const edgeRef = doc(db, COLLECTIONS.GRAPHS, courseId, COLLECTIONS.EDGES, edge.id);
    batch.set(edgeRef, {
      ...fullEdge,
      createdAt: serverTimestamp(),
    });

    importedEdges.push(fullEdge);
  }

  await batch.commit();

  // Update graph stats
  const graph = await getGraph(courseId);
  if (graph) {
    await updateGraphStats(courseId, graph.conceptCount, graph.edgeCount + edges.length);
  }

  return importedEdges;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a URL-safe concept ID from name
 */
export function generateConceptId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Convert Firestore snapshot to Concept
 */
function snapshotToConcept(snapshot: { id: string; data: () => Record<string, unknown> }): Concept {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
  } as Concept;
}

/**
 * Convert Firestore snapshot to Edge
 */
function snapshotToEdge(snapshot: { id: string; data: () => Record<string, unknown> }): ConceptEdge {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
  } as ConceptEdge;
}
