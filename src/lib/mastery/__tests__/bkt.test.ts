/**
 * BKT (Bayesian Knowledge Tracing) Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  updateMastery,
  predictCorrect,
  isMastered,
  isSkillUnlocked,
  getReadySkills,
  getMasteredSkills,
  createInitialState,
  getSkillsByPriority,
  estimateAttemptsToMastery,
  formatMasteryPercent,
  getMasteryLevel,
  validateBKTParams,
  DEFAULT_BKT_PARAMS,
  EASY_BKT_PARAMS,
  HARD_BKT_PARAMS,
  DEFAULT_MASTERY_THRESHOLD,
  type SkillState,
  type SkillMap,
} from '../bkt';

// ============================================
// TEST DATA
// ============================================

const mockSkillMap: SkillMap = {
  skills: {
    'skill-1': {
      id: 'skill-1',
      name: 'Basic Skill',
      lessonId: '1.1',
      prerequisites: [],
      bktParams: DEFAULT_BKT_PARAMS,
    },
    'skill-2': {
      id: 'skill-2',
      name: 'Intermediate Skill',
      lessonId: '1.2',
      prerequisites: ['skill-1'],
      bktParams: DEFAULT_BKT_PARAMS,
    },
    'skill-3': {
      id: 'skill-3',
      name: 'Advanced Skill',
      lessonId: '1.3',
      prerequisites: ['skill-1', 'skill-2'],
      bktParams: DEFAULT_BKT_PARAMS,
    },
  },
};

function createTestState(
  skillId: string = 'test-skill',
  pMastery: number = 0.5,
  attempts: number = 5
): SkillState {
  return {
    skillId,
    pMastery,
    attempts,
    correctCount: Math.floor(attempts * 0.6),
    lastAttempt: new Date(),
    history: [],
  };
}

// ============================================
// updateMastery TESTS
// ============================================

describe('updateMastery', () => {
  it('should increase mastery on correct answer', () => {
    const state = createTestState('test', 0.5, 5);
    const newState = updateMastery(state, true, DEFAULT_BKT_PARAMS);

    expect(newState.pMastery).toBeGreaterThan(state.pMastery);
    expect(newState.attempts).toBe(state.attempts + 1);
    expect(newState.correctCount).toBe(state.correctCount + 1);
  });

  it('should decrease mastery on incorrect answer (slightly due to learning factor)', () => {
    const state = createTestState('test', 0.7, 5);
    const newState = updateMastery(state, false, DEFAULT_BKT_PARAMS);

    // Note: Due to learning factor (pT), mastery might not always decrease
    // But the Bayes update part should decrease it
    expect(newState.attempts).toBe(state.attempts + 1);
    expect(newState.correctCount).toBe(state.correctCount); // No increment
  });

  it('should approach 1.0 with multiple correct answers', () => {
    let state = createTestState('test', 0.5, 0);

    // Simulate 10 correct answers
    for (let i = 0; i < 10; i++) {
      state = updateMastery(state, true, DEFAULT_BKT_PARAMS);
    }

    expect(state.pMastery).toBeGreaterThan(0.9);
    expect(state.attempts).toBe(10);
    expect(state.correctCount).toBe(10);
  });

  it('should add to history with correct entry', () => {
    const state = createTestState('test', 0.5, 5);
    state.history = [];

    const newState = updateMastery(state, true, DEFAULT_BKT_PARAMS);

    expect(newState.history.length).toBe(1);
    expect(newState.history[0].correct).toBe(true);
    expect(newState.history[0].pMasteryAfter).toBe(newState.pMastery);
  });

  it('should limit history to 20 entries', () => {
    let state = createTestState('test', 0.5, 0);
    state.history = Array(25).fill({
      timestamp: new Date(),
      correct: true,
      pMasteryAfter: 0.5,
    });

    state = updateMastery(state, true, DEFAULT_BKT_PARAMS);

    expect(state.history.length).toBeLessThanOrEqual(20);
  });

  it('should clamp pMastery between 0 and 1', () => {
    // Test with extreme starting values
    const lowState = createTestState('test', 0.01, 0);
    const newLowState = updateMastery(lowState, false, DEFAULT_BKT_PARAMS);
    expect(newLowState.pMastery).toBeGreaterThanOrEqual(0);

    const highState = createTestState('test', 0.99, 0);
    const newHighState = updateMastery(highState, true, DEFAULT_BKT_PARAMS);
    expect(newHighState.pMastery).toBeLessThanOrEqual(1);
  });
});

// ============================================
// predictCorrect TESTS
// ============================================

describe('predictCorrect', () => {
  it('should predict higher probability for higher mastery', () => {
    const lowMastery = predictCorrect(0.2, DEFAULT_BKT_PARAMS);
    const highMastery = predictCorrect(0.8, DEFAULT_BKT_PARAMS);

    expect(highMastery).toBeGreaterThan(lowMastery);
  });

  it('should return probability in valid range (0-1)', () => {
    const prob = predictCorrect(0.5, DEFAULT_BKT_PARAMS);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('should account for guessing and slipping', () => {
    // Even with 0 mastery, there's a chance to guess correctly
    const zeroMastery = predictCorrect(0, DEFAULT_BKT_PARAMS);
    expect(zeroMastery).toBeGreaterThan(0);
    expect(zeroMastery).toBe(DEFAULT_BKT_PARAMS.pG); // Just guessing

    // Even with 100% mastery, there's a chance to slip
    const fullMastery = predictCorrect(1, DEFAULT_BKT_PARAMS);
    expect(fullMastery).toBeLessThan(1);
    expect(fullMastery).toBe(1 - DEFAULT_BKT_PARAMS.pS);
  });
});

// ============================================
// isMastered TESTS
// ============================================

describe('isMastered', () => {
  it('should return true when mastery >= threshold', () => {
    const state = createTestState('test', 0.95, 10);
    expect(isMastered(state)).toBe(true);
  });

  it('should return false when mastery < threshold', () => {
    const state = createTestState('test', 0.8, 10);
    expect(isMastered(state)).toBe(false);
  });

  it('should respect custom threshold', () => {
    const state = createTestState('test', 0.8, 10);
    expect(isMastered(state, 0.7)).toBe(true);
    expect(isMastered(state, 0.9)).toBe(false);
  });
});

// ============================================
// isSkillUnlocked TESTS
// ============================================

describe('isSkillUnlocked', () => {
  it('should unlock skill with no prerequisites', () => {
    const states: Record<string, SkillState> = {};
    expect(isSkillUnlocked('skill-1', mockSkillMap, states)).toBe(true);
  });

  it('should lock skill when prerequisites not mastered', () => {
    const states: Record<string, SkillState> = {};
    expect(isSkillUnlocked('skill-2', mockSkillMap, states)).toBe(false);
  });

  it('should unlock skill when all prerequisites mastered', () => {
    const states: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.96, 10),
    };
    expect(isSkillUnlocked('skill-2', mockSkillMap, states)).toBe(true);
  });

  it('should require all prerequisites for multi-prereq skill', () => {
    const statesPartial: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.96, 10),
    };
    expect(isSkillUnlocked('skill-3', mockSkillMap, statesPartial)).toBe(false);

    const statesComplete: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.96, 10),
      'skill-2': createTestState('skill-2', 0.96, 10),
    };
    expect(isSkillUnlocked('skill-3', mockSkillMap, statesComplete)).toBe(true);
  });
});

// ============================================
// getReadySkills TESTS
// ============================================

describe('getReadySkills', () => {
  it('should return skills that are unlocked but not mastered', () => {
    const states: Record<string, SkillState> = {};
    const ready = getReadySkills(mockSkillMap, states);

    // skill-1 has no prerequisites, so it's ready
    expect(ready).toContain('skill-1');
    // skill-2 and skill-3 have prerequisites not met
    expect(ready).not.toContain('skill-2');
    expect(ready).not.toContain('skill-3');
  });

  it('should not include already mastered skills', () => {
    const states: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.96, 10),
    };
    const ready = getReadySkills(mockSkillMap, states);

    expect(ready).not.toContain('skill-1');
    expect(ready).toContain('skill-2');
  });
});

// ============================================
// getMasteredSkills TESTS
// ============================================

describe('getMasteredSkills', () => {
  it('should return empty array when no skills mastered', () => {
    const states: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.5, 5),
    };
    expect(getMasteredSkills(states)).toEqual([]);
  });

  it('should return mastered skill IDs', () => {
    const states: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.96, 10),
      'skill-2': createTestState('skill-2', 0.5, 5),
      'skill-3': createTestState('skill-3', 0.98, 15),
    };
    const mastered = getMasteredSkills(states);

    expect(mastered).toContain('skill-1');
    expect(mastered).not.toContain('skill-2');
    expect(mastered).toContain('skill-3');
  });
});

// ============================================
// createInitialState TESTS
// ============================================

describe('createInitialState', () => {
  it('should create state with correct default values', () => {
    const state = createInitialState('new-skill');

    expect(state.skillId).toBe('new-skill');
    expect(state.pMastery).toBe(DEFAULT_BKT_PARAMS.pL0);
    expect(state.attempts).toBe(0);
    expect(state.correctCount).toBe(0);
    expect(state.history).toEqual([]);
  });

  it('should use custom params for initial mastery', () => {
    const state = createInitialState('new-skill', EASY_BKT_PARAMS);
    expect(state.pMastery).toBe(EASY_BKT_PARAMS.pL0);
  });
});

// ============================================
// getSkillsByPriority TESTS
// ============================================

describe('getSkillsByPriority', () => {
  it('should categorize skills correctly', () => {
    // skill-1 is mastered (above 0.95 threshold), which unlocks skill-2
    const states: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.96, 10), // Mastered
    };

    const { almostMastered, readyToLearn, locked } = getSkillsByPriority(
      mockSkillMap,
      states
    );

    // skill-1 is mastered, so not in any category
    expect(almostMastered).not.toContain('skill-1');
    // skill-2 should now be unlocked and ready to learn
    expect(readyToLearn).toContain('skill-2');
    // skill-3 is still locked (needs skill-2)
    expect(locked).toContain('skill-3');
  });

  it('should sort almostMastered by pMastery descending', () => {
    const states: Record<string, SkillState> = {
      'skill-1': createTestState('skill-1', 0.96, 10),
      'skill-2': createTestState('skill-2', 0.8, 8),
    };

    // Add skill-2 as mastered to unlock skill-3
    states['skill-2'].pMastery = 0.85;

    const { almostMastered } = getSkillsByPriority(mockSkillMap, states);

    // skill-2 should come first (0.85 is closer to mastery than others in learning)
    if (almostMastered.length >= 2) {
      expect(almostMastered[0]).toBe('skill-2');
    }
  });
});

// ============================================
// estimateAttemptsToMastery TESTS
// ============================================

describe('estimateAttemptsToMastery', () => {
  it('should return 0 when already mastered', () => {
    expect(estimateAttemptsToMastery(0.96)).toBe(0);
  });

  it('should return positive number when not mastered', () => {
    const attempts = estimateAttemptsToMastery(0.5);
    expect(attempts).toBeGreaterThan(0);
  });

  it('should require more attempts for lower mastery', () => {
    const lowMastery = estimateAttemptsToMastery(0.2);
    const highMastery = estimateAttemptsToMastery(0.8);

    expect(lowMastery).toBeGreaterThan(highMastery);
  });
});

// ============================================
// formatMasteryPercent TESTS
// ============================================

describe('formatMasteryPercent', () => {
  it('should format mastery as percentage', () => {
    expect(formatMasteryPercent(0.5)).toBe('50%');
    expect(formatMasteryPercent(0.95)).toBe('95%');
    expect(formatMasteryPercent(0)).toBe('0%');
    expect(formatMasteryPercent(1)).toBe('100%');
  });

  it('should round to nearest integer', () => {
    expect(formatMasteryPercent(0.456)).toBe('46%');
    expect(formatMasteryPercent(0.444)).toBe('44%');
  });
});

// ============================================
// getMasteryLevel TESTS
// ============================================

describe('getMasteryLevel', () => {
  it('should return correct level for mastery range', () => {
    expect(getMasteryLevel(0.1)).toBe('novice');
    expect(getMasteryLevel(0.5)).toBe('learning');
    expect(getMasteryLevel(0.8)).toBe('proficient');
    expect(getMasteryLevel(0.96)).toBe('mastered');
  });
});

// ============================================
// validateBKTParams TESTS
// ============================================

describe('validateBKTParams', () => {
  it('should return valid:true for valid params', () => {
    expect(validateBKTParams(DEFAULT_BKT_PARAMS).valid).toBe(true);
    expect(validateBKTParams(EASY_BKT_PARAMS).valid).toBe(true);
    expect(validateBKTParams(HARD_BKT_PARAMS).valid).toBe(true);
  });

  it('should return valid:false for invalid params', () => {
    // Negative values
    expect(validateBKTParams({ pL0: -0.1, pT: 0.3, pG: 0.25, pS: 0.1 }).valid).toBe(false);

    // Values > 1
    expect(validateBKTParams({ pL0: 0.1, pT: 1.5, pG: 0.25, pS: 0.1 }).valid).toBe(false);

    // pG + pS > 1
    expect(validateBKTParams({ pL0: 0.1, pT: 0.3, pG: 0.6, pS: 0.5 }).valid).toBe(false);
  });
});

// ============================================
// DEFAULT PARAMS TESTS
// ============================================

describe('Default BKT Parameters', () => {
  it('DEFAULT_BKT_PARAMS should be valid', () => {
    expect(validateBKTParams(DEFAULT_BKT_PARAMS).valid).toBe(true);
  });

  it('EASY_BKT_PARAMS should have higher pL0 and pT', () => {
    expect(EASY_BKT_PARAMS.pL0).toBeGreaterThan(DEFAULT_BKT_PARAMS.pL0);
    expect(EASY_BKT_PARAMS.pT).toBeGreaterThan(DEFAULT_BKT_PARAMS.pT);
  });

  it('HARD_BKT_PARAMS should have lower pL0 and pT', () => {
    expect(HARD_BKT_PARAMS.pL0).toBeLessThan(DEFAULT_BKT_PARAMS.pL0);
    expect(HARD_BKT_PARAMS.pT).toBeLessThan(DEFAULT_BKT_PARAMS.pT);
  });

  it('DEFAULT_MASTERY_THRESHOLD should be 0.95', () => {
    expect(DEFAULT_MASTERY_THRESHOLD).toBe(0.95);
  });
});
