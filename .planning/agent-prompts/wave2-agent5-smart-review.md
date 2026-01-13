# Agent 2-5: Smart Review Scheduling

## Mission
Enhance FSRS review scheduling with ML predictions for optimal learning.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/mastery/fsrs.ts              # FSRS algorithm
src/lib/adaptive/reviewDueQuery.ts   # Review query logic
src/app/api/review/due/route.ts      # Review API
src/lib/ml/hybridModel.ts            # ML predictions
```

## Current State
- FSRS handles review scheduling
- No ML enhancement
- No optimal time prediction
- No batch optimization

## Changes to Make

### 1. Create `src/lib/mastery/smartReview.ts`
Purpose: Enhance FSRS with ML predictions

```typescript
import { calculateRetrievability, FSRSState } from './fsrs';
import { predictWithHybrid } from '../ml/hybridModel';

export interface SmartReviewItem {
  skillId: string;
  fsrsState: FSRSState;
  retrievability: number;
  pMastery: number;
  priority: number;
  optimalReviewTime: Date;
  reasoning: string;
}

export interface ReviewBatch {
  items: SmartReviewItem[];
  estimatedDurationMinutes: number;
  expectedRetentionGain: number;
  batchReasoning: string;
}

// Calculate priority score combining FSRS and ML
export async function calculateReviewPriority(
  userId: string,
  skillId: string,
  fsrsState: FSRSState
): Promise<SmartReviewItem> {
  const retrievability = calculateRetrievability(fsrsState);
  const prediction = await predictWithHybrid(userId, skillId);

  // Priority formula:
  // - Lower retrievability = higher priority (FSRS urgency)
  // - Lower mastery = higher priority (needs more work)
  // - Weight retrievability more (time-sensitive)
  const priority =
    (1 - retrievability) * 0.6 +
    (1 - prediction.pMastery) * 0.4;

  const optimalReviewTime = calculateOptimalReviewTime(fsrsState, prediction.pMastery);

  return {
    skillId,
    fsrsState,
    retrievability,
    pMastery: prediction.pMastery,
    priority,
    optimalReviewTime,
    reasoning: getReviewReasoning(retrievability, prediction.pMastery, priority),
  };
}

function calculateOptimalReviewTime(fsrsState: FSRSState, pMastery: number): Date {
  // FSRS already calculates next review date
  // Adjust based on mastery:
  // - Low mastery: review sooner (needs more practice)
  // - High mastery: can wait longer

  const fsrsNextReview = new Date(fsrsState.nextReviewDate);
  const now = new Date();

  // Calculate mastery-adjusted delay
  const masteryMultiplier = 0.5 + (pMastery * 0.5); // 0.5 to 1.0
  const originalDelay = fsrsNextReview.getTime() - now.getTime();
  const adjustedDelay = originalDelay * masteryMultiplier;

  return new Date(now.getTime() + adjustedDelay);
}

function getReviewReasoning(
  retrievability: number,
  pMastery: number,
  priority: number
): string {
  if (retrievability < 0.7) {
    return 'Memory fading - review soon to prevent forgetting';
  }
  if (pMastery < 0.5) {
    return 'Still building mastery - more practice recommended';
  }
  if (priority > 0.6) {
    return 'High priority - optimal time for reinforcement';
  }
  return 'Standard review to maintain knowledge';
}

// Create intelligent review batches
export async function createReviewBatch(
  userId: string,
  maxMinutes: number,
  items: SmartReviewItem[]
): Promise<ReviewBatch> {
  // Sort by priority
  const sorted = [...items].sort((a, b) => b.priority - a.priority);

  // Estimate time per item (2-3 minutes average)
  const minutesPerItem = 2.5;
  const maxItems = Math.floor(maxMinutes / minutesPerItem);

  // Group related concepts (same lesson/module) together
  const batchedItems = groupRelatedConcepts(sorted.slice(0, maxItems));

  // Calculate expected retention gain
  const expectedGain = batchedItems.reduce((sum, item) => {
    // Each review should boost retrievability by ~20-30%
    const currentRetention = item.retrievability;
    const expectedPostReview = Math.min(0.95, currentRetention + 0.25);
    return sum + (expectedPostReview - currentRetention);
  }, 0);

  return {
    items: batchedItems,
    estimatedDurationMinutes: batchedItems.length * minutesPerItem,
    expectedRetentionGain: expectedGain / batchedItems.length, // Average per item
    batchReasoning: getBatchReasoning(batchedItems),
  };
}

