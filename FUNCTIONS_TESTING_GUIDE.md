# Cloud Functions Testing Guide

This guide provides step-by-step instructions for testing the APTLY Learning App Cloud Functions.

## Prerequisites

- Firebase project set up and configured
- Firebase CLI installed: `firebase --version`
- Access to Firebase Console
- Functions deployed (or ready to deploy)

## Part 1: Testing onUserCreate Function

### 1.1 Set Up Test Environment

```bash
# Ensure you're in the project root
cd /Users/juleslustig/aptlylearning\ app/aptly-learning

# Log in to Firebase
firebase login

# Verify you're on the correct project
firebase projects:list
firebase use aptly-learning  # or your project ID
```

### 1.2 Create Test User via Firebase Console

**Method A: Firebase Console Web UI**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to "Authentication" > "Users"
4. Click "Add user"
5. Enter:
   - Email: `test-user-1@example.com`
   - Password: `TestPassword123!`
6. Click "Create user"
7. Note the generated UID (e.g., `abc123def456...`)

**Method B: Firebase CLI**

```bash
firebase auth:create test-user-2@example.com --password "TestPassword123!"
# Output will show the UID
```

### 1.3 Verify onUserCreate Executed

1. **Check Firestore immediately:**
   - Go to Firebase Console > Firestore Database
   - Look for collection `userProgress`
   - You should see a document with the user's UID

2. **Verify document structure:**
   ```
   userProgress/{userId}
   ├── currentCourseId: ""
   ├── currentModuleId: ""
   ├── currentLessonId: ""
   ├── currentAtomId: ""
   ├── overallPercentage: 0
   ├── coursesCompleted: []
   ├── modulesCompleted: []
   ├── lessonsCompleted: []
   ├── atomsCompleted: []
   ├── assessmentScores: []
   ├── masteryLevels: []
   ├── totalTimeSpentMinutes: 0
   ├── lastActiveAt: (timestamp)
   ├── xp: 0
   └── streak: {
       ├── currentStreak: 0
       ├── longestStreak: 0
       ├── lastCompletedDate: ""
       ├── freezesAvailable: 2
       ├── freezesUsed: []
       └── streakHistory: []
   }
   ```

3. **Verify preferences subcollection:**
   - Expand the document
   - You should see a `preferences` subcollection
   - Inside, there should be a `default` document with:
     ```json
     {
       "learningPace": "moderate",
       "dailyGoalMinutes": 30,
       "preferredLearningTime": "morning",
       "voiceEnabled": true,
       "soundEffectsEnabled": true,
       "reducedMotion": false
     }
     ```

### 1.4 Test Edge Cases

**Test Idempotency:**
1. Try creating same user twice (in same or different sessions)
2. First should initialize document
3. Second should skip silently (no duplicate document)

**Test with existing progress doc:**
1. Manually create a `userProgress` document for a user
2. Then create that user in Firebase Auth
3. Function should skip (not overwrite)

### 1.5 View Function Logs

```bash
# View recent logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --follow

# View logs for specific function
firebase functions:log --only onUserCreate

# Limit to recent N logs
firebase functions:log --limit=20
```

Expected log output:
```
[onUserCreate] Processing new user creation: abc123def456
[onUserCreate] Created userProgress document for user abc123def456
[onUserCreate] Created preferences subcollection for user abc123def456
```

## Part 2: Testing dailyStreakCheck Function

### 2.1 Create Test User Progress Documents

**Via Firebase Console:**

1. Go to Firestore > Create Collection > `userProgress`
2. Create a new document with auto ID (or use user UID)
3. Add the following test data:

**Test Case 1: User with streak from yesterday (should extend)**

```json
{
  "currentCourseId": "course-1",
  "currentModuleId": "module-1",
  "currentLessonId": "lesson-1",
  "currentAtomId": "atom-1",
  "overallPercentage": 50,
  "coursesCompleted": [],
  "modulesCompleted": [],
  "lessonsCompleted": [],
  "atomsCompleted": [],
  "assessmentScores": [],
  "masteryLevels": [],
  "totalTimeSpentMinutes": 120,
  "lastActiveAt": "2025-12-26T10:00:00Z",
  "xp": 100,
  "streak": {
    "currentStreak": 6,
    "longestStreak": 10,
    "lastCompletedDate": "2025-12-25",
    "freezesAvailable": 2,
    "freezesUsed": [],
    "streakHistory": []
  }
}
```

