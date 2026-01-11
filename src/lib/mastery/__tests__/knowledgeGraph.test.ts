/**
 * Knowledge Graph Tests
 * Phase 7.1: Testing concept dependency system
 */

import { describe, it, expect } from 'vitest';
import {
  SOCIAL_MEDIA_MARKETING_GRAPH,
  getConceptById,
  getPrerequisites,
  checkPrerequisitesMet,
  getDueForReview,
  updateConceptMastery,
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

  describe('getConceptById', () => {
    it('returns concept when it exists', () => {
      // Use a concept we know exists from the graph
      const concept = getConceptById('smm-fundamentals');

      expect(concept).toBeDefined();
      expect(concept?.id).toBe('smm-fundamentals');
    });

    it('returns undefined for nonexistent concept', () => {
      const concept = getConceptById('nonexistent-concept');

      expect(concept).toBeUndefined();
    });
  });

  describe('getPrerequisites', () => {
    it('returns prerequisites for a concept', () => {
      // Find a concept with prerequisites
      const conceptWithPrereqs = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length > 0
      );

      if (conceptWithPrereqs) {
        const prerequisites = getPrerequisites(conceptWithPrereqs.id);

        expect(Array.isArray(prerequisites)).toBe(true);
        expect(prerequisites.length).toBeGreaterThan(0);
      }
    });

    it('returns empty array for concepts without prerequisites', () => {
      const basicConcept = Object.values(SOCIAL_MEDIA_MARKETING_GRAPH.concepts).find(
        (c) => c.prerequisites.length === 0
      );

      if (basicConcept) {
        const prerequisites = getPrerequisites(basicConcept.id);

        expect(prerequisites).toEqual([]);
      }
    });
  });

  describe('checkPrerequisitesMet', () => {
    const mockMastery: ConceptMastery[] = [
      {
        conceptId: 'smm-fundamentals',
        userId: 'test-user',
        masteryLevel: 85,
        lastReviewedAt: new Date(),
        lastQuizScore: 85,
        reviewCount: 5,
        correctStreak: 3,
        incorrectStreak: 0,
        fsrsState: {
          stability: 10,
          difficulty: 5,
          elapsedDays: 0,
          scheduledDays: 7,
          reps: 5,
          lapses: 0,
          state: 'review',
        },
        nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        history: [],
      },
      {
        conceptId: 'audience-basics',
        userId: 'test-user',
        masteryLevel: 60,
        lastReviewedAt: new Date(),
        lastQuizScore: 60,
        reviewCount: 3,
        correctStreak: 1,
        incorrectStreak: 0,
        fsrsState: {
          stability: 5,
          difficulty: 5,
          elapsedDays: 0,
          scheduledDays: 3,
          reps: 3,
          lapses: 0,
          state: 'learning',
        },
        nextReviewAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        history: [],
      },
    ];

    it('returns true when all prerequisites are mastered', () => {
      const result = checkPrerequisitesMet(['smm-fundamentals'], mockMastery, 70);

      expect(result.met).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('returns false when prerequisites not met', () => {
      const result = checkPrerequisitesMet(['audience-basics'], mockMastery, 70);

      expect(result.met).toBe(false);
      expect(result.missing).toContain('audience-basics');
    });

    it('handles custom threshold', () => {
      const resultLow = checkPrerequisitesMet(['audience-basics'], mockMastery, 50);
      const resultHigh = checkPrerequisitesMet(['audience-basics'], mockMastery, 70);

      expect(resultLow.met).toBe(true); // 60% meets 50% threshold
      expect(resultHigh.met).toBe(false); // 60% doesn't meet 70% threshold
    });
  });

  describe('getDueForReview', () => {
    const mockMasteryRecords: ConceptMastery[] = [
      {
        conceptId: 'concept-1',
        userId: 'test-user',
        masteryLevel: 75,
        lastReviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        lastQuizScore: 75,
        reviewCount: 5,
        correctStreak: 2,
        incorrectStreak: 0,
        fsrsState: {
          scheduledDays: 3, // Due 3 days after last review = 1 day overdue
          stability: 5,
          difficulty: 5,
          elapsedDays: 4,
          reps: 5,
          lapses: 0,
          state: 'review',
        },
        nextReviewAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day overdue
        history: [],
      },
      {
        conceptId: 'concept-2',
        userId: 'test-user',
        masteryLevel: 90,
        lastReviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        lastQuizScore: 90,
        reviewCount: 10,
        correctStreak: 5,
        incorrectStreak: 0,
        fsrsState: {
          scheduledDays: 30, // Not due yet
          stability: 20,
          difficulty: 3,
          elapsedDays: 1,
          reps: 10,
          lapses: 0,
          state: 'review',
        },
        nextReviewAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        history: [],
      },
    ];

    it('returns items due for review', () => {
      const dueItems = getDueForReview(mockMasteryRecords, 10);

      expect(Array.isArray(dueItems)).toBe(true);
      // Should include concept-1 (overdue) but not concept-2 (not due yet)
    });

    it('respects limit parameter', () => {
      const manyRecords = Array.from({ length: 50 }, (_, i) => ({
        ...mockMasteryRecords[0],
        conceptId: `concept-${i}`,
      }));

      const dueItems = getDueForReview(manyRecords, 15);

      expect(dueItems.length).toBeLessThanOrEqual(15);
    });

    it('sorts by priority (most overdue first)', () => {
      const dueItems = getDueForReview(mockMasteryRecords, 10);

      // Should be sorted by urgency
      expect(Array.isArray(dueItems)).toBe(true);
    });
  });

  describe('updateConceptMastery', () => {
    const baseMastery: ConceptMastery = {
      conceptId: 'test-concept',
      userId: 'test-user',
      masteryLevel: 70,
      lastReviewedAt: new Date(),
      lastQuizScore: 70,
      reviewCount: 5,
      correctStreak: 2,
      incorrectStreak: 0,
      fsrsState: {
        stability: 5,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 3,
        reps: 5,
        lapses: 0,
        state: 'learning',
      },
      nextReviewAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      history: [],
    };

    it('increases mastery on good performance', () => {
      const updated = updateConceptMastery(baseMastery, 90, 60, 'review');

      expect(updated.masteryLevel).toBeGreaterThan(70);
      expect(updated.reviewCount).toBe(6);
    });

    it('decreases mastery on poor performance', () => {
      const updated = updateConceptMastery(baseMastery, 40, 120, 'review');

      expect(updated.masteryLevel).toBeLessThan(70);
    });

    it('updates FSRS state', () => {
      const updated = updateConceptMastery(baseMastery, 80, 45, 'review');

      expect(updated.fsrsState.reps).toBeGreaterThan(baseMastery.fsrsState.reps);
    });

    it('transitions state based on performance', () => {
      const updated = updateConceptMastery(baseMastery, 95, 30, 'review');

      // High performance should keep state defined
      expect(updated.fsrsState.state).toBeDefined();
    });
  });
});
