# Agent 2-4: Adaptive Difficulty System

## Mission
Implement dynamic content difficulty selection based on mastery predictions.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/ml/hybridModel.ts                    # ML predictions
src/lib/mastery/questionDifficulty.ts        # Rasch IRT (if exists)
src/components/learning/quiz/QuizAtom.tsx    # Quiz component
src/lib/adaptive/sessionBuilder.ts           # Session building
```

## Current State
- Questions have static difficulty
- All users get same difficulty questions
- No zone of proximal development targeting

## Changes to Make

### 1. Create `src/lib/adaptive/difficulty/difficultySelector.ts`
Purpose: Select optimal difficulty based on mastery

```typescript
import { predictWithHybrid } from '@/lib/ml/hybridModel';

export interface DifficultyConfig {
  minDifficulty: number;    // 0.0
  maxDifficulty: number;    // 1.0
  targetSuccessRate: number; // 0.75 - ZPD sweet spot
  difficultyBandwidth: number; // How wide the acceptable range is
}

export interface ItemDifficulty {
  itemId: string;
  difficulty: number; // 0.0 (easy) to 1.0 (hard)
  skillId: string;
}

export interface DifficultySelection {
  selectedItems: ItemDifficulty[];
  optimalDifficulty: number;
  reasoning: string;
}

const DEFAULT_CONFIG: DifficultyConfig = {
  minDifficulty: 0.1,
  maxDifficulty: 0.95,
  targetSuccessRate: 0.75,
  difficultyBandwidth: 0.2,
};

// Calculate optimal difficulty for user on skill
export async function getOptimalDifficulty(
  userId: string,
  skillId: string,
  config: DifficultyConfig = DEFAULT_CONFIG
): Promise<number> {
  const prediction = await predictWithHybrid(userId, skillId);
  const pMastery = prediction.pMastery;

  // Zone of Proximal Development:
  // - Too easy (< 90% success): boring, no learning
  // - Too hard (< 50% success): frustrating, gives up
  // - Sweet spot (70-80% success): challenging but achievable

  // Map mastery to optimal difficulty
  // Low mastery → easier content
  // High mastery → harder content
  const optimalDifficulty = calculateOptimalDifficulty(pMastery, config);

  return Math.max(config.minDifficulty, Math.min(config.maxDifficulty, optimalDifficulty));
}

function calculateOptimalDifficulty(
  pMastery: number,
  config: DifficultyConfig
): number {
  // At 0% mastery: want ~0.3 difficulty (easy)
  // At 50% mastery: want ~0.5 difficulty (medium)
  // At 90% mastery: want ~0.8 difficulty (hard)

  // Linear mapping with target success rate adjustment
  const baseDifficulty = pMastery * 0.8 + 0.1;

  // Adjust based on target success rate
  // Higher target success → easier items (lower difficulty)
  const successAdjustment = (1 - config.targetSuccessRate) * 0.2;

  return baseDifficulty - successAdjustment;
}

// Select items from pool based on optimal difficulty
export async function selectItemsByDifficulty(
  userId: string,
  skillId: string,
  availableItems: ItemDifficulty[],
  count: number,
  config: DifficultyConfig = DEFAULT_CONFIG
): Promise<DifficultySelection> {
  const optimalDifficulty = await getOptimalDifficulty(userId, skillId, config);

  // Score items by proximity to optimal difficulty
  const scoredItems = availableItems.map(item => ({
    ...item,
    score: 1 - Math.abs(item.difficulty - optimalDifficulty),
  }));

  // Sort by score (closest to optimal first)
  scoredItems.sort((a, b) => b.score - a.score);

  // Add some randomization to prevent predictability
  const topItems = scoredItems.slice(0, Math.min(count * 2, scoredItems.length));
  shuffleArray(topItems);

  const selectedItems = topItems.slice(0, count);

  return {
    selectedItems,
    optimalDifficulty,
    reasoning: getDifficultyReasoning(optimalDifficulty, selectedItems),
  };
}

function getDifficultyReasoning(optimal: number, items: ItemDifficulty[]): string {
  const avgDifficulty = items.reduce((sum, i) => sum + i.difficulty, 0) / items.length;
  const difficultyLevel = optimal < 0.4 ? 'easier' : optimal > 0.7 ? 'challenging' : 'moderate';

  return `Selected ${items.length} ${difficultyLevel} questions (avg difficulty: ${(avgDifficulty * 100).toFixed(0)}%) to optimize your learning.`;
}

