# Firebase Setup Guide for APTLY Learning App

## Overview
This guide walks through the Firebase infrastructure setup for the APTLY Learning App. All configuration files and helper functions have been created and are ready for use.

## Completed Setup

### 1. Installed Dependencies
- `firebase` - Client SDK for browser/mobile
- `firebase-admin` - Admin SDK for server-side operations
- `zod` - Runtime type validation
- `@upstash/ratelimit` - Optional rate limiting service
- `firebase-tools` - Firebase CLI (installed globally)

### 2. Created Configuration Files

#### Client Configuration
- **`src/lib/firebase/config.ts`** - Initializes Firebase client SDK with environment variables
  - Exports: `app`, `auth`, `db`, `storage`
  - Validates required environment variables
  - Safe to use in browser code

#### Admin Configuration
- **`src/lib/firebase/admin.ts`** - Initializes Firebase Admin SDK (server-side only)
  - Exports: `adminApp`, `adminAuth`, `adminDb`
  - Supports credential from `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_ADMIN_SDK_JSON`
  - NEVER import this in client-side code

#### Helper Functions
- **`src/lib/firebase/auth.ts`** - Authentication helpers
  - `signUpWithEmail()` - Register with email/password
  - `signInWithEmail()` - Login with email/password
  - `signInWithGoogle()` - Login with Google OAuth
  - `signOut()` - Logout user
  - `getCurrentUser()` - Get current authenticated user
  - `onAuthStateChange()` - Listen to auth state changes
  - `sendPasswordReset()` - Send password reset email
  - `getIdToken()` - Get user's ID token for API calls

- **`src/lib/firebase/firestore.ts`** - Firestore database helpers
  - `getDocData()` - Read single document
  - `setDocData()` - Write/overwrite document
  - `updateDocData()` - Update specific fields
  - `deleteDocFromFirestore()` - Delete document
  - `queryDocs()` - Query documents with conditions
  - `addDocument()` - Add new document with auto-generated ID
  - `batchWrite()` - Batch multiple operations

- **`src/lib/firebase/storage.ts`** - Cloud Storage helpers
  - `uploadFile()` - Upload files to storage
  - `deleteFile()` - Delete files from storage
  - `getDownloadURLForFile()` - Get download URL
  - `uploadFileWithProgress()` - Upload with progress tracking
  - `deleteMultipleFiles()` - Batch delete multiple files

#### Unified Export
- **`src/lib/firebase/index.ts`** - Export all Firebase utilities
  - Use: `import { signInWithEmail, getDocData } from '@/lib/firebase'`

### 3. Security Rules

#### Firestore Rules (`firestore.rules`)
Comprehensive security rules with:
- User profile access (read/write own profile only)
- Course/module/lesson read-only access for students
- Admin write access for content management
- User progress protection (API/server-side updates only)
- Quiz submission validation
- Learning notes management
- Achievements and streaks (server-side only)
- Admin logs access

Key principles:
- No direct client writes to sensitive collections
- User can only access their own data
- Admins can manage courses and award achievements
- All progress updates verified server-side

#### Storage Rules (`storage.rules`)
- Profile images (5MB max, image only)
- Course media (100MB max, admin only)
- User content (10MB max, user-specific)
- Learning materials (admin only)
- Temporary uploads (50MB max, user-specific)

### 4. Configuration Files

#### `.firebaserc`
Firebase CLI configuration file with project ID

#### `firebase.json`
Firebase project configuration including:
- Firestore rules and indexes
- Storage rules
- Emulator settings
- Cloud Functions configuration

#### `firestore.indexes.json`
Composite indexes for efficient queries:
- Modules indexed by courseId and order
- Lessons indexed by moduleId and order
- Questions indexed by lessonId and order
- Completed lessons indexed by status and date
- Published courses indexed by status and date

#### `.env.local`
Environment variables needed (template provided):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_SDK_JSON (or GOOGLE_APPLICATION_CREDENTIALS)
ANTHROPIC_API_KEY
UPSTASH_REDIS_REST_URL (optional)
UPSTASH_REDIS_REST_TOKEN (optional)
```

## Next Steps: Firebase Console Setup

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Click "Add project"
   - Name: "aptly-learning"
   - Accept terms and create project

2. **Enable Firebase Services**
   - Firestore Database (Production mode, default security rules will be replaced)
   - Authentication (Enable Email/Password + Google)
   - Storage (default location: US)
   - Cloud Functions (for scheduled tasks)

3. **Get Configuration Values**
   - Project Settings → General tab
   - Copy Firebase SDK config values
   - Create Service Account (Project Settings → Service Accounts)
   - Generate new private key (JSON file)

4. **Set Environment Variables**
   - Copy values to `.env.local`
   - For `FIREBASE_ADMIN_SDK_JSON`: base64 encode the service account JSON
   - Or use `GOOGLE_APPLICATION_CREDENTIALS` with path to JSON file

5. **Deploy Security Rules**
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage:rules
   firebase deploy --only firestore:indexes
   ```