function groupRelatedConcepts(items: SmartReviewItem[]): SmartReviewItem[] {
  // Group items from same lesson together for better context
  const byLesson = new Map<string, SmartReviewItem[]>();

  items.forEach(item => {
    const lessonId = getLessonForSkill(item.skillId);
    const group = byLesson.get(lessonId) || [];
    group.push(item);
    byLesson.set(lessonId, group);
  });

  // Interleave groups for spacing effect while keeping some grouping
  const result: SmartReviewItem[] = [];
  const groups = Array.from(byLesson.values());

  while (groups.some(g => g.length > 0)) {
    for (const group of groups) {
      if (group.length > 0) {
        result.push(group.shift()!);
      }
    }
  }

  return result;
}

function getBatchReasoning(items: SmartReviewItem[]): string {
  const highPriority = items.filter(i => i.priority > 0.6).length;
  const lowRetrieval = items.filter(i => i.retrievability < 0.7).length;

  if (lowRetrieval > items.length / 2) {
    return 'Focus on preventing forgetting - several items have low retention';
  }
  if (highPriority > items.length / 2) {
    return 'High-impact review session - targeting skills that need reinforcement';
  }
  return 'Balanced review session to maintain and strengthen knowledge';
}

// Predict user's optimal review time of day
export async function findOptimalReviewTime(
  userId: string
): Promise<{ hour: number; confidence: number }> {
  const history = await getReviewHistory(userId);

  if (history.length < 10) {
    // Not enough data, use default
    return { hour: 9, confidence: 0.3 }; // Morning default
  }

  // Analyze when user performs best (highest accuracy)
  const performanceByHour: Record<number, { correct: number; total: number }> = {};

  history.forEach(review => {
    const hour = new Date(review.timestamp).getHours();
    if (!performanceByHour[hour]) {
      performanceByHour[hour] = { correct: 0, total: 0 };
    }
    performanceByHour[hour].total++;
    if (review.isCorrect) {
      performanceByHour[hour].correct++;
    }
  });

  // Find hour with best accuracy (min 5 samples)
  let bestHour = 9;
  let bestAccuracy = 0;
  let totalSamples = 0;

  Object.entries(performanceByHour).forEach(([hour, stats]) => {
    if (stats.total >= 5) {
      const accuracy = stats.correct / stats.total;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestHour = parseInt(hour);
        totalSamples = stats.total;
      }
    }
  });

  const confidence = Math.min(0.9, totalSamples / 50); // More samples = more confidence

  return { hour: bestHour, confidence };
}

// Create review forecast
export async function getReviewForecast(
  userId: string,
  daysAhead: number = 7
): Promise<ReviewForecast[]> {
  const allSkills = await getUserSkills(userId);
  const forecasts: ReviewForecast[] = [];

  for (let day = 0; day < daysAhead; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);

    const dueOnDay = allSkills.filter(skill => {
      const fsrsState = skill.fsrsState;
      if (!fsrsState) return false;

      const nextReview = new Date(fsrsState.nextReviewDate);
      return nextReview.toDateString() === date.toDateString();
    });

    forecasts.push({
      date,
      dueCount: dueOnDay.length,
      estimatedMinutes: dueOnDay.length * 2.5,
      skills: dueOnDay.map(s => s.skillId),
    });
  }

  return forecasts;
}

interface ReviewForecast {
  date: Date;
  dueCount: number;
  estimatedMinutes: number;
  skills: string[];
}
```

### 2. Update review API
Modify `src/app/api/review/due/route.ts`:

```typescript
import {
  calculateReviewPriority,
  createReviewBatch,
  getReviewForecast,
  findOptimalReviewTime,
} from '@/lib/mastery/smartReview';