// Adjust difficulty based on recent performance
export function adjustDifficultyFromPerformance(
  currentDifficulty: number,
  recentAccuracy: number,
  recentResponseTime: number,
  averageResponseTime: number
): number {
  let adjustment = 0;

  // Accuracy-based adjustment
  if (recentAccuracy > 0.9) {
    adjustment += 0.1; // Too easy, increase
  } else if (recentAccuracy < 0.5) {
    adjustment -= 0.1; // Too hard, decrease
  }

  // Time-based adjustment
  if (recentResponseTime < averageResponseTime * 0.5) {
    adjustment += 0.05; // Answering too quickly, might be too easy
  } else if (recentResponseTime > averageResponseTime * 2) {
    adjustment -= 0.05; // Taking too long, might be too hard
  }

  return Math.max(0.1, Math.min(0.95, currentDifficulty + adjustment));
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Get difficulty level label for UI
export function getDifficultyLabel(difficulty: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (difficulty < 0.3) {
    return { label: 'Easy', color: 'green', icon: '🌱' };
  }
  if (difficulty < 0.5) {
    return { label: 'Moderate', color: 'blue', icon: '📘' };
  }
  if (difficulty < 0.7) {
    return { label: 'Challenging', color: 'yellow', icon: '⚡' };
  }
  if (difficulty < 0.85) {
    return { label: 'Hard', color: 'orange', icon: '🔥' };
  }
  return { label: 'Expert', color: 'red', icon: '💎' };
}
```

### 2. Create difficulty indicator component
Create `src/components/learning/DifficultyIndicator.tsx`:

```typescript
import { getDifficultyLabel } from '@/lib/adaptive/difficulty/difficultySelector';

interface Props {
  difficulty: number;
  showLabel?: boolean;
}

export function DifficultyIndicator({ difficulty, showLabel = true }: Props) {
  const { label, color, icon } = getDifficultyLabel(difficulty);

  const colorClasses = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      <span>{icon}</span>
      {showLabel && <span>{label}</span>}
    </div>
  );
}
```

### 3. Modify QuizAtom to show difficulty
Update `src/components/learning/quiz/QuizAtom.tsx`:

```typescript
import { DifficultyIndicator } from '../DifficultyIndicator';

interface QuizAtomProps {
  // ... existing props
  difficulty?: number;
}

export function QuizAtom({ atom, difficulty, onComplete, ... }: QuizAtomProps) {
  return (
    <div className="quiz-container">
      {/* Header with difficulty indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">Question {questionNumber}</span>
        {difficulty !== undefined && (
          <DifficultyIndicator difficulty={difficulty} />
        )}
      </div>

      {/* Question content */}
      <div className="question-content">
        {atom.question}
      </div>

      {/* Options */}
      ...
    </div>
  );
}
```

### 4. Wire difficulty selection to session builder
Modify `src/lib/adaptive/sessionBuilder.ts`:

```typescript
import { selectItemsByDifficulty, getOptimalDifficulty } from './difficulty/difficultySelector';

export async function buildSession(
  userId: string,
  options: SessionOptions
): Promise<Session> {
  // ... existing logic

  // For each skill in session, select appropriately difficult items
  const sessionItems = await Promise.all(
    skillsToLearn.map(async (skill) => {
      const availableAtoms = await getAtomsForSkill(skill.id);

      // Get atoms with difficulty ratings
      const atomsWithDifficulty = availableAtoms.map(atom => ({
        itemId: atom.id,
        difficulty: atom.difficulty || 0.5, // Default to medium if not rated
        skillId: skill.id,
      }));

      // Select optimal difficulty items
      const selection = await selectItemsByDifficulty(
        userId,
        skill.id,
        atomsWithDifficulty,
        options.itemsPerSkill || 3
      );

      return {
        skill,
        items: selection.selectedItems,
        optimalDifficulty: selection.optimalDifficulty,
        reasoning: selection.reasoning,
      };
    })
  );

  return {
    ...session,
    items: sessionItems.flatMap(s => s.items.map(item => ({
      ...getAtom(item.itemId),
      difficulty: item.difficulty,
      skillId: s.skill.id,
      reasoning: s.reasoning,
    }))),
  };
}
```

### 5. Add difficulty to analytics
Log difficulty for analysis:

```typescript
// In quiz completion handler:
await logInteraction({
  type: 'quiz_complete',
  atomId,
  skillId,
  difficulty,
  isCorrect,
  responseTimeMs,
  optimalDifficulty, // What the model predicted as optimal
  // This data helps train better difficulty selection
});
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: New user gets easier questions
4. Manual test: High mastery user gets harder questions
5. Verify: Difficulty indicator shows on quiz
6. Verify: Session items are difficulty-appropriate
7. Check: Analytics logs difficulty data

## Do NOT Modify
- `src/lib/ml/hybridModel.ts` (use as-is)
- Question content/database
- FSRS/BKT algorithms

## Output
When complete:
- Questions selected based on user mastery
- Difficulty indicators visible in UI
- Zone of proximal development targeting
- Analytics track difficulty effectiveness
