# Split-Brain Architecture

This directory contains the Web Worker implementation for offloading expensive mastery calculations to a background thread, keeping the UI responsive.

## Architecture Overview

```
FAST BRAIN (UI Thread)        SLOW BRAIN (Web Worker)
├── CardRenderer              ├── MasteryCalculator (BKT updates)
├── AnimationController       ├── SpacingScheduler (FSRS scheduling)
├── GestureDetector           ├── StruggleAnalyzer
└── OptimisticState           └── SyncController
```

## Files

- **`masteryWorker.ts`** - Web Worker that handles BKT and FSRS calculations
- **`useSplitBrain.ts`** (in `/src/hooks/`) - React hook to coordinate with the worker

## Usage

### Basic Example

```tsx
import { useSplitBrain } from '@/hooks/useSplitBrain';
import { createInitialState, DEFAULT_BKT_PARAMS } from '@/lib/mastery/bkt';

function LearningComponent() {
  const { updateMasteryAsync, isUsingWorker } = useSplitBrain();
  const [skillState, setSkillState] = useState(
    createInitialState('skill-123', DEFAULT_BKT_PARAMS)
  );

  const handleAnswer = async (correct: boolean) => {
    // Optimistically update UI
    setSkillState(prev => ({ ...prev, attempts: prev.attempts + 1 }));

    // Calculate in background worker
    const updatedState = await updateMasteryAsync(skillState, correct);

    // Update with accurate result
    setSkillState(updatedState);
  };

  return (
    <div>
      <p>Mastery: {Math.round(skillState.pMastery * 100)}%</p>
      <p>Using Worker: {isUsingWorker ? 'Yes' : 'No (fallback)'}</p>
      <button onClick={() => handleAnswer(true)}>Correct</button>
      <button onClick={() => handleAnswer(false)}>Incorrect</button>
    </div>
  );
}
```

### FSRS Scheduling Example

```tsx
import { useSplitBrain } from '@/hooks/useSplitBrain';
import { createInitialFSRSState } from '@/lib/mastery/fsrs';

function ReviewComponent() {
  const { scheduleReviewAsync } = useSplitBrain();
  const [fsrsState, setFsrsState] = useState(createInitialFSRSState());

  const handleReview = async (rating: 1 | 2 | 3 | 4) => {
    const { nextState, interval } = await scheduleReviewAsync(
      fsrsState,
      rating
    );

    setFsrsState(nextState);
    console.log(`Next review in ${interval} days`);
  };

  return (
    <div>
      <button onClick={() => handleReview(1)}>Again</button>
      <button onClick={() => handleReview(2)}>Hard</button>
      <button onClick={() => handleReview(3)}>Good</button>
      <button onClick={() => handleReview(4)}>Easy</button>
    </div>
  );
}
```

### Batch Updates Example

```tsx
import { useSplitBrain } from '@/hooks/useSplitBrain';

function BatchUpdateComponent() {
  const { batchUpdateAsync } = useSplitBrain();

  const handleBatchUpdate = async (answers: Array<{ skillId: string; correct: boolean }>) => {
    const updates = answers.map(answer => ({
      skillId: answer.skillId,
      currentState: getSkillState(answer.skillId), // Get from state
      correct: answer.correct,
    }));

    const results = await batchUpdateAsync(updates);

    // Update all states at once
    results.forEach(({ skillId, updatedState }) => {
      updateSkillState(skillId, updatedState);
    });
  };

  return <div>...</div>;
}
```

## API Reference

### `useSplitBrain(config?)`

Hook that manages the Web Worker lifecycle and provides async mastery calculation APIs.

**Parameters:**
- `config.enableWorker` (boolean, default: `true`) - Set to false to force main thread fallback
- `config.workerTimeout` (number, default: `5000`) - Timeout in ms for worker responses

**Returns:**
```typescript
{
  // Core APIs
  updateMasteryAsync: (currentState: SkillState, correct: boolean, params?: BKTParameters) => Promise<SkillState>
  scheduleReviewAsync: (currentState: FSRSState, rating: ReviewRating, params?: FSRSParameters) => Promise<{ nextState: FSRSState; interval: number }>
  batchUpdateAsync: (updates: Array<...>) => Promise<Array<...>>

  // Status flags
  isWorkerSupported: boolean  // Browser supports Web Workers
  isWorkerReady: boolean      // Worker initialized and ready
  isUsingWorker: boolean      // Currently using worker (vs main thread fallback)
}
```

## Worker Messages

The worker handles three message types:

### UPDATE_BKT
Updates skill mastery using Bayesian Knowledge Tracing.

```typescript
{
  type: 'UPDATE_BKT',
  id: string,
  payload: {
    currentState: SkillState,
    correct: boolean,
    params?: BKTParameters
  }
}
```

### SCHEDULE_REVIEW
Calculates next review interval using FSRS algorithm.

```typescript
{
  type: 'SCHEDULE_REVIEW',
  id: string,
  payload: {
    currentState: FSRSState,
    rating: 1 | 2 | 3 | 4,
    params?: FSRSParameters
  }
}
```

### BATCH_UPDATE
Updates multiple skills in one batch.

```typescript
{
  type: 'BATCH_UPDATE',
  id: string,
  payload: {
    updates: Array<{
      skillId: string,
      currentState: SkillState,
      correct: boolean,
      params?: BKTParameters
    }>
  }
}
```

## Fallback Behavior

The hook automatically falls back to main thread execution if:
- Web Workers are not supported by the browser
- Worker initialization fails
- `enableWorker: false` is passed in config

The fallback uses the same BKT/FSRS functions directly, ensuring identical behavior.

## Performance Considerations

1. **When to use Worker vs Main Thread:**
   - **Use Worker:** Complex calculations, batch updates, background processing
   - **Use Main Thread:** Simple single updates when UI is idle

2. **Optimistic Updates:**
   - Always update UI optimistically first
   - Then calculate in worker and update with accurate result
   - Prevents UI blocking while waiting for calculations

3. **Batching:**
   - Batch multiple updates when possible (e.g., end of quiz session)
   - Reduces message passing overhead

## Testing

To test with worker disabled (main thread fallback):

```tsx
const { updateMasteryAsync } = useSplitBrain({ enableWorker: false });
```

## Browser Compatibility

Web Workers are supported in all modern browsers:
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (all versions)

For older browsers, the hook automatically falls back to main thread execution.
