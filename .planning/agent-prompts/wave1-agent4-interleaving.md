# Agent 1-4: Interleaving Activation

## Mission
Replace `buildSession()` with `buildSessionWithInterleaving()` so reviews are mixed into learning sessions.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/adaptive/interleavingAlgorithm.ts   # Interleaving logic (exists!)
src/lib/adaptive/sessionBuilder.ts          # Session building
src/app/api/adaptive/session/route.ts       # Session API endpoint
src/types/session.ts                        # Session types (if exists)
src/components/learning/AdaptiveSessionView.tsx  # Session UI
```

## Current State
- `interleavingAlgorithm.ts` exists with `buildSessionWithInterleaving()`
- The session API calls `buildSession()` NOT `buildSessionWithInterleaving()`
- Reviews never appear in learning sessions

## Changes to Make

### 1. Modify `src/app/api/adaptive/session/route.ts`
Switch to interleaved session building:

```typescript
// Find the buildSession() call and replace with:
import { buildSessionWithInterleaving } from '@/lib/adaptive/interleavingAlgorithm';

// In the POST handler:
// BEFORE:
// const session = await buildSession(userId, { availableTimeMinutes, ... });

// AFTER:
const session = await buildSessionWithInterleaving(userId, {
  availableTimeMinutes,
  interleavingRatio: userPreferences?.interleavingRatio ?? 0.3, // 30% default
  minRetrievabilityThreshold: 0.9, // Reviews when below 90%
  // ... other existing params
});
```

### 2. Add interleaving preference to user settings
Modify `src/types/user.ts` (or wherever UserPreferences lives):

```typescript
interface UserPreferences {
  // ... existing fields
  interleavingEnabled: boolean;      // Default: true
  interleavingIntensity: 'light' | 'moderate' | 'heavy'; // Default: moderate
  // light = 20%, moderate = 30%, heavy = 50%
}
```

### 3. Create/Modify `src/components/learning/ReviewChallengeBadge.tsx`
Ensure visual indicator for review items (may already exist):

```typescript
interface Props {
  isReviewChallenge: boolean;
  skill?: string;
}

export function ReviewChallengeBadge({ isReviewChallenge, skill }: Props) {
  if (!isReviewChallenge) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
      <RefreshIcon className="w-3 h-3" />
      <span>Review: {skill || 'Previous concept'}</span>
    </div>
  );
}
```

### 4. Modify session item display
In `src/components/learning/AdaptiveSessionView.tsx` or session queue component:

```typescript
// Import the badge
import { ReviewChallengeBadge } from './ReviewChallengeBadge';

// In the session item rendering:
{session.items.map((item, index) => (
  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
    <span className="text-gray-400">{index + 1}</span>
    <div className="flex-1">
      <span>{item.title}</span>
      <ReviewChallengeBadge
        isReviewChallenge={item.isReviewChallenge}
        skill={item.skillName}
      />
    </div>
    {item.isReviewChallenge && (
      <span className="text-purple-600 text-sm">
        Review break
      </span>
    )}
  </div>
))}
```

### 5. Add settings UI for interleaving
Modify `src/app/settings/page.tsx` or create new section:

```typescript
// In settings page, add section:
<section className="space-y-4">
  <h3 className="text-lg font-semibold">Review Interleaving</h3>
  <p className="text-gray-600 text-sm">
    Mix review challenges into your learning sessions to boost retention.
  </p>

  <div className="space-y-2">
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={preferences.interleavingEnabled}
        onChange={(e) => updatePreference('interleavingEnabled', e.target.checked)}
      />
      <span>Enable interleaved reviews</span>
    </label>

    {preferences.interleavingEnabled && (
      <select
        value={preferences.interleavingIntensity}
        onChange={(e) => updatePreference('interleavingIntensity', e.target.value)}
        className="border rounded px-3 py-2"
      >
        <option value="light">Light (20% reviews)</option>
        <option value="moderate">Moderate (30% reviews)</option>
        <option value="heavy">Heavy (50% reviews)</option>
      </select>
    )}
  </div>
</section>
```

### 6. Track interleaving effectiveness
Modify analytics logging in session completion:

```typescript
// When session completes, log interleaving stats:
await logEvent('session_complete', {
  totalItems: session.items.length,
  reviewItems: session.items.filter(i => i.isReviewChallenge).length,
  interleavingRatio: reviewItems / totalItems,
  reviewAccuracy: calculateReviewAccuracy(results),
});
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Start a learning session
4. Verify: Review items appear with purple badge
5. Verify: Reviews are from skills with low retrievability
6. Verify: Settings page shows interleaving options
7. Verify: Changing intensity affects review ratio

## Do NOT Modify
- `src/lib/adaptive/interleavingAlgorithm.ts` (it's already correct)
- `src/lib/mastery/fsrs.ts` (just uses it)
- Review page (separate flow)

## Key Constants
From existing code:
- Default interleaving ratio: 30%
- Retrievability threshold: 90% (review when below)
- Adaptive ratio: 3:1 normal, 1:1 for large backlog

## Output
When complete:
- Learning sessions include review challenges
- Reviews marked with visual badge
- User can configure interleaving intensity
- Analytics track interleaving effectiveness
