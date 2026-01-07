# Firebase Deployment Permissions Fix

## Problem
The service account needs additional IAM roles to deploy Cloud Functions.

## Solution: Add Required Roles in Google Cloud Console

### Step 1: Go to Google Cloud Console
1. Open: https://console.cloud.google.com/
2. Select project: **aptly-study-app** (at the top)

### Step 2: Navigate to IAM
1. Left sidebar → **IAM & Admin** → **IAM**
2. Click **GRANT ACCESS** button

### Step 3: Add Service Account Email
1. In "New principals" field, paste:
   ```
   firebase-adminsdk-fbsvc@aptly-study-app.iam.gserviceaccount.com
   ```

### Step 4: Add Required Roles
Click "Select a role" and add **EACH of these roles**:

1. **Cloud Functions Developer**
   - Type: cloudfunctions
   - Allows: Deploy, update, delete functions

2. **Cloud Build Editor**
   - Type: cloudbuild
   - Allows: Build Cloud Functions

3. **Cloud Artifact Registry Administrator**
   - Type: artifactregistry
   - Allows: Store function artifacts

4. **Cloud Pub/Sub Editor**
   - Type: pubsub
   - Allows: Create topics for scheduling

5. **Cloud Scheduler Admin**
   - Type: scheduler
   - Allows: Create scheduler jobs

6. **Logs Configuration Writer**
   - Type: logging
   - Allows: Write logs

### Step 5: Save
Click **SAVE**

---

## After Fixing Permissions

Once you've added the roles (wait 30 seconds), run:

```bash
cd "/Users/juleslustig/aptlylearning app/aptly-learning"
export GOOGLE_APPLICATION_CREDENTIALS="/Users/juleslustig/Library/Caches/com.apple.SwiftUI.Drag-F7D61686-AFED-4A82-BC0A-5320D3AD5BE1/Aptly Study App Firebase Admin SDK.json"
firebase deploy
```

This will deploy:
- ✅ Cloud Functions (dailyStreakCheck, onUserCreate)
- ✅ Firestore Rules
- ✅ Firestore Indexes
- ✅ Cloud Scheduler Job

---

## What Each Role Does

| Role | Purpose |
|------|---------|
| Cloud Functions Developer | Deploy & manage Cloud Functions |
| Cloud Build | Build function code (TypeScript → JavaScript) |
| Artifact Registry Admin | Store compiled function artifacts |
| Cloud Pub/Sub Editor | Create pub/sub topics for scheduling |
| Cloud Scheduler Admin | Create daily scheduled job (00:01 UTC) |
| Logs Configuration Writer | Write structured logs |

---

## Troubleshooting

**If you get "Permission denied" after adding roles:**
1. IAM changes can take 30-60 seconds
2. Wait a minute and try again

**If deployment still fails:**
1. Check the service account exists:
   ```bash
   gcloud iam service-accounts list --project=aptly-study-app
   ```

2. Verify roles were added:
   ```bash
   gcloud projects get-iam-policy aptly-study-app --flatten="bindings[].members" --filter="bindings.members:firebase-adminsdk-fbsvc*"
   ```

---

## Complete Deploy Command (After Permissions Fixed)

```bash
cd "/Users/juleslustig/aptlylearning app/aptly-learning"
export GOOGLE_APPLICATION_CREDENTIALS="/Users/juleslustig/Library/Caches/com.apple.SwiftUI.Drag-F7D61686-AFED-4A82-BC0A-5320D3AD5BE1/Aptly Study App Firebase Admin SDK.json"
firebase deploy --only functions,firestore:rules,firestore:indexes
```

Or to deploy everything:
```bash
firebase deploy
```

---

## Expected Output After Successful Deployment

```
=== Deploying to 'aptly-study-app'...

i  deploying functions
i  functions: preparing codebase default for deployment
✔ functions: Cloud Functions for Firebase SDK initialization
✔ functions: Ensuring required APIs are enabled...
✔ functions: Building artifacts...
✔ functions: Uploading artifacts...
✔ Deploy complete!

Function URLs:
  dailyStreakCheck: https://us-central1-aptly-study-app.cloudfunctions.net/dailyStreakCheck
  onUserCreate: https://us-central1-aptly-study-app.cloudfunctions.net/onUserCreate

=== Deploying firestore:rules...
✔ Firestore Rules have been deployed.

=== Deploying firestore:indexes...
✔ Firestore Indexes have been deployed.
```

---

Once you've done this on the Google Cloud Console, let me know and I'll complete the deployment and run the full test suite!
