# Firestore Backup & Restore Guide

## Overview

This guide covers backup and restore procedures for the Aptly Learning Firestore database.

## Backup Strategy

- **Frequency**: Daily automated exports at 3:00 AM UTC
- **Retention**: 30 days
- **Storage**: Google Cloud Storage bucket
- **Method**: Firestore managed exports via Cloud Scheduler

---

## Initial Setup

### 1. Create Backup Bucket

```bash
# Create a GCS bucket for backups (run once)
gsutil mb -l us-central1 gs://aptly-firestore-backups

# Set lifecycle policy to auto-delete after 30 days
cat > /tmp/lifecycle.json << 'EOF'
{
  "rule": [{
    "action": {"type": "Delete"},
    "condition": {"age": 30}
  }]
}
EOF

gsutil lifecycle set /tmp/lifecycle.json gs://aptly-firestore-backups
```

### 2. Grant Permissions

```bash
# Get the Firestore service account
PROJECT_ID="aptly-study-app"
SERVICE_ACCOUNT="service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gcp-sa-firestore.iam.gserviceaccount.com"

# Grant Storage Admin on backup bucket
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:roles/storage.admin gs://aptly-firestore-backups
```

### 3. Create Scheduled Backup (Cloud Scheduler)

**Option A: Via Google Cloud Console**
1. Go to: https://console.cloud.google.com/cloudscheduler
2. Create Job:
   - Name: `firestore-daily-backup`
   - Frequency: `0 3 * * *` (3 AM UTC daily)
   - Target: HTTP
   - URL: Firestore Admin API export endpoint
   - Auth: Service account with Firestore Admin

**Option B: Via gcloud CLI**

```bash
# Create a Cloud Function to trigger backups
gcloud functions deploy firestoreBackup \
  --runtime nodejs20 \
  --trigger-topic firestore-backup \
  --entry-point backupFirestore \
  --project aptly-study-app

# Create Cloud Scheduler job
gcloud scheduler jobs create pubsub firestore-daily-backup \
  --schedule="0 3 * * *" \
  --topic=firestore-backup \
  --message-body='{"bucket":"aptly-firestore-backups"}' \
  --time-zone="UTC" \
  --project aptly-study-app
```

---

## Manual Backup

Run a manual backup anytime:

```bash
# Export all collections
gcloud firestore export gs://aptly-firestore-backups/manual-$(date +%Y-%m-%d-%H%M%S) \
  --project=aptly-study-app

# Export specific collections only
gcloud firestore export gs://aptly-firestore-backups/users-$(date +%Y-%m-%d) \
  --collection-ids=users,userProgress,courses \
  --project=aptly-study-app
```

---

## Restore Procedures

### Full Database Restore

```bash
# List available backups
gsutil ls gs://aptly-firestore-backups/

# Import from a specific backup
gcloud firestore import gs://aptly-firestore-backups/BACKUP_FOLDER \
  --project=aptly-study-app
```

### Restore to Different Project (Staging)

```bash
# Export from production
gcloud firestore export gs://aptly-firestore-backups/prod-snapshot \
  --project=aptly-study-app

# Import to staging project
gcloud firestore import gs://aptly-firestore-backups/prod-snapshot \
  --project=aptly-study-app-staging
```

### Partial Restore (Specific Collections)

```bash
# Import only specific collections
gcloud firestore import gs://aptly-firestore-backups/BACKUP_FOLDER \
  --collection-ids=userProgress \
  --project=aptly-study-app
```

---

## Verification

### Check Backup Status

```bash
# List recent exports
gcloud firestore operations list --project=aptly-study-app

# Get details of a specific operation
gcloud firestore operations describe OPERATION_ID --project=aptly-study-app
```

### Verify Backup Contents

```bash
# List backup files
gsutil ls -r gs://aptly-firestore-backups/BACKUP_FOLDER/

# Check backup metadata
gsutil cat gs://aptly-firestore-backups/BACKUP_FOLDER/BACKUP_FOLDER.overall_export_metadata
```

---

## Monitoring & Alerts

### Set Up Backup Failure Alerts

1. Go to Cloud Monitoring: https://console.cloud.google.com/monitoring
2. Create Alert Policy:
   - Condition: Cloud Scheduler job failure
   - Notification: Email/Slack

### Log-based Alerts

```bash
# Create alert for failed exports
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Firestore Backup Failure" \
  --condition-filter='resource.type="cloud_scheduler_job" AND severity>=ERROR'
```

---

## Cost Estimate

| Item | Monthly Cost |
|------|-------------|
| Storage (30 days retention, ~1GB) | ~$0.02 |
| Export operations (30/month) | ~$0.30 |
| Cloud Scheduler | Free (first 3 jobs) |
| **Total** | ~$0.32/month |

---

## Emergency Contacts

- **Firebase Console**: https://console.firebase.google.com/project/aptly-study-app
- **GCS Backups**: https://console.cloud.google.com/storage/browser/aptly-firestore-backups
- **Cloud Scheduler**: https://console.cloud.google.com/cloudscheduler

---

## Quick Reference

```bash
# Manual backup
gcloud firestore export gs://aptly-firestore-backups/$(date +%Y-%m-%d) --project=aptly-study-app

# List backups
gsutil ls gs://aptly-firestore-backups/

# Restore from backup
gcloud firestore import gs://aptly-firestore-backups/BACKUP_NAME --project=aptly-study-app
```
