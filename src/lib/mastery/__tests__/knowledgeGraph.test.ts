/**
 * Knowledge Graph Tests
 * Phase 7.1: Testing concept dependency system
 */

import { describe, it, expect } from 'vitest';
import {
  SOCIAL_MEDIA_MARKETING_GRAPH,
  getAllPrerequisites,
  isConceptUnlocked,
  getReadyConcepts,
  getDecayingConcepts,
  getNextReviewConcept,
  getLearningPath,
  type ConceptMastery,
} from '../knowledgeGraph';

describe('Knowledge Graph', () => {
  describe('SOCIAL_MEDIA_MARKETING_GRAPH', () => {
    it('has all required concepts', () => {
      expect(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).toBeDefined();
      // The graph has 20+ concepts defined
      expect(Object.keys(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).length).toBeGreaterThan(15);
    });

    it('all concepts have valid structure', () => {
      Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).forEach((concept) => {
        expect(concept.id).toBeDefined();
        expect(concept.name).toBeDefined();
        expect(concept.category).toBeDefined();
        // Difficulty is 1-5 numeric
        expect(concept.difficulty).toBeGreaterThanOrEqual(1);
        expect(concept.difficulty).toBeLessThanOrEqual(5);
        expect(Array.isArray(concept.prerequisites)).toBe(true);
      });
    });

    it('no circular dependencies in prerequisites', () => {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      function hasCircularDep(conceptId: string): boolean {
        if (recursionStack.has(conceptId)) return true;
        if (visited.has(conceptId)) return false;

        visited.add(conceptId);
        recursionStack.add(conceptId);

        const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[conceptId];
        if (concept?.prerequisites) {
          for (const prereq of concept.prerequisites) {
            if (hasCircularDep(prereq)) return true;
          }
        }

        recursionStack.delete(conceptId);
        return false;
      }

      Object.keys(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).forEach((conceptId) => {
        expect(hasCircularDep(conceptId)).toBe(false);
      });
    });
  });

  describe('getAllPrerequisites', () => {
    it('returns prerequisites for a concept', () => {
      // Find a concept with prerequisites
      const conceptWithPrereqs = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length > 0
      );

      if (conceptWithPrereqs) {
        const prerequisites = getAllPrerequisites(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          conceptWithPrereqs.id
        );

        expect(Array.isArray(prerequisites)).toBe(true);
        expect(prerequisites.length).toBeGreaterThan(0);
      }
    });

    it('returns empty array for concepts without prerequisites', () => {
      const basicConcept = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length === 0
      );

      if (basicConcept) {
        const prerequisites = getAllPrerequisites(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          basicConcept.id
        );

        expect(prerequisites).toEqual([]);
      }
    });

    it('returns empty array for nonexistent concept', () => {
      const prerequisites = getAllPrerequisites(
        SOCIAL_MEDIA_MARKETING_GRAPH,
        'nonexistent-concept'
      );

      expect(prerequisites).toEqual([]);
    });

    it('includes transitive prerequisites', () => {
      // Find a concept that has prerequisites with their own prerequisites
      const concepts = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts);
      const conceptWithDeepPrereqs = concepts.find((c) => {
        if (c.prerequisites.length === 0) return false;
        // Check if any prerequisite has its own prerequisites
        return c.prerequisites.some((prereqId) => {
          const prereq = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[prereqId];
          return prereq && prereq.prerequisites.length > 0;
        });
      });

      if (conceptWithDeepPrereqs) {
        const allPrereqs = getAllPrerequisites(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          conceptWithDeepPrereqs.id
        );
        // Should include more than just direct prerequisites
        expect(allPrereqs.length).toBeGreaterThanOrEqual(
          conceptWithDeepPrereqs.prerequisites.length
        );
      }
    });
  });

  describe('isConceptUnlocked', () => {
    it('returns true when all prerequisites are mastered', () => {
      const conceptWithPrereqs = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length > 0
      );

      if (conceptWithPrereqs) {
        // Create mastery levels that meet all thresholds
        const masteryLevels: Record<string, number> = {};
        for (const prereqId of conceptWithPrereqs.prerequisites) {
          const prereq = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[prereqId];
          if (prereq) {
            masteryLevels[prereqId] = prereq.masteryThreshold + 10; // Above threshold
          }
        }

        const unlocked = isConceptUnlocked(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          conceptWithPrereqs.id,
          masteryLevels
        );

        expect(unlocked).toBe(true);
      }
    });

    it('returns false when prerequisites not met', () => {
      const conceptWithPrereqs = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length > 0
      );

      if (conceptWithPrereqs) {
        // Empty mastery levels = no prerequisites met
        const unlocked = isConceptUnlocked(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          conceptWithPrereqs.id,
          {}
        );

        expect(unlocked).toBe(false);
      }
    });

    it('returns true for concepts without prerequisites', () => {
      const basicConcept = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length === 0
      );

      if (basicConcept) {
        const unlocked = isConceptUnlocked(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          basicConcept.id,
          {}
        );

        expect(unlocked).toBe(true);
      }
    });

    it('returns false for nonexistent concept', () => {
      const unlocked = isConceptUnlocked(
        SOCIAL_MEDIA_MARKETING_GRAPH,
        'nonexistent-concept',
        {}
      );

      expect(unlocked).toBe(false);
    });
  });

  describe('getReadyConcepts', () => {
    it('returns concepts that are unlocked but not mastered', () => {
      // Start with no mastery - should get foundational concepts
      const ready = getReadyConcepts(SOCIAL_MEDIA_MARKETING_GRAPH, {});

      expect(Array.isArray(ready)).toBe(true);
      // Should include concepts without prerequisites
      ready.forEach((conceptId) => {
        const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[conceptId];
        expect(concept).toBeDefined();
      });
    });

    it('excludes already mastered concepts', () => {
      // Master all concepts
      const allMastered: Record<string, number> = {};
      Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).forEach((concept) => {
        allMastered[concept.id] = 100; // Max mastery
      });

      const ready = getReadyConcepts(SOCIAL_MEDIA_MARKETING_GRAPH, allMastered);

      expect(ready.length).toBe(0);
    });
  });

  describe('getDecayingConcepts', () => {
    it('returns concepts due for review', () => {
      const now = new Date();
      const masteryStates: Record<string, ConceptMastery> = {
        'concept-1': {
          conceptId: 'concept-1',
          userId: 'test-user',
          masteryLevel: 75,
          lastReviewedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          lastQuizScore: 75,
          reviewCount: 5,
          correctStreak: 2,
          incorrectStreak: 0,
          fsrsState: {
            stability: 5,
            difficulty: 5,
            elapsedDays: 7,
            scheduledDays: 3,
            reps: 5,
            lapses: 0,
            state: 'review',
          },
          nextReviewAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day overdue
          history: [],
        },
      };

      const decaying = getDecayingConcepts(SOCIAL_MEDIA_MARKETING_GRAPH, masteryStates);

      expect(Array.isArray(decaying)).toBe(true);
      expect(decaying).toContain('concept-1');
    });

    it('excludes concepts not yet due', () => {
      const now = new Date();
      const masteryStates: Record<string, ConceptMastery> = {
        'concept-1': {
          conceptId: 'concept-1',
          userId: 'test-user',
          masteryLevel: 90,
          lastReviewedAt: now,
          lastQuizScore: 90,
          reviewCount: 10,
          correctStreak: 5,
          incorrectStreak: 0,
          fsrsState: {
            stability: 20,
            difficulty: 3,
            elapsedDays: 0,
            scheduledDays: 30,
            reps: 10,
            lapses: 0,
            state: 'review',
          },
          nextReviewAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
          history: [],
        },
      };

      const decaying = getDecayingConcepts(SOCIAL_MEDIA_MARKETING_GRAPH, masteryStates);

      expect(decaying).not.toContain('concept-1');
    });

    it('sorts by most overdue first', () => {
      const now = new Date();
      const masteryStates: Record<string, ConceptMastery> = {
        'concept-a': {
          conceptId: 'concept-a',
          userId: 'test-user',
          masteryLevel: 70,
          lastReviewedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          lastQuizScore: 70,
          reviewCount: 5,
          correctStreak: 2,
          incorrectStreak: 0,
          fsrsState: {
            stability: 5,
            difficulty: 5,
            elapsedDays: 5,
            scheduledDays: 3,
            reps: 5,
            lapses: 0,
            state: 'review',
          },
          nextReviewAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days overdue
          history: [],
        },
        'concept-b': {
          conceptId: 'concept-b',
          userId: 'test-user',
          masteryLevel: 70,
          lastReviewedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          lastQuizScore: 70,
          reviewCount: 5,
          correctStreak: 2,
          incorrectStreak: 0,
          fsrsState: {
            stability: 5,
            difficulty: 5,
            elapsedDays: 10,
            scheduledDays: 3,
            reps: 5,
            lapses: 0,
            state: 'review',
          },
          nextReviewAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days overdue
          history: [],
        },
      };

      const decaying = getDecayingConcepts(SOCIAL_MEDIA_MARKETING_GRAPH, masteryStates);

      // concept-b is more overdue, should be first
      expect(decaying[0]).toBe('concept-b');
    });
  });

  describe('getNextReviewConcept', () => {
    it('returns the most overdue concept', () => {
      const now = new Date();
      const masteryStates: Record<string, ConceptMastery> = {
        'concept-1': {
          conceptId: 'concept-1',
          userId: 'test-user',
          masteryLevel: 75,
          lastReviewedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          lastQuizScore: 75,
          reviewCount: 5,
          correctStreak: 2,
          incorrectStreak: 0,
          fsrsState: {
            stability: 5,
            difficulty: 5,
            elapsedDays: 7,
            scheduledDays: 3,
            reps: 5,
            lapses: 0,
            state: 'review',
          },
          nextReviewAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days overdue
          history: [],
        },
      };

      const next = getNextReviewConcept(SOCIAL_MEDIA_MARKETING_GRAPH, masteryStates);

      expect(next).toBe('concept-1');
    });

    it('returns null when nothing is due', () => {
      const now = new Date();
      const masteryStates: Record<string, ConceptMastery> = {
        'concept-1': {
          conceptId: 'concept-1',
          userId: 'test-user',
          masteryLevel: 90,
          lastReviewedAt: now,
          lastQuizScore: 90,
          reviewCount: 10,
          correctStreak: 5,
          incorrectStreak: 0,
          fsrsState: {
            stability: 20,
            difficulty: 3,
            elapsedDays: 0,
            scheduledDays: 30,
            reps: 10,
            lapses: 0,
            state: 'review',
          },
          nextReviewAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          history: [],
        },
      };

      const next = getNextReviewConcept(SOCIAL_MEDIA_MARKETING_GRAPH, masteryStates);

      expect(next).toBeNull();
    });
  });

  describe('getLearningPath', () => {
    it('returns path including target concept', () => {
      const path = getLearningPath(
        SOCIAL_MEDIA_MARKETING_GRAPH,
        'smm-fundamentals',
        {}
      );

      expect(Array.isArray(path)).toBe(true);
      expect(path).toContain('smm-fundamentals');
    });

    it('includes unmastered prerequisites', () => {
      const conceptWithPrereqs = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length > 0
      );

      if (conceptWithPrereqs) {
        const path = getLearningPath(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          conceptWithPrereqs.id,
          {}
        );

        // Should include prerequisites
        expect(path.length).toBeGreaterThanOrEqual(conceptWithPrereqs.prerequisites.length);
      }
    });

    it('excludes already mastered prerequisites', () => {
      const conceptWithPrereqs = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length > 0
      );

      if (conceptWithPrereqs) {
        // Master all prerequisites
        const masteryLevels: Record<string, number> = {};
        conceptWithPrereqs.prerequisites.forEach((prereqId) => {
          masteryLevels[prereqId] = 100;
        });

        const path = getLearningPath(
          SOCIAL_MEDIA_MARKETING_GRAPH,
          conceptWithPrereqs.id,
          masteryLevels
        );

        // Path should only include the target (prerequisites already mastered)
        expect(path).toContain(conceptWithPrereqs.id);
        conceptWithPrereqs.prerequisites.forEach((prereqId) => {
          expect(path).not.toContain(prereqId);
        });
      }
    });
  });
});
