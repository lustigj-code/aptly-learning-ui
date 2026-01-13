# Agent 1-2: Notification Wiring

## Mission
Wire existing push notification infrastructure to learning events so notifications actually fire.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/notifications/fcm.ts              # FCM client setup
src/lib/notifications/notificationService.ts  # Sending logic
src/lib/notifications/types.ts            # Notification types
src/lib/analytics/eventTracker.ts         # Event tracking (if exists)
src/hooks/useStreak.ts                    # Streak tracking
src/app/api/review/due/route.ts           # Review due API
```

## Current State
- FCM is configured and working
- `notificationService.ts` has sending functions but they're never called
- No triggers are wired to learning events

## Changes to Make

### 1. Create `src/lib/notifications/triggers.ts`
Purpose: Functions that check conditions and trigger notifications

```typescript
import { sendNotification } from './notificationService';
import { NotificationType } from './types';

// Trigger when streak is at risk (2h before daily reset)
export async function checkStreakAtRisk(userId: string): Promise<void> {
  // 1. Get user's streak data
  // 2. Get user's timezone
  // 3. Calculate time until daily reset
  // 4. If < 2 hours and no activity today, send notification
}

// Trigger when review backlog grows
export async function checkReviewBacklog(userId: string): Promise<void> {
  // 1. Count due reviews from FSRS
  // 2. If >= 5 due, send notification
  // 3. Track last notification time to avoid spam
}

// Trigger when mastery is decaying
export async function checkMasteryDecay(userId: string, skillId: string): Promise<void> {
  // 1. Get retrievability from FSRS
  // 2. If dropped below 80% and was above 90%, notify
}

// Trigger for optimal learning time (user's peak hours)
export async function checkOptimalLearningTime(userId: string): Promise<void> {
  // 1. Analyze user's historical learning times
  // 2. If current time matches peak and no recent session, nudge
}
```

### 2. Modify `src/app/api/review/due/route.ts`
Add notification trigger when reviews are due:

```typescript
// At the end of GET handler, after returning due items:
import { checkReviewBacklog } from '@/lib/notifications/triggers';

// Add after fetching due items:
if (dueItems.length >= 5) {
  // Fire and forget - don't await
  checkReviewBacklog(userId).catch(console.error);
}
```

### 3. Modify `src/hooks/useStreak.ts`
Add streak-at-risk notification:

```typescript
// When checking streak status:
import { checkStreakAtRisk } from '@/lib/notifications/triggers';

// In the hook, when streak is loaded but no activity today:
useEffect(() => {
  if (streak && !todayComplete) {
    checkStreakAtRisk(userId);
  }
}, [streak, todayComplete]);
```

### 4. Create `src/lib/notifications/scheduler.ts`
Purpose: Scheduled notification checks (for cron/serverless)

```typescript
// Called by scheduled function (Firebase Functions or Vercel Cron)
export async function runScheduledNotificationChecks(): Promise<void> {
  // 1. Get all users with notification preferences enabled
  // 2. For each user, run applicable checks
  // 3. Log results for monitoring
}
```

### 5. Modify `src/lib/notifications/notificationService.ts`
Add rate limiting and deduplication:

```typescript
// Add to existing file:
const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function canSendNotification(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  // Check Firestore for last notification of this type
  // Return false if within cooldown period
}
```

### 6. Create API endpoint for notification preferences
`src/app/api/notifications/preferences/route.ts`

```typescript
// GET - fetch user's notification preferences
// PUT - update preferences

interface NotificationPreferences {
  enabled: boolean;
  streakReminders: boolean;
  reviewReminders: boolean;
  masteryAlerts: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
}
```

## Notification Types to Wire

| Event | Notification | Trigger Location |
|-------|-------------|------------------|
| Streak at risk | "Don't lose your 7-day streak!" | useStreak hook |
| Reviews due | "You have 5 reviews waiting" | /api/review/due |
| Mastery decay | "Your HTML skills are getting rusty" | After FSRS update |
| Optimal time | "Perfect time to learn!" | Scheduled check |

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Don't study for a day, verify streak reminder fires
4. Manual test: Let reviews pile up, verify backlog notification
5. Check: Notifications respect quiet hours
6. Check: Rate limiting prevents spam

## Do NOT Modify
- `src/lib/notifications/fcm.ts` (FCM setup is correct)
- PWA service worker
- Learning components directly

## Output
When complete:
- Notifications actually fire on learning events
- Rate limiting prevents notification spam
- User can configure preferences
- Scheduled checks run for time-based notifications