**Test Case 2: User with streak but no completion today (freezes available)**

```json
{
  "currentCourseId": "course-1",
  "currentModuleId": "module-1",
  "currentLessonId": "lesson-1",
  "currentAtomId": "atom-1",
  "overallPercentage": 50,
  "coursesCompleted": [],
  "modulesCompleted": [],
  "lessonsCompleted": [],
  "atomsCompleted": [],
  "assessmentScores": [],
  "masteryLevels": [],
  "totalTimeSpentMinutes": 240,
  "lastActiveAt": "2025-12-24T10:00:00Z",
  "xp": 200,
  "streak": {
    "currentStreak": 14,
    "longestStreak": 14,
    "lastCompletedDate": "2025-12-24",
    "freezesAvailable": 2,
    "freezesUsed": [],
    "streakHistory": []
  }
}
```

**Test Case 3: User with streak, no completion, no freezes (should reset)**

```json
{
  "currentCourseId": "course-1",
  "currentModuleId": "module-1",
  "currentLessonId": "lesson-1",
  "currentAtomId": "atom-1",
  "overallPercentage": 50,
  "coursesCompleted": [],
  "modulesCompleted": [],
  "lessonsCompleted": [],
  "atomsCompleted": [],
  "assessmentScores": [],
  "masteryLevels": [],
  "totalTimeSpentMinutes": 360,
  "lastActiveAt": "2025-12-20T10:00:00Z",
  "xp": 500,
  "streak": {
    "currentStreak": 30,
    "longestStreak": 30,
    "lastCompletedDate": "2025-12-24",
    "freezesAvailable": 0,
    "freezesUsed": ["2025-12-23"],
    "streakHistory": []
  }
}
```

**Test Case 4: User approaching milestone (7 days)**

```json
{
  "currentCourseId": "course-1",
  "currentModuleId": "module-1",
  "currentLessonId": "lesson-1",
  "currentAtomId": "atom-1",
  "overallPercentage": 50,
  "coursesCompleted": [],
  "modulesCompleted": [],
  "lessonsCompleted": [],
  "atomsCompleted": [],
  "assessmentScores": [],
  "masteryLevels": [],
  "totalTimeSpentMinutes": 150,
  "lastActiveAt": "2025-12-26T10:00:00Z",
  "xp": 150,
  "streak": {
    "currentStreak": 6,
    "longestStreak": 6,
    "lastCompletedDate": "2025-12-25",
    "freezesAvailable": 2,
    "freezesUsed": [],
    "streakHistory": []
  }
}
```

### 2.2 Manually Invoke the Function

**Option A: Cloud Console**

