/**
 * XP Calculation Utilities
 * Server-side XP calculations for atom completion and leveling
 */

type AtomType = 'video' | 'reading' | 'quiz' | 'practice';

/**
 * Calculate XP earned for completing an atom
 * Applies multipliers based on streak and perfect score
 */
export function calculateAtomXP(
  atomType: AtomType,
  currentStreak: number,
  score?: number
): number {
  const baseXP = {
    video: 10,
    reading: 15,
    quiz: 25,
    practice: 30,
  }[atomType];

  let multiplier = 1;

  // Streak multiplier
  if (currentStreak >= 30) {
    multiplier *= 1.5;
  } else if (currentStreak >= 7) {
    multiplier *= 1.2;
  }

  // Perfect score bonus (quiz only)
  if (score !== undefined && score >= 95 && atomType === 'quiz') {
    multiplier *= 1.5;
  }

  return Math.floor(baseXP * multiplier);
}

/**
 * Calculate current level and XP to next level based on total XP
 * Uses exponential growth formula: xpNeeded = 100 + (level - 1) * 20
 */
export function calculateLevel(totalXP: number): {
  level: number;
  xpToNextLevel: number;
} {
  let level = 1;
  let cumulativeXP = 0;

  while (true) {
    const xpNeeded = 100 + (level - 1) * 20;
    if (cumulativeXP + xpNeeded > totalXP) {
      return {
        level,
        xpToNextLevel: cumulativeXP + xpNeeded - totalXP,
      };
    }
    cumulativeXP += xpNeeded;
    level++;
    if (level > 100) break; // Cap at level 100
  }

  return { level: 100, xpToNextLevel: 0 };
}

/**
 * Get the next level threshold (total XP needed to reach next level)
 */
export function getNextLevelThreshold(currentLevel: number): number {
  let cumulativeXP = 0;

  for (let i = 1; i < currentLevel; i++) {
    const xpNeeded = 100 + (i - 1) * 20;
    cumulativeXP += xpNeeded;
  }

  const xpForNextLevel = 100 + (currentLevel - 1) * 20;
  return cumulativeXP + xpForNextLevel;
}
