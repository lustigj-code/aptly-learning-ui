import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

// Clean env vars: remove literal \n strings AND whitespace
const cleanEnvVar = (value: string | undefined): string => {
  if (!value) return '';
  return value
    .replace(/\\n/g, '')  // Remove literal \n (two chars: backslash + n)
    .replace(/\n/g, '')   // Remove actual newlines
    .trim();              // Remove whitespace
};

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0 && typeof window !== 'undefined') {
  console.warn(
    `Missing Firebase environment variables: ${missingEnvVars.join(', ')}. Firebase will not be initialized.`
  );
}

const firebaseConfig: FirebaseConfig = {
  apiKey: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

// Debug logging for Vercel troubleshooting (client-side only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[Firebase Config Debug]', {
    hasApiKey: !!firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    apiKeyLength: firebaseConfig.apiKey?.length,
  });
}

// ============================================
// LAZY INITIALIZATION WITH CACHING
// ============================================

// Cached instances - initialized on first access
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

const isConfigValid = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

/**
 * Get Firebase App instance (lazy initialization)
 * Returns cached instance or creates new one if config is valid
 */
function getAppInstance(): FirebaseApp | null {
  if (_app) return _app;
  if (!isConfigValid) return null;

  try {
    _app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    return _app;
  } catch (error) {
    console.error('Firebase app initialization failed:', error);
    return null;
  }
}

/**
 * Get Auth instance (lazy initialization)
 * IMPORTANT: Use this getter function for guaranteed lazy access
 */
function getAuthInstance(): Auth | null {
  if (_auth) return _auth;
  const app = getAppInstance();
  if (!app) return null;

  try {
    _auth = getAuth(app);
    return _auth;
  } catch (error) {
    console.error('Firebase Auth initialization failed:', error);
    return null;
  }
}

/**
 * Get Firestore instance (lazy initialization)
 * IMPORTANT: Use this getter function for guaranteed lazy access
 */
function getFirestoreInstance(): Firestore | null {
  if (_db) return _db;
  const app = getAppInstance();
  if (!app) return null;

  try {
    _db = getFirestore(app);
    return _db;
  } catch (error) {
    console.error('Firestore initialization failed:', error);
    return null;
  }
}

/**
 * Get Storage instance (lazy initialization)
 * IMPORTANT: Use this getter function for guaranteed lazy access
 */
function getStorageInstance(): FirebaseStorage | null {
  if (_storage) return _storage;
  const app = getAppInstance();
  if (!app) return null;

  try {
    _storage = getStorage(app);
    return _storage;
  } catch (error) {
    console.error('Firebase Storage initialization failed:', error);
    return null;
  }
}

// ============================================
// EXPORTS
// ============================================

// Export getter functions for guaranteed lazy initialization
// These should be used in critical paths where timing matters
export { getAppInstance, getAuthInstance, getFirestoreInstance, getStorageInstance };

// Legacy named exports - evaluated once at first access after module load
// For true lazy behavior in edge cases, use the getter functions above
const app = getAppInstance();
const auth = getAuthInstance();
const db = getFirestoreInstance();
const storage = getStorageInstance();

export { app, auth, db, storage };
