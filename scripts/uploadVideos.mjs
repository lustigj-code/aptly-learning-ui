/**
 * Upload videos to Firebase Storage
 *
 * Usage: node scripts/uploadVideos.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  console.log('\nTo fix this:');
  console.log('1. Go to Firebase Console -> Project Settings -> Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save as firebase-service-account.json in project root');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'aptly-study-app.firebasestorage.app',
});

const bucket = getStorage().bucket();

// Videos to upload
const videosDir = path.join(process.cwd(), 'public/videos/fsm');
const videos = [
  'history-of-facebook.mp4',
  'instagram-audience.mp4',
  'snapchat-messaging.mp4',
  'social-media-policy.mp4',
  'channel-selection.mp4',
  'campaign-objectives.mp4',
  'campaign-budget.mp4',
];

async function uploadVideo(filename) {
  const localPath = path.join(videosDir, filename);
  const destination = `videos/fsm/${filename}`;

  if (!fs.existsSync(localPath)) {
    console.log(`⚠️  Skipping ${filename} - file not found`);
    return null;
  }

  const stats = fs.statSync(localPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  console.log(`📤 Uploading ${filename} (${sizeMB} MB)...`);

  try {
    await bucket.upload(localPath, {
      destination,
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Make file public
    const file = bucket.file(destination);
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    console.log(`✅ Uploaded: ${publicUrl}`);

    return { filename, url: publicUrl };
  } catch (error) {
    console.error(`❌ Failed to upload ${filename}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting video upload to Firebase Storage\n');
  console.log(`Bucket: ${bucket.name}\n`);

  const results = [];

  for (const video of videos) {
    const result = await uploadVideo(video);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n📋 Upload Summary:');
  console.log('==================');

  if (results.length === 0) {
    console.log('No videos uploaded.');
    return;
  }

  console.log('\nUpdate fsmCourse.ts with these URLs:\n');
  for (const { filename, url } of results) {
    const name = filename.replace('.mp4', '').replace(/-/g, ' ');
    console.log(`// ${name}`);
    console.log(`videoUrl: '${url}',\n`);
  }
}

main().catch(console.error);
