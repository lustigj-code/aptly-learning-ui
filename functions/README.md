# APTLY Learning App - Cloud Functions

This directory contains Firebase Cloud Functions for the APTLY Learning App, built with TypeScript, Firebase Admin SDK, and Firebase Functions.

## Project Structure

```
functions/
├── src/
│   ├── scheduled/
│   │   └── dailyStreakCheck.ts      # Daily streak management (runs 00:01 UTC)
│   ├── triggers/
│   │   └── onUserCreate.ts          # User initialization (auth trigger)
│   ├── types.ts                     # Shared TypeScript types
│   └── index.ts                     # Function exports
├── lib/                              # Compiled JavaScript (generated)
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
└── README.md                         # This file
```

## Functions

### 1. dailyStreakCheck (Scheduled)

**Trigger:** Cloud Scheduler - Daily at 00:01 UTC

**Purpose:** Maintains user learning streaks

**Logic:**
- Queries all users in `userProgress` collection
- For each user:
  - If `lastCompletedDate` is yesterday: extends streak and checks for milestones
  - If `lastCompletedDate` is not yesterday and freezes available: applies one freeze
  - If no freezes available: resets streak to 0
- Batch updates (500 users per batch) for efficiency
- Comprehensive logging and error handling

**Key Features:**
- UTC timezone handling
- Milestone detection (7, 14, 30, 60, 100 days)
- Automatic freeze application
- Error resilience (continues processing on failures)
- Batch operation for performance

### 2. onUserCreate (Trigger)

**Trigger:** Firebase Authentication - User Creation

**Purpose:** Initializes user progress and preferences

**Logic:**
- Listens for new user creation in Firebase Auth
- Creates `userProgress/{userId}` document with:
  - All progress tracking fields (courses, modules, lessons, atoms)
  - Streak data (currentStreak=0, longestStreak=0, freezesAvailable=2)
  - XP and level (0 and 1 respectively)
  - Empty arrays for assessments, badges, mastery levels
- Creates `userProgress/{userId}/preferences` subcollection with defaults
- Skips silently if document already exists
- Comprehensive error logging

**Default Values:**
- Learning pace: moderate
- Daily goal: 30 minutes
- Preferred time: morning
- Voice enabled: true
- Sound effects: true
- Reduced motion: false

## Getting Started

### Installation

```bash
cd functions
npm install
```

### Development

```bash
# Build TypeScript
npm run build

# Run emulator locally
npm run start

# View logs
npm run logs

# Interactive shell
npm run shell
```

### Deployment

**Automated deployment:**
```bash
cd ../
./scripts/deployFunctions.sh
```

**Manual deployment:**
```bash
cd functions
npm run deploy
```

## Testing

### Manual Testing

#### Test dailyStreakCheck

1. **Create test users in Firebase Console:**
   - Create a few test users and access their UIDs
   - Go to Firestore and create `userProgress` documents

2. **Create test data:**
   ```javascript
   // Example test user progress document
   {
     currentCourseId: "course-1",
     currentModuleId: "module-1",
     currentLessonId: "lesson-1",
     currentAtomId: "atom-1",
     overallPercentage: 50,
     coursesCompleted: [],
     modulesCompleted: [],
     lessonsCompleted: [],
     atomsCompleted: [],
     assessmentScores: [],
     masteryLevels: [],
     totalTimeSpentMinutes: 120,
     lastActiveAt: new Date(),
     xp: 100,
     streak: {
       currentStreak: 5,
       longestStreak: 10,
       lastCompletedDate: "2025-12-25",  // Yesterday's date
       freezesAvailable: 2,
       freezesUsed: [],
       streakHistory: []
     }
   }
   ```

3. **Manually invoke the function:**
   - Cloud Console > Cloud Functions > dailyStreakCheck > TRIGGER
   - Or use Firebase CLI:
   ```bash
   firebase functions:call dailyStreakCheck
   ```

4. **Verify results:**
   - Check Firestore for updated streak data
   - View logs in Cloud Console or:
   ```bash
   firebase functions:log --follow
   ```

#### Test onUserCreate

1. **Create new user in Firebase Console:**
   - Authentication > Users > Add User
   - Or use test authentication endpoint

2. **Verify initialization:**
   - Go to Firestore > userProgress collection
   - Confirm new document created with correct user UID
   - Verify all fields initialized properly
   - Check preferences subcollection exists

3. **Test edge cases:**
   - Create user, wait 10 seconds, create again with same UID
   - Verify idempotency (second creation skips silently)

## Configuration

### Environment Variables

Set in Cloud Functions environment or Firebase config:

```bash
# firebase.json already configured with:
# - Memory: 512MB
# - Timeout: 300s (dailyStreakCheck), 60s (onUserCreate)
# - Region: us-central1
# - Runtime: Node.js 20
```

### Firebase Configuration

**Firestore Rules needed:**
- Write access to `userProgress` collection (functions)
- Read access to all `users` documents (functions)
- User-specific read/write to own progress document

**Indexes:**
- Collection: `userProgress`
  - Field: `streak.currentStreak`
  - Field: `streak.lastCompletedDate`

## Logging

All functions use Firebase Functions logger:

```typescript
functions.logger.info('User created', { userId });
functions.logger.error('Error occurred', { error });
```

View logs:
```bash
firebase functions:log --follow
firebase functions:log --limit=50
```

## Performance Considerations

1. **Batch Operations:** dailyStreakCheck processes users in batches of 500
2. **Firestore Reads:** Minimized with efficient queries
3. **Timezone Handling:** Always uses UTC for consistency
4. **Error Resilience:** Continues processing on individual user errors

## Error Handling

- **dailyStreakCheck:** Logs errors per-user, continues processing
- **onUserCreate:** Throws error to trigger retry (Firebase automatic retry)

All errors include stack traces for debugging.

## Monitoring & Alerts

**Key metrics to monitor:**
- Execution duration
- Error rate
- Number of users processed (dailyStreakCheck)
- Streak updates, freezes applied, resets

**Set up alerts for:**
- Function failures
- Execution time > 60 seconds
- Error rate > 5%

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Function not executing | Check Cloud Scheduler configuration in GCP Console |
| Users not initialized | Verify auth trigger enabled in Cloud Functions |
| Builds failing | Run `npm install` and `npm run build` locally to debug |
| Timeouts | Check batch size, Firestore query efficiency |
| Missing data | Verify Firestore schema matches types.ts |

## TypeScript Types

All functions use strict TypeScript with these custom types:

- `UserProgress` - Complete user progress data
- `StreakData` - Streak tracking information
- `UserPreferences` - User settings and preferences
- `ProcessingResult` - dailyStreakCheck output statistics

See `/src/types.ts` for full definitions.

## Contributing

When adding new functions:

1. Create file in appropriate directory (`scheduled/` or `triggers/`)
2. Use strict TypeScript with explicit types
3. Export function from `src/index.ts`
4. Add comprehensive logging
5. Include error handling
6. Update this README
7. Test locally with emulator
8. Test in staging environment before production

## Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] All TypeScript strict checks pass
- [ ] Logged in to Firebase: `firebase login`
- [ ] Selected correct project: `firebase use [project-id]`
- [ ] Test functions locally with emulator
- [ ] Review Firestore rules are correct
- [ ] Run deployment script: `./scripts/deployFunctions.sh`
- [ ] Verify in Cloud Console
- [ ] Check Cloud Scheduler shows daily execution
- [ ] Monitor logs for 24 hours after deployment

## Support & Documentation

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)

## License

Part of APTLY Learning App system.
