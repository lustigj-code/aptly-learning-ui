# Agent 3-3: Enhanced Review Experience

## Mission
Create ML-enhanced review sessions with timing feedback and insights.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
```
src/app/review/page.tsx
src/components/mastery/ReviewQueue.tsx
src/lib/mastery/fsrs.ts
src/lib/mastery/smartReview.ts (from Wave 2)
```

## Changes to Make

### 1. Add timing feedback
Show if review timing is optimal:

```typescript
function TimingFeedback({ scheduledTime, actualTime }) {
  const hoursDiff = (actualTime - scheduledTime) / (1000 * 60 * 60);

  if (Math.abs(hoursDiff) < 2) {
    return (
      <div className="text-green-600 text-sm flex items-center gap-1">
        <CheckCircle className="w-4 h-4" />
        Perfect timing! Optimal for retention.
      </div>
    );
  }
  if (hoursDiff < 0) {
    return (
      <div className="text-blue-600 text-sm">
        A bit early, but good to practice!
      </div>
    );
  }
  return (
    <div className="text-yellow-600 text-sm">
      {Math.round(hoursDiff)} hours overdue - let's strengthen this memory
    </div>
  );
}
```

### 2. Add mastery trajectory chart
Mini sparkline showing progress:

```typescript
function MasteryTrajectory({ history }) {
  return (
    <div className="h-12 flex items-end gap-0.5">
      {history.map((point, i) => (
        <div
          key={i}
          className="flex-1 bg-blue-500 rounded-t"
          style={{ height: `${point.mastery * 100}%` }}
        />
      ))}
    </div>
  );
}
```

### 3. Session insights after completion
Show summary when review session ends:

```typescript
function ReviewSessionInsights({ results }) {
  const accuracy = results.correct / results.total;
  const avgTime = results.totalTime / results.total;

  return (
    <div className="bg-white rounded-xl p-6 shadow">
      <h3 className="text-xl font-bold mb-4">Session Complete! 🎉</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Accuracy"
          value={`${Math.round(accuracy * 100)}%`}
          trend={accuracy > 0.8 ? 'up' : 'down'}
        />
        <StatCard
          label="Avg Time"
          value={`${Math.round(avgTime / 1000)}s`}
        />
        <StatCard
          label="Items Reviewed"
          value={results.total}
        />
      </div>

      {/* Next review forecast */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800">Next Reviews</h4>
        <p className="text-sm text-blue-600">
          {results.nextDue} items due in the next 24 hours
        </p>
      </div>

      {/* AI observation */}
      {results.insight && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2">
            <BrainIcon className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-purple-800">AI Observation</span>
          </div>
          <p className="text-sm text-purple-700 mt-1">{results.insight}</p>
        </div>
      )}
    </div>
  );
}
```

### 4. Adaptive session length
Adjust based on performance:

```typescript
function AdaptiveSessionController({ initialCount, onCountChange }) {
  const [sessionCount, setSessionCount] = useState(initialCount);
  const [currentAccuracy, setCurrentAccuracy] = useState(1);

  useEffect(() => {
    // If struggling, suggest shorter session
    if (currentAccuracy < 0.5 && sessionCount > 5) {
      // Prompt to reduce
      showSuggestion("Struggling a bit? Want to wrap up after 5 more?");
    }
    // If doing great, offer to continue
    if (currentAccuracy > 0.9 && nearEnd) {
      showSuggestion("Great momentum! Want to review 5 more?");
    }
  }, [currentAccuracy]);

  return (/* session UI */);
}
```

### 5. Update review page
Modify `src/app/review/page.tsx`:

```typescript
export default function ReviewPage() {
  return (
    <div className="container mx-auto p-6">
      {/* Review forecast widget */}
      <ReviewForecast forecast={reviewData.forecast} />

      {/* Current review with timing feedback */}
      {currentReview && (
        <div>
          <TimingFeedback
            scheduledTime={currentReview.scheduledFor}
            actualTime={Date.now()}
          />

          <ReviewCard
            item={currentReview}
            onAnswer={handleAnswer}
          />

          {/* Mini trajectory */}
          <MasteryTrajectory history={currentReview.masteryHistory} />
        </div>
      )}

      {/* Session complete */}
      {sessionComplete && (
        <ReviewSessionInsights results={sessionResults} />
      )}
    </div>
  );
}
```

## Verification Steps
1. `npm run build` - Must pass
2. Timing feedback shows (perfect/early/late)
3. Mastery trajectory displays
4. Session insights show after completion
5. Adaptive suggestions work
