# Complete IAM Roles Required for Deployment

The service account `firebase-adminsdk-fbsvc@aptly-study-app.iam.gserviceaccount.com` needs these roles:

## Go to IAM Console
👉 https://console.cloud.google.com/iam-admin/iam?project=aptly-study-app

## Find the Service Account Line
Look for: `firebase-adminsdk-fbsvc@aptly-study-app.iam.gserviceaccount.com`

Click the **EDIT** button (pencil icon)

## Add ALL These Roles

1. ✅ **Cloud Functions Developer**
2. ✅ **Cloud Build Editor**
3. ✅ **Cloud Artifact Registry Administrator**
4. ✅ **Cloud Pub/Sub Editor**
5. ✅ **Cloud Scheduler Admin**
6. ✅ **Logs Configuration Writer**
7. ✅ **Service Account User** (already added)
8. **ADD THIS ONE:** **Firebase Admin**
   - Search for "Firebase Admin" in the role selector
   - This gives broad permissions for all Firebase services

## Alternative: Use Editor Role

If you can't find "Firebase Admin", use:
- **Editor** role (gives broader permissions)

## After Adding

Click **SAVE**

Wait 30 seconds, then try deployment again!
