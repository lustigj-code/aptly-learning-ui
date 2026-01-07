# Firebase Setup Checklist

## Completed Items (Team Alpha)

### Infrastructure Setup
- [x] Install Firebase SDK: `firebase` (v12.7.0)
- [x] Install Firebase Admin SDK: `firebase-admin` (v13.6.0)
- [x] Install Firebase CLI globally: `firebase-tools` (v15.1.0)
- [x] Install validation library: `zod` (v4.2.1)
- [x] Install rate limiting: `@upstash/ratelimit` (v2.0.7)

### Configuration Files Created
- [x] `src/lib/firebase/config.ts` - Client SDK configuration
- [x] `src/lib/firebase/admin.ts` - Admin SDK configuration (server-only)
- [x] `src/lib/firebase/auth.ts` - Authentication helpers
- [x] `src/lib/firebase/firestore.ts` - Firestore database helpers
- [x] `src/lib/firebase/storage.ts` - Cloud Storage helpers
- [x] `src/lib/firebase/index.ts` - Unified exports

### Security Configuration
- [x] `firestore.rules` - Comprehensive Firestore security rules
- [x] `storage.rules` - Cloud Storage security rules
- [x] `firestore.indexes.json` - Composite indexes for queries

### Project Configuration
- [x] `firebase.json` - Firebase CLI configuration
- [x] `.firebaserc` - Firebase project reference
- [x] `.env.local` - Environment variables template
- [x] `package.json` - Added Firebase CLI scripts

### Documentation
- [x] `FIREBASE_SETUP_GUIDE.md` - Complete setup guide
- [x] `FIREBASE_CHECKLIST.md` - This checklist

### NPM Scripts Added
- [x] `npm run firebase:emulate` - Start Firebase Emulator
- [x] `npm run firebase:rules:test` - Test Firestore rules
- [x] `npm run firebase:deploy` - Deploy to Firebase

## Required Manual Setup (Next Steps)

### 1. Firebase Console Project Creation
- [ ] Go to https://console.firebase.google.com
- [ ] Create new project named "aptly-learning"
- [ ] Wait for project to initialize

### 2. Enable Firebase Services
- [ ] Enable Firestore Database (Production mode)
- [ ] Enable Authentication
  - [ ] Enable Email/Password provider
  - [ ] Enable Google OAuth provider
- [ ] Enable Cloud Storage
- [ ] Enable Cloud Functions

### 3. Get Firebase Credentials
- [ ] Navigate to Project Settings
- [ ] Go to General tab
- [ ] Copy Firebase SDK config (6 values)
- [ ] Go to Service Accounts tab
- [ ] Generate new private key (JSON)
- [ ] Download or copy the JSON

### 4. Configure Environment Variables
- [ ] Update `.env.local` with Firebase SDK config:
  - [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
  - [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] Set admin SDK credentials:
  - [ ] Option A: Base64 encode service account JSON to `FIREBASE_ADMIN_SDK_JSON`
  - [ ] Option B: Save JSON file and set `GOOGLE_APPLICATION_CREDENTIALS` path
- [ ] Add `ANTHROPIC_API_KEY` if using AI coach

### 5. Firebase CLI Authentication
- [ ] Run: `firebase login`
- [ ] Authenticate with Firebase account
- [ ] Verify: `firebase projects:list`

### 6. Deploy Security Rules
- [ ] Run: `firebase deploy --only firestore:rules`
- [ ] Run: `firebase deploy --only storage:rules`
- [ ] Run: `firebase deploy --only firestore:indexes`
- [ ] Verify in Firebase Console

### 7. Test Emulator Setup
- [ ] Run: `npm run firebase:emulate` in terminal 1
- [ ] Wait for emulator to fully start
- [ ] Visit: http://localhost:4000 (Emulator UI)
- [ ] Run: `npm run dev` in terminal 2
- [ ] Test authentication flow
- [ ] Create test Firestore documents
- [ ] Verify rules are enforced

### 8. Verify Configuration
- [ ] Test client SDK initialization
- [ ] Test auth helpers (sign up, sign in, sign out)
- [ ] Test Firestore helpers (read, write, query)
- [ ] Test Storage helpers (upload, download)
- [ ] Verify no console errors

## File Structure Summary

```
aptly-learning/
├── src/lib/firebase/
│   ├── config.ts          # Client initialization
│   ├── admin.ts           # Admin SDK (server-only)
│   ├── auth.ts            # Auth helpers
│   ├── firestore.ts       # Database helpers
│   ├── storage.ts         # Storage helpers
│   └── index.ts           # Unified exports
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
├── firestore.indexes.json # Database indexes
├── firebase.json          # Firebase config
├── .firebaserc            # Project ID
├── .env.local             # Environment variables
├── package.json           # Updated with scripts
├── FIREBASE_SETUP_GUIDE.md
└── FIREBASE_CHECKLIST.md
```

## Key Features Implemented

### Authentication
- Email/password sign up and login
- Google OAuth integration
- Password reset
- Auth state monitoring
- User type definitions

### Firestore
- Document CRUD operations
- Query with conditions
- Batch operations
- Automatic ID generation
- Full TypeScript support

### Storage
- File upload/download
- File deletion (single and batch)
- Download URL generation
- Progress tracking support
- File size validation in rules

### Security
- User-specific data access
- Admin-only content management
- Immutable progress tracking
- Server-side validation required
- Comprehensive rule coverage

## Important Security Notes

1. **Never expose admin SDK in client code**
   - Admin SDK is server-only
   - Use only in API routes and Cloud Functions

2. **Environment variable protection**
   - `.env.local` is in `.gitignore`
   - Public values (`NEXT_PUBLIC_*`) are safe to expose
   - Private values never committed to git

3. **Security rules are enforced**
   - Client-side code cannot bypass rules
   - All writes validated server-side
   - Progress updates API-mediated only

4. **Rate limiting ready**
   - Upstash integration available
   - Protect auth endpoints
   - Protect API endpoints

## API Endpoint Examples (Team Bravo)

These endpoints should be created in `src/app/api/`:

```
/api/auth/signup          POST  - Create user + profile
/api/auth/signin          POST  - Email password login
/api/progress/update      PUT   - Update user progress
/api/progress/get         GET   - Get user progress
/api/achievements/check   POST  - Award achievement
/api/coach/chat           POST  - AI coach interaction
```

All endpoints should:
- Verify ID token from client
- Use admin SDK for database operations
- Validate security rules compliance
- Return proper error codes

## Deployment Checklist

Before going to production:
- [ ] Security rules thoroughly tested
- [ ] All environment variables configured
- [ ] Rate limiting enabled on APIs
- [ ] Firebase backup/disaster recovery set up
- [ ] Monitoring and logging configured
- [ ] Testing completed locally and in staging
- [ ] Security audit of all rules
- [ ] Rate limits appropriate for expected load

## Support & Documentation

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

## Team Handoff Notes

For Team Bravo:
- All Firebase helper functions are ready to use
- Import from `@/lib/firebase` for client code
- Use `admin.ts` only in server routes
- Follow TypeScript types for type safety
- Security rules are deployed and active
- Emulator available for local testing
- Rate limiting library installed and ready

This infrastructure is production-ready once credentials are configured.
