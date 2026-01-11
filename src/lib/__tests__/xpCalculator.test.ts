/**
 * XP Calculator Tests
 * Phase 7.1: Core business logic testing
 */

import { describe, it, expect } from 'vitest';
import { calculateAtomXPWithBonuses, getLevelFromXP, getStreakMultiplier } from '@/constants/gamification';

describe('XP Calculator', () => {
  describe('calculateAtomXPWithBonuses', () => {
    it('calculates base XP for different atom types', () => {
      const videoXP = calculateAtomXPWithBonuses('video');
      const quizXP = calculateAtomXPWithBonuses('quiz');
      const practiceXP = calculateAtomXPWithBonuses('practice');

      expect(videoXP.baseXP).toBe(10);
      expect(quizXP.baseXP).toBe(15);
      expect(practiceXP.baseXP).toBe(20);
    });

    it('applies streak multiplier correctly', () => {
      const result7Day = calculateAtomXPWithBonuses('quiz', 7);
      const result14Day = calculateAtomXPWithBonuses('quiz', 14);
      const result30Day = calculateAtomXPWithBonuses('quiz', 30);

      expect(result7Day.streakBonus).toBeGreaterThan(0);
      expect(result14Day.streakBonus).toBeGreaterThan(result7Day.streakBonus);
      expect(result30Day.streakBonus).toBeGreaterThan(result14Day.streakBonus);
      expect(result30Day.totalXP).toBe(30); // 15 base * 2.0 multiplier
    });

    it('awards perfect quiz bonus', () => {
      const perfect = calculateAtomXPWithBonuses('quiz', 0, 100);
      const notPerfect = calculateAtomXPWithBonuses('quiz', 0, 95);

      expect(perfect.perfectBonus).toBe(10);
      expect(notPerfect.perfectBonus).toBe(0);
      expect(perfect.totalXP).toBeGreaterThan(notPerfect.totalXP);
    });

    it('awards speed bonus for fast completion', () => {
      const fast = calculateAtomXPWithBonuses('quiz', 0, undefined, 30); // 30 seconds
      const slow = calculateAtomXPWithBonuses('quiz', 0, undefined, 120); // 2 minutes

      expect(fast.speedBonus).toBeGreaterThan(0);
      expect(slow.speedBonus).toBe(0);
    });

    it('provides breakdown array for UI', () => {
      const result = calculateAtomXPWithBonuses('quiz', 7, 100, 45);

      expect(result.breakdown).toBeInstanceOf(Array);
      expect(result.breakdown.length).toBeGreaterThan(1);
      expect(result.breakdown[0]).toContain('base XP');
      expect(result.breakdown.some(b => b.includes('streak'))).toBe(true);
      expect(result.breakdown.some(b => b.includes('perfect'))).toBe(true);
    });

    it('combines all bonuses correctly', () => {
      // Perfect quiz, 7-day streak, fast completion
      const result = calculateAtomXPWithBonuses('quiz', 7, 100, 45);

      expect(result.totalXP).toBe(
        result.baseXP + result.streakBonus + result.perfectBonus + result.speedBonus
      );
    });
  });

  describe('getLevelFromXP', () => {
    it('returns level 1 for 0 XP', () => {
      const result = getLevelFromXP(0);
      expect(result.level).toBe(1);
      expect(result.xpToNextLevel).toBe(100);
    });

    it('calculates correct level for various XP amounts', () => {
      expect(getLevelFromXP(100).level).toBe(2);
      expect(getLevelFromXP(250).level).toBe(3);
      expect(getLevelFromXP(500).level).toBe(4);
      expect(getLevelFromXP(1000).level).toBe(5);
    });

    it('caps at max level 20', () => {
      const result = getLevelFromXP(999999);
      expect(result.level).toBeLessThanOrEqual(20);
    });

    it('calculates progress percentage within level', () => {
      const result = getLevelFromXP(150); // Level 2: 100-250 range
      expect(result.progressPercentage).toBeGreaterThan(0);
      expect(result.progressPercentage).toBeLessThan(100);
      expect(result.progressPercentage).toBeCloseTo(33.33, 0); // 50/150 of range
    });

    it('shows XP to next level correctly', () => {
      const result = getLevelFromXP(200); // Level 3, needs 250
      expect(result.xpToNextLevel).toBe(50);
    });
  });

  describe('getStreakMultiplier', () => {
    it('returns 1.0 for streaks under 3 days', () => {
      expect(getStreakMultiplier(0)).toBe(1.0);
      expect(getStreakMultiplier(1)).toBe(1.0);
      expect(getStreakMultiplier(2)).toBe(1.0);
    });

    it('returns increasing multipliers for longer streaks', () => {
      expect(getStreakMultiplier(3)).toBe(1.1);
      expect(getStreakMultiplier(7)).toBe(1.25);
      expect(getStreakMultiplier(14)).toBe(1.5);
      expect(getStreakMultiplier(30)).toBe(2.0);
    });

    it('maintains highest multiplier past 30 days', () => {
      expect(getStreakMultiplier(60)).toBe(2.0);
      expect(getStreakMultiplier(365)).toBe(2.0);
    });
  });
});
