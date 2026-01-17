#!/usr/bin/env python3
"""
Upload videos to Firebase Storage

Usage:
1. Download service account key from Firebase Console:
   - Go to Project Settings -> Service Accounts
   - Click "Generate new private key"
   - Save as firebase-service-account.json in project root

2. Run: python3 scripts/upload_videos.py
"""

import os
import sys
from pathlib import Path

try:
    from google.cloud import storage
except ImportError:
    print("Installing google-cloud-storage...")
    os.system("pip3 install google-cloud-storage")
    from google.cloud import storage

# Config
BUCKET_NAME = "aptly-study-app.firebasestorage.app"
VIDEOS_DIR = Path(__file__).parent.parent / "public" / "videos" / "fsm"
DESTINATION_PREFIX = "videos/fsm"

VIDEOS = [
    "history-of-facebook.mp4",
    "instagram-audience.mp4",
    "snapchat-messaging.mp4",
    "social-media-policy.mp4",
    "channel-selection.mp4",
    "campaign-objectives.mp4",
    "campaign-budget.mp4",
]

def find_service_account():
    """Find service account file"""
    paths = [
        Path.cwd() / "firebase-service-account.json",
        Path.cwd() / "service-account.json",
        Path.home() / ".config" / "gcloud" / "application_default_credentials.json",
    ]

    # Check GOOGLE_APPLICATION_CREDENTIALS env var
    env_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if env_path:
        paths.insert(0, Path(env_path))

    for path in paths:
        if path.exists():
            return str(path)

    return None

def upload_video(bucket, local_path, destination):
    """Upload a single video file"""
    blob = bucket.blob(destination)

    # Check if already exists
    if blob.exists():
        print(f"  ⚠️  Already exists, skipping: {destination}")
        blob.make_public()
        return blob.public_url

    print(f"  📤 Uploading {local_path.name} ({local_path.stat().st_size / 1024 / 1024:.1f} MB)...")

    blob.upload_from_filename(
        str(local_path),
        content_type="video/mp4",
    )

    # Make public
    blob.make_public()

    print(f"  ✅ Done: {blob.public_url}")
    return blob.public_url

def main():
    print("🚀 Firebase Storage Video Upload\n")

    # Find service account
    sa_path = find_service_account()

    if not sa_path:
        print("❌ Service account file not found!\n")
        print("To fix this:")
        print("1. Go to Firebase Console -> Project Settings -> Service Accounts")
        print("2. Click 'Generate new private key'")
        print("3. Save as 'firebase-service-account.json' in project root")
        print("\nOr set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        sys.exit(1)

    print(f"Using credentials: {sa_path}\n")

    # Initialize client
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = sa_path
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    print(f"Bucket: {BUCKET_NAME}\n")

    # Upload videos
    results = []

    for video in VIDEOS:
        local_path = VIDEOS_DIR / video

        if not local_path.exists():
            print(f"  ⚠️  File not found: {video}")
            continue

        destination = f"{DESTINATION_PREFIX}/{video}"
        url = upload_video(bucket, local_path, destination)
        results.append((video, url))

    # Print summary
    print("\n" + "=" * 60)
    print("📋 UPLOAD COMPLETE")
    print("=" * 60)
    print("\nUpdate fsmCourse.ts videoUrl values with these URLs:\n")

    for video, url in results:
        name = video.replace(".mp4", "").replace("-", " ").title()
        print(f"// {name}")
        print(f"videoUrl: '{url}',\n")

if __name__ == "__main__":
    main()