1. Go to [Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to Cloud Functions
4. Find `dailyStreakCheck`
5. Click the function name
6. Go to "TESTING" tab
7. Click "TRIGGER NOW"
8. Wait for execution

**Option B: Firebase CLI**

```bash
firebase functions:call dailyStreakCheck --region=us-central1
```

**Option C: Local Emulator**

```bash
# Terminal 1: Start emulator
cd functions
npm run start

# Terminal 2: Trigger function
curl -X POST http://localhost:5001/PROJECTID/us-central1/dailyStreakCheck
```

### 2.3 Monitor Function Execution

1. **View logs:**
   ```bash
   firebase functions:log --follow --only dailyStreakCheck
   ```

2. **Expected log output:**
   ```
   [dailyStreakCheck] Daily streak check started at: 2025-12-26T13:00:00Z
   [dailyStreakCheck] Committed batch of 500 updates
   [dailyStreakCheck] Daily streak check completed: {
     "totalUsers": 4,
     "streaksExtended": 1,
     "freezesApplied": 1,
     "streakResets": 1,
     "errors": 0,
     "durationMs": 1234
   }
   ```

### 2.4 Verify Results in Firestore

For **Test Case 1** (yesterday completion):
- `streak.currentStreak` should increase from 6 to 7 ✓ (MILESTONE!)
- `streak.lastCompletedDate` should be today's date (2025-12-26)
- `streak.freezesAvailable` unchanged (2)

For **Test Case 2** (no completion, freezes available):
- `streak.currentStreak` unchanged (14)
- `streak.freezesAvailable` decreases from 2 to 1
- `streak.freezesUsed` should include 2025-12-24
- `streak.lastCompletedDate` updated to 2025-12-24 (yesterday)

For **Test Case 3** (no freezes):
- `streak.currentStreak` reset to 0
- `streak.freezesAvailable` stays 0
- `streak.lastCompletedDate` updated to today (2025-12-26)

For **Test Case 4** (approaching milestone):
- `streak.currentStreak` increases from 6 to 7 ✓ (MILESTONE!)
- Logs should include milestone message

### 2.5 Test Scheduled Execution

The function is configured to run daily at 00:01 UTC.

**Verify scheduling:**

1. Go to Cloud Console > Cloud Scheduler
2. Look for job related to `dailyStreakCheck`
3. Verify schedule: `0 1 * * *`
4. Verify timezone: UTC
5. Verify it's enabled

**Monitor over 24 hours:**
- Check Cloud Scheduler execution history
- View function logs for automatic executions
- Verify all users' streaks update correctly

## Part 3: Integration Testing

### 3.1 Full User Lifecycle Test

1. Create new user in Firebase Auth (triggers onUserCreate)
2. Verify userProgress document created
3. Manually update `lastCompletedDate` to yesterday
4. Trigger dailyStreakCheck
5. Verify streak incremented

### 3.2 Performance Testing

Create 1000+ test users and:

1. Measure dailyStreakCheck execution time
2. Verify all users processed correctly
3. Check for timeout errors
4. Monitor Firestore usage and costs

### 3.3 Error Scenario Testing

**Test user with corrupted data:**

```json
{
  "streak": null
}
```

Expected: Function logs error but continues, initializes default streak

**Test user with missing fields:**

```json
{
  "xp": 100
}
```

Expected: Function fills in defaults

## Part 4: Production Monitoring

### 4.1 Set Up Cloud Monitoring Alerts

1. Cloud Console > Monitoring > Alerting Policies > Create Policy
2. Select metric: `cloud.googleapis.com/function/execution_count`
3. Alert on:
   - Function errors (execution_times where status="error")
   - Execution time > 60 seconds
   - Error rate > 5%

### 4.2 Daily Review Checklist

After deploying, check daily for 1 week:

- [ ] Function executions completed successfully
- [ ] No error spikes in logs
- [ ] User counts accurate
- [ ] Streaks updated correctly
- [ ] Freezes applied appropriately
- [ ] Milestones detected
- [ ] No performance degradation

## Troubleshooting

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| onUserCreate not firing | Check if auth trigger enabled in Cloud Functions | Re-deploy function, verify in console |
| dailyStreakCheck not executing | Check Cloud Scheduler job status | Enable job, verify schedule and timezone |
| Data not updating | Check Firestore rules allow writes | Update firestore.rules with function service account |
| Function timeout | Query too slow or batch size too large | Reduce batch size, add indexes |
| High error rate | Data validation errors | Check Firestore schema vs types.ts |
| Missing documents | onUserCreate error | Check function logs for error messages |

## Success Criteria

Your testing is complete when:

- ✅ onUserCreate creates user progress documents on user creation
- ✅ onUserCreate initializes all fields correctly
- ✅ onUserCreate creates preferences subcollection
- ✅ dailyStreakCheck extends streaks for active users
- ✅ dailyStreakCheck applies freezes when appropriate
- ✅ dailyStreakCheck resets streaks without freezes
- ✅ dailyStreakCheck detects milestone achievements
- ✅ Both functions handle errors gracefully
- ✅ Functions complete within timeout limits
- ✅ Cloud Scheduler executes function daily
- ✅ All logs show expected output

## Next Steps

After successful testing:

1. Deploy to production: `./scripts/deployFunctions.sh`
2. Monitor for 24 hours
3. Set up automated alerts
4. Document any custom configurations
5. Create runbook for operations team
