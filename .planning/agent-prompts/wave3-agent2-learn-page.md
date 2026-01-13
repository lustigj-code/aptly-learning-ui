# Agent 3-2: Intelligent Learn Page

## Mission
Make every learning interaction informed by ML with real-time feedback.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
```
src/app/learn/page.tsx
src/components/learning/CoachLearningView.tsx
src/lib/ml/hybridModel.ts
src/lib/adaptive/sessionBuilder.ts
```

## Changes to Make

### 1. Add "Why this content" explanations
In atom display, show reasoning:

```typescript
// In CoachLearningView or atom containers
<div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
  <span className="font-medium">Why this: </span>
  <span className="text-gray-600">{currentAtom.reasoning}</span>
</div>
```

### 2. Add real-time mastery bar
Shows mastery updating during learning:

```typescript
function RealTimeMasteryBar({ skillId, userId }) {
  const { mastery, previousMastery } = useLiveMastery(skillId, userId);
  const change = mastery - previousMastery;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: `${previousMastery * 100}%` }}
          animate={{ width: `${mastery * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-sm font-medium">{Math.round(mastery * 100)}%</span>
      {change > 0 && (
        <span className="text-green-500 text-xs">+{Math.round(change * 100)}%</span>
      )}
    </div>
  );
}
```

### 3. Smart content skipping
Allow skipping mastered material:

```typescript
function ContentSkipOption({ atom, mastery }) {
  if (mastery < 0.85) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
      <div>
        <span className="font-medium text-green-800">Already know this?</span>
        <p className="text-sm text-green-600">
          You've mastered this ({Math.round(mastery * 100)}%)
        </p>
      </div>
      <button
        onClick={handleSkip}
        className="px-4 py-2 bg-green-600 text-white rounded-lg"
      >
        Skip to quiz
      </button>
    </div>
  );
}
```

### 4. Adaptive pacing indicator
Show if user is going too fast/slow:

```typescript
function PacingIndicator({ responseTime, avgTime }) {
  const ratio = responseTime / avgTime;

  if (ratio < 0.5) {
    return (
      <div className="text-yellow-600 text-sm">
        💨 Taking your time helps retention
      </div>
    );
  }
  if (ratio > 2) {
    return (
      <div className="text-blue-600 text-sm">
        ⏰ No rush - understanding is key
      </div>
    );
  }
  return null;
}
```

### 5. Wire to learning view
Update `src/components/learning/CoachLearningView.tsx`:

```typescript
export function CoachLearningView({ ... }) {
  return (
    <div>
      {/* Header with real-time mastery */}
      <header className="mb-6">
        <h1>{currentAtom.title}</h1>
        <RealTimeMasteryBar skillId={currentSkillId} userId={userId} />
      </header>

      {/* Why this content */}
      {currentAtom.reasoning && (
        <WhyThisContent reasoning={currentAtom.reasoning} />
      )}

      {/* Skip option for mastered content */}
      <ContentSkipOption atom={currentAtom} mastery={currentMastery} />

      {/* Main content */}
      <AtomContent atom={currentAtom} />

      {/* Pacing feedback after answers */}
      {lastResponseTime && (
        <PacingIndicator responseTime={lastResponseTime} avgTime={avgResponseTime} />
      )}
    </div>
  );
}
```

## Verification Steps
1. `npm run build` - Must pass
2. "Why this" shows for each content piece
3. Mastery bar updates in real-time
4. Skip option appears for mastered content
5. Pacing feedback shows appropriately
