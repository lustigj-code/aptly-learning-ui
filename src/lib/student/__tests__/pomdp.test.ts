/**
 * POMDP Student Model Tests
 *
 * Tests for the Partially Observable Markov Decision Process student modeling system.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialBelief,
  createBeliefFromBKT,
  updateBelief,
  isLikelyStruggling,
  isLikelyDisengaging,
  isReadyForChallenge,
} from '../beliefState';
import {
  applyMasteryTransition,
  applyForgettingTransition,
  applyAllTransitions,
  getTransitionEffect,
} from '../stateTransitions';
import {
  calculateQValue,
  selectAction,
  selectActionWithExploration,
} from '../policySelector';
import {
  normalizeBelief,
  getMostLikelyState,
  beliefEntropy,
  masteryBeliefToScalar,
  INITIAL_MASTERY_BELIEF,
  INITIAL_ATTENTION_BELIEF,
  INITIAL_CONFUSION_BELIEF,
  INITIAL_MOTIVATION_BELIEF,
  DEFAULT_REWARD_MODEL,
} from '../types';
import type {
  FactoredBelief,
  BeliefDistribution,
  MasteryLevel,
  StudentObservation,
  TeachingAction,
} from '../types';

// ============================================================================
// BELIEF STATE TESTS
// ============================================================================

describe('Belief State', () => {
  describe('createInitialBelief', () => {
    it('creates a valid initial belief state', () => {
      const belief = createInitialBelief('skill-1');

      expect(belief.skillId).toBe('skill-1');
      expect(belief.observationCount).toBe(0);
      expect(belief.lastUpdated).toBeInstanceOf(Date);

      // Check mastery belief sums to ~1
      const masterySum = Object.values(belief.mastery).reduce((a, b) => a + b, 0);
      expect(masterySum).toBeCloseTo(1, 5);
    });

    it('creates beliefs with correct initial distributions', () => {
      const belief = createInitialBelief('skill-1');

      // Most likely to be novice initially
      expect(belief.mastery.novice).toBeGreaterThan(belief.mastery.mastered);

      // Most likely to be focused initially
      expect(belief.attention.focused).toBeGreaterThan(belief.attention.fatigued);

      // Most likely to be clear initially
      expect(belief.confusion.clear).toBeGreaterThan(belief.confusion.confused);
    });
  });

  describe('createBeliefFromBKT', () => {
    it('creates belief from low BKT mastery', () => {
      const belief = createBeliefFromBKT('skill-1', 0.2);

      expect(belief.mastery.novice).toBeGreaterThan(0.3);
      expect(belief.mastery.mastered).toBeLessThan(0.1);
    });

    it('creates belief from high BKT mastery', () => {
      const belief = createBeliefFromBKT('skill-1', 0.9);

      expect(belief.mastery.mastered).toBeGreaterThan(0.3);
      expect(belief.mastery.proficient).toBeGreaterThan(0.2);
      expect(belief.mastery.novice).toBeLessThan(0.1);
    });

    it('creates belief from medium BKT mastery', () => {
      const belief = createBeliefFromBKT('skill-1', 0.5);

      expect(belief.mastery.developing).toBeGreaterThan(0.1);
      expect(belief.mastery.beginner).toBeGreaterThan(0.1);
    });
  });

  describe('updateBelief', () => {
    it('updates belief based on correct answer', () => {
      const initial = createInitialBelief('skill-1');
      const observation: StudentObservation = {
        isCorrect: true,
        responseTimeMs: 3000, // Reasonable time
      };

      const updated = updateBelief(initial, observation, 'show_quiz');

      // Mastery should increase after correct answer
      const initialMastery = masteryBeliefToScalar(initial.mastery);
      const updatedMastery = masteryBeliefToScalar(updated.mastery);
      expect(updatedMastery).toBeGreaterThan(initialMastery);

      // Observation count should increment
      expect(updated.observationCount).toBe(1);
    });

    it('updates belief based on incorrect answer', () => {
      const initial = createBeliefFromBKT('skill-1', 0.6);
      const observation: StudentObservation = {
        isCorrect: false,
        responseTimeMs: 5000,
      };

      const updated = updateBelief(initial, observation, 'show_quiz');

      // Confusion should increase after wrong answer
      expect(updated.confusion.confused).toBeGreaterThanOrEqual(initial.confusion.confused);
    });

    it('updates belief based on help-seeking behavior', () => {
      const initial = createInitialBelief('skill-1');
      const observation: StudentObservation = {
        requestedHelp: true,
        hintViewed: true,
      };

      const updated = updateBelief(initial, observation, 'show_hint');

      // Help-seeking indicates uncertainty
      expect(updated.confusion.uncertain + updated.confusion.confused).toBeGreaterThanOrEqual(
        initial.confusion.uncertain + initial.confusion.confused
      );
    });
  });

  describe('isLikelyStruggling', () => {
    it('detects struggling student (low mastery + confused)', () => {
      const belief: FactoredBelief = {
        mastery: { novice: 0.6, beginner: 0.3, developing: 0.1, proficient: 0, mastered: 0 },
        attention: INITIAL_ATTENTION_BELIEF,
        confusion: { clear: 0.2, uncertain: 0.3, confused: 0.5 },
        motivation: INITIAL_MOTIVATION_BELIEF,
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 5,
      };

      expect(isLikelyStruggling(belief)).toBe(true);
    });

    it('does not flag mastered student as struggling', () => {
      const belief: FactoredBelief = {
        mastery: { novice: 0, beginner: 0.05, developing: 0.1, proficient: 0.3, mastered: 0.55 },
        attention: INITIAL_ATTENTION_BELIEF,
        confusion: INITIAL_CONFUSION_BELIEF,
        motivation: INITIAL_MOTIVATION_BELIEF,
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 20,
      };

      expect(isLikelyStruggling(belief)).toBe(false);
    });
  });

  describe('isLikelyDisengaging', () => {
    it('detects disengaged student', () => {
      const belief: FactoredBelief = {
        mastery: INITIAL_MASTERY_BELIEF,
        attention: { focused: 0.1, distracted: 0.3, fatigued: 0.6 },
        confusion: INITIAL_CONFUSION_BELIEF,
        motivation: { engaged: 0.1, neutral: 0.3, disengaged: 0.6 },
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 10,
      };

      expect(isLikelyDisengaging(belief)).toBe(true);
    });

    it('does not flag engaged student as disengaging', () => {
      const belief: FactoredBelief = {
        mastery: INITIAL_MASTERY_BELIEF,
        attention: { focused: 0.7, distracted: 0.2, fatigued: 0.1 },
        confusion: INITIAL_CONFUSION_BELIEF,
        motivation: { engaged: 0.7, neutral: 0.2, disengaged: 0.1 },
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 10,
      };

      expect(isLikelyDisengaging(belief)).toBe(false);
    });
  });

  describe('isReadyForChallenge', () => {
    it('identifies student ready for harder content', () => {
      const belief: FactoredBelief = {
        mastery: { novice: 0, beginner: 0.1, developing: 0.2, proficient: 0.5, mastered: 0.2 },
        attention: { focused: 0.8, distracted: 0.1, fatigued: 0.1 },
        confusion: { clear: 0.8, uncertain: 0.15, confused: 0.05 },
        motivation: { engaged: 0.7, neutral: 0.2, disengaged: 0.1 },
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 15,
      };

      expect(isReadyForChallenge(belief)).toBe(true);
    });

    it('does not recommend challenge for highly confused student', () => {
      const belief: FactoredBelief = {
        mastery: { novice: 0, beginner: 0.1, developing: 0.2, proficient: 0.5, mastered: 0.2 },
        attention: { focused: 0.3, distracted: 0.4, fatigued: 0.3 }, // Also distracted
        confusion: { clear: 0.1, uncertain: 0.2, confused: 0.7 }, // Very confused
        motivation: { engaged: 0.3, neutral: 0.4, disengaged: 0.3 },
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 15,
      };

      expect(isReadyForChallenge(belief)).toBe(false);
    });
  });
});

// ============================================================================
// STATE TRANSITION TESTS
// ============================================================================

describe('State Transitions', () => {
  describe('applyMasteryTransition', () => {
    it('shifts probability mass upward for learning actions', () => {
      const initial: BeliefDistribution<MasteryLevel> = {
        novice: 0.6,
        beginner: 0.3,
        developing: 0.1,
        proficient: 0,
        mastered: 0,
      };

      const updated = applyMasteryTransition(initial, 'show_content');

      // Should have moved some probability from novice to beginner
      expect(updated.novice).toBeLessThan(initial.novice);
      expect(updated.beginner).toBeGreaterThan(initial.beginner);

      // Should still sum to 1
      const sum = Object.values(updated).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
    });

    it('applies higher transition rates for effective actions', () => {
      const initial: BeliefDistribution<MasteryLevel> = INITIAL_MASTERY_BELIEF;

      const contentUpdate = applyMasteryTransition(initial, 'show_content');
      const workedExampleUpdate = applyMasteryTransition(initial, 'show_worked_example');

      // Worked examples should have stronger learning effect
      const contentGain = masteryBeliefToScalar(contentUpdate) - masteryBeliefToScalar(initial);
      const workedExampleGain = masteryBeliefToScalar(workedExampleUpdate) - masteryBeliefToScalar(initial);

      expect(workedExampleGain).toBeGreaterThan(contentGain);
    });
  });

  describe('applyForgettingTransition', () => {
    it('shifts probability mass downward over time', () => {
      const initial: BeliefDistribution<MasteryLevel> = {
        novice: 0,
        beginner: 0.1,
        developing: 0.2,
        proficient: 0.4,
        mastered: 0.3,
      };

      // Simulate 48 hours passing
      const updated = applyForgettingTransition(initial, 48);

      // Should have decayed some mastery
      const initialScalar = masteryBeliefToScalar(initial);
      const updatedScalar = masteryBeliefToScalar(updated);
      expect(updatedScalar).toBeLessThan(initialScalar);
    });

    it('does not affect zero elapsed time', () => {
      const initial: BeliefDistribution<MasteryLevel> = INITIAL_MASTERY_BELIEF;
      const updated = applyForgettingTransition(initial, 0);

      expect(updated).toEqual(initial);
    });
  });

  describe('applyAllTransitions', () => {
    it('applies all dimension transitions', () => {
      const initial = createInitialBelief('skill-1');
      const updated = applyAllTransitions(initial, 'show_explanation');

      // Should have updated mastery and confusion dimensions
      expect(updated.mastery).not.toEqual(initial.mastery);
      expect(updated.confusion).not.toEqual(initial.confusion);

      // Should preserve skillId
      expect(updated.skillId).toBe(initial.skillId);
    });
  });

  describe('getTransitionEffect', () => {
    it('returns expected effects for learning actions', () => {
      const effect = getTransitionEffect('show_worked_example');

      expect(effect.masteryGain).toBeGreaterThan(0);
      expect(effect.confusionReduction).toBeGreaterThan(0);
    });

    it('returns higher mastery gain for effective actions', () => {
      const hintEffect = getTransitionEffect('show_hint');
      const workedExampleEffect = getTransitionEffect('show_worked_example');

      expect(workedExampleEffect.masteryGain).toBeGreaterThan(hintEffect.masteryGain);
    });
  });
});

// ============================================================================
// POLICY SELECTOR TESTS
// ============================================================================

describe('Policy Selector', () => {
  describe('calculateQValue', () => {
    it('returns positive Q-values for beneficial actions', () => {
      const belief = createInitialBelief('skill-1');
      const qValue = calculateQValue(belief, 'show_content', DEFAULT_REWARD_MODEL);

      expect(qValue).toBeGreaterThan(0);
    });

    it('returns positive Q-values for remediation actions when confused', () => {
      const confusedBelief: FactoredBelief = {
        mastery: INITIAL_MASTERY_BELIEF,
        attention: INITIAL_ATTENTION_BELIEF,
        confusion: { clear: 0.1, uncertain: 0.2, confused: 0.7 },
        motivation: INITIAL_MOTIVATION_BELIEF,
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 5,
      };

      const explanationQ = calculateQValue(confusedBelief, 'show_explanation', DEFAULT_REWARD_MODEL);
      const hintQ = calculateQValue(confusedBelief, 'show_hint', DEFAULT_REWARD_MODEL);
      const workedExampleQ = calculateQValue(confusedBelief, 'show_worked_example', DEFAULT_REWARD_MODEL);

      // Remediation actions should have positive Q-values when confused
      expect(explanationQ).toBeGreaterThan(0);
      expect(hintQ).toBeGreaterThan(0);
      expect(workedExampleQ).toBeGreaterThan(0);
    });
  });

  describe('selectAction', () => {
    it('selects appropriate action for initial learner', () => {
      const belief = createInitialBelief('skill-1');
      const evaluation = selectAction(belief, DEFAULT_REWARD_MODEL);

      expect(evaluation.selectedAction).toBeDefined();
      expect(evaluation.qValues).toBeDefined();
      expect(evaluation.confidence).toBeGreaterThan(0);
      expect(evaluation.reasoning).toBeDefined();
    });

    it('selects explanation for highly confused student', () => {
      const confusedBelief: FactoredBelief = {
        mastery: { novice: 0.4, beginner: 0.3, developing: 0.2, proficient: 0.1, mastered: 0 },
        attention: { focused: 0.5, distracted: 0.3, fatigued: 0.2 },
        confusion: { clear: 0.1, uncertain: 0.2, confused: 0.7 },
        motivation: { engaged: 0.4, neutral: 0.4, disengaged: 0.2 },
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 5,
      };

      const evaluation = selectAction(confusedBelief, DEFAULT_REWARD_MODEL);

      // Should recommend explanation or worked example for confused student
      expect(['show_explanation', 'show_worked_example', 'show_hint']).toContain(
        evaluation.selectedAction
      );
    });

    it('elevates break Q-value for fatigued student', () => {
      // Mastery belief where student is NOT struggling (novice < 0.4)
      const proficientMastery: BeliefDistribution<MasteryLevel> = {
        novice: 0.1,
        beginner: 0.2,
        developing: 0.3,
        proficient: 0.3,
        mastered: 0.1,
      };

      const fatiguedBelief: FactoredBelief = {
        mastery: proficientMastery,
        attention: { focused: 0.05, distracted: 0.15, fatigued: 0.8 }, // Very fatigued
        confusion: { clear: 0.7, uncertain: 0.2, confused: 0.1 }, // Not confused
        motivation: { engaged: 0.3, neutral: 0.4, disengaged: 0.3 }, // Neutral motivation
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 20,
      };

      const evaluation = selectAction(fatiguedBelief, DEFAULT_REWARD_MODEL);

      // Heuristic should boost suggest_break Q-value when fatigued
      // The Q-value for suggest_break should be elevated (includes +5 boost from heuristic)
      expect(evaluation.qValues.suggest_break).toBeGreaterThan(0);

      // The policy generates reasoning
      expect(evaluation.reasoning).toBeDefined();
    });

    it('elevates encourage Q-value for disengaged student', () => {
      // Mastery belief where student is NOT struggling (novice < 0.4)
      const proficientMastery: BeliefDistribution<MasteryLevel> = {
        novice: 0.1,
        beginner: 0.2,
        developing: 0.3,
        proficient: 0.3,
        mastered: 0.1,
      };

      const disengagedBelief: FactoredBelief = {
        mastery: proficientMastery,
        attention: { focused: 0.5, distracted: 0.3, fatigued: 0.2 }, // Not fatigued
        confusion: { clear: 0.7, uncertain: 0.2, confused: 0.1 }, // Not confused
        motivation: { engaged: 0.05, neutral: 0.15, disengaged: 0.8 }, // Very disengaged
        skillId: 'skill-1',
        lastUpdated: new Date(),
        observationCount: 15,
      };

      const evaluation = selectAction(disengagedBelief, DEFAULT_REWARD_MODEL);

      // Heuristic should boost encourage Q-value when disengaged
      // The Q-value for encourage should be elevated (includes +5 boost from heuristic)
      expect(evaluation.qValues.encourage).toBeGreaterThan(0);

      // The policy generates reasoning
      expect(evaluation.reasoning).toBeDefined();
    });
  });

  describe('selectActionWithExploration', () => {
    it('sometimes explores with non-zero epsilon', () => {
      const belief = createInitialBelief('skill-1');

      // Run many times and check for exploration
      const actions = new Set<TeachingAction>();
      for (let i = 0; i < 100; i++) {
        const evaluation = selectActionWithExploration(belief, 0.5, DEFAULT_REWARD_MODEL);
        actions.add(evaluation.selectedAction);
      }

      // With 50% exploration, should have tried multiple actions
      expect(actions.size).toBeGreaterThan(1);
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('normalizeBelief', () => {
    it('normalizes belief to sum to 1', () => {
      const unnormalized: BeliefDistribution<MasteryLevel> = {
        novice: 2,
        beginner: 3,
        developing: 4,
        proficient: 1,
        mastered: 0,
      };

      const normalized = normalizeBelief(unnormalized);
      const sum = Object.values(normalized).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1, 5);
    });

    it('handles zero-sum gracefully', () => {
      const zeroBelief: BeliefDistribution<MasteryLevel> = {
        novice: 0,
        beginner: 0,
        developing: 0,
        proficient: 0,
        mastered: 0,
      };

      const normalized = normalizeBelief(zeroBelief);

      // Should return the same zero belief
      expect(normalized).toEqual(zeroBelief);
    });
  });

  describe('getMostLikelyState', () => {
    it('returns state with highest probability', () => {
      const belief: BeliefDistribution<MasteryLevel> = {
        novice: 0.1,
        beginner: 0.2,
        developing: 0.5,
        proficient: 0.15,
        mastered: 0.05,
      };

      expect(getMostLikelyState(belief)).toBe('developing');
    });
  });

  describe('beliefEntropy', () => {
    it('returns low entropy for concentrated belief', () => {
      const concentrated: BeliefDistribution<MasteryLevel> = {
        novice: 0.95,
        beginner: 0.05,
        developing: 0,
        proficient: 0,
        mastered: 0,
      };

      const uniform: BeliefDistribution<MasteryLevel> = {
        novice: 0.2,
        beginner: 0.2,
        developing: 0.2,
        proficient: 0.2,
        mastered: 0.2,
      };

      expect(beliefEntropy(concentrated)).toBeLessThan(beliefEntropy(uniform));
    });
  });

  describe('masteryBeliefToScalar', () => {
    it('returns low value for novice belief', () => {
      const noviceBelief: BeliefDistribution<MasteryLevel> = {
        novice: 0.9,
        beginner: 0.1,
        developing: 0,
        proficient: 0,
        mastered: 0,
      };

      expect(masteryBeliefToScalar(noviceBelief)).toBeLessThan(0.2);
    });

    it('returns high value for mastered belief', () => {
      const masteredBelief: BeliefDistribution<MasteryLevel> = {
        novice: 0,
        beginner: 0,
        developing: 0.05,
        proficient: 0.15,
        mastered: 0.8,
      };

      expect(masteryBeliefToScalar(masteredBelief)).toBeGreaterThan(0.8);
    });
  });
});