6. **Test with Emulator**
   ```bash
   npm run firebase:emulate
   ```

## Firebase Emulator Setup

### Starting the Emulator
```bash
npm run firebase:emulate
```

Emulator services will run on:
- **Firestore**: localhost:8080
- **Auth**: localhost:9099
- **Storage**: localhost:9199
- **Emulator UI**: http://localhost:4000
- **Functions**: localhost:5001

### Using Emulator in Development
Add to `.env.local` for development:
```
FIREBASE_EMULATOR_HOST=localhost:8080
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### Testing with Emulator
1. Start emulator: `npm run firebase:emulate`
2. In another terminal, start Next.js: `npm run dev`
3. Create test documents in Emulator UI
4. Test auth and Firestore operations

## Usage Examples

### Authentication
```typescript
import { signInWithEmail, getCurrentUser, onAuthStateChange } from '@/lib/firebase';

// Sign in
try {
  const user = await signInWithEmail('user@example.com', 'password');
  console.log('Signed in:', user.uid);
} catch (error) {
  console.error('Sign in failed:', error);
}

// Listen to auth state
const unsubscribe = onAuthStateChange((user) => {
  if (user) {
    console.log('User logged in:', user.email);
  } else {
    console.log('User logged out');
  }
});
```

### Firestore
```typescript
import { getDocData, setDocData, queryDocs } from '@/lib/firebase';
import { where, orderBy } from 'firebase/firestore';

// Get user progress
const progress = await getDocData('userProgress', userId);

// Update progress
await updateDocData('userProgress', userId, {
  currentCourse: 'course-123',
  updatedAt: new Date(),
});

// Query completed lessons
const lessons = await queryDocs('lessons', [
  where('completed', '==', true),
  orderBy('completedAt', 'desc'),
]);
```

### Storage
```typescript
import { uploadFile, getDownloadURLForFile } from '@/lib/firebase';

// Upload profile image
const imageUrl = await uploadFile(
  `users/${userId}/profile-image`,
  imageFile
);

// Get download URL
const url = await getDownloadURLForFile('courses/course-123/banner.jpg');
```

## Important Notes

1. **Client vs Server**
   - Never import `admin.ts` in client code
   - Always use `config.ts` exports in React components
   - Use admin SDK only in API routes and server functions

2. **Security Rules**
   - Rules are deployed to Firebase and enforced server-side
   - User progress updates must go through API endpoints
   - Achievements awarded only by admin or server logic

3. **Environment Variables**
   - NEVER commit `.env.local` to git
   - Add sensitive values only in `.env.local` (added to `.gitignore`)
   - Public Firebase config values (NEXT_PUBLIC_*) are safe to expose

4. **Type Safety**
   - All helper functions are fully typed with TypeScript
   - Use explicit types, avoid `any`
   - Validate user input with Zod

## Troubleshooting

### "Firebase is not initialized"
- Check `.env.local` has all required variables
- Ensure environment variables are loaded before Firebase usage
- Restart dev server after changing `.env.local`

### Emulator not starting
```bash
# Clear emulator data and restart
firebase emulators:start --clear
```

### Rules validation errors
```bash
# Test rules locally
npm run firebase:rules:test
```

### Authentication not working
- Ensure Auth emulator is running (port 9099)
- Check that `FIREBASE_AUTH_EMULATOR_HOST` is set in `.env.local` for emulator dev
- Verify email/password enabled in Firebase Console

## Architecture Overview

```
src/lib/firebase/
├── config.ts           # Client SDK initialization
├── admin.ts           # Admin SDK (server-only)
├── auth.ts            # Auth helpers
├── firestore.ts       # Firestore helpers
├── storage.ts         # Storage helpers
└── index.ts           # Unified exports

src/app/api/          # API routes using admin SDK
├── auth/
├── progress/
├── achievements/
└── coach/             # AI coach powered by admin SDK

firestore.rules       # Firestore security rules
storage.rules         # Storage security rules
firebase.json         # Firebase project config
.firebaserc           # Firebase CLI config
.env.local            # Environment variables (gitignored)
```

## Next: Team Bravo Dependencies

This Firebase foundation enables Team Bravo to:
- Implement user authentication flows
- Build API endpoints for progress tracking
- Create achievement/badge system
- Set up rate limiting and protection
- Implement AI coach with rate limiting

All helper functions are ready to use with full TypeScript support.