export async function GET(request: Request) {
  const { userId, maxMinutes } = getParams(request);

  // Get FSRS due items
  const fsrsDue = await getFSRSDueItems(userId);

  // Enhance with ML predictions
  const smartItems = await Promise.all(
    fsrsDue.map(item =>
      calculateReviewPriority(userId, item.skillId, item.fsrsState)
    )
  );

  // Create optimized batch
  const batch = await createReviewBatch(
    userId,
    maxMinutes || 15,
    smartItems
  );

  // Get forecast
  const forecast = await getReviewForecast(userId, 7);

  // Get optimal time
  const optimalTime = await findOptimalReviewTime(userId);

  return NextResponse.json({
    batch,
    totalDue: smartItems.length,
    forecast,
    optimalTime,
    insights: {
      averageRetrieval: smartItems.reduce((sum, i) => sum + i.retrievability, 0) / smartItems.length,
      highPriorityCount: smartItems.filter(i => i.priority > 0.6).length,
    },
  });
}
```

### 3. Create review forecast component
Create `src/components/mastery/ReviewForecast.tsx`:

```typescript
interface Props {
  forecast: ReviewForecast[];
}

export function ReviewForecast({ forecast }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-semibold mb-4">Review Forecast</h3>

      <div className="flex gap-2">
        {forecast.map((day, i) => (
          <div
            key={i}
            className={`flex-1 text-center p-2 rounded ${
              day.dueCount > 5 ? 'bg-red-100' :
              day.dueCount > 2 ? 'bg-yellow-100' :
              'bg-green-100'
            }`}
          >
            <div className="text-xs text-gray-600">
              {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDay(day.date)}
            </div>
            <div className="text-lg font-bold">{day.dueCount}</div>
            <div className="text-xs text-gray-500">
              ~{day.estimatedMinutes.toFixed(0)}m
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 mt-4">
        {getTotalMessage(forecast)}
      </p>
    </div>
  );
}

function getTotalMessage(forecast: ReviewForecast[]): string {
  const totalDue = forecast.reduce((sum, d) => sum + d.dueCount, 0);
  const totalMinutes = forecast.reduce((sum, d) => sum + d.estimatedMinutes, 0);

  return `${totalDue} reviews over the next week (~${Math.round(totalMinutes)} minutes total)`;
}
```

### 4. Add insights to review page
Modify `src/app/review/page.tsx`:

```typescript
// Add after fetching review data:
{reviewData.insights && (
  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
    <div className="flex items-center gap-2 text-blue-700">
      <BrainIcon className="w-5 h-5" />
      <span className="font-medium">AI Insights</span>
    </div>
    <p className="text-sm text-blue-600 mt-2">
      {reviewData.batch.batchReasoning}
    </p>
    <div className="flex gap-4 mt-2 text-sm">
      <span>Avg retention: {(reviewData.insights.averageRetrieval * 100).toFixed(0)}%</span>
      <span>High priority: {reviewData.insights.highPriorityCount}</span>
    </div>
  </div>
)}

{reviewData.optimalTime && (
  <p className="text-sm text-gray-600">
    Your best review time: ~{reviewData.optimalTime.hour}:00
    {reviewData.optimalTime.confidence > 0.6 && " (based on your performance history)"}
  </p>
)}

{/* Review forecast */}
<ReviewForecast forecast={reviewData.forecast} />
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Check review API returns ML-enhanced priorities
4. Manual test: Review forecast shows 7-day outlook
5. Manual test: Optimal time calculated from history
6. Verify: Review batches group related concepts
7. Verify: High priority items surface first

## Do NOT Modify
- `src/lib/mastery/fsrs.ts` (core algorithm is correct)
- BKT/hybrid model internals
- Quiz components

## Output
When complete:
- Reviews prioritized by ML + FSRS
- Optimal review time predicted
- Review forecast for planning
- Intelligent batching of related concepts
