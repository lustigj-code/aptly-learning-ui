import { initializeApp, getApps } from 'firebase/app';
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

if (missingEnvVars.length > 0) {
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

// Debug logging for Vercel troubleshooting (remove after fixing)
if (typeof window !== 'undefined') {
  console.log('[Firebase Config Debug]', {
    hasApiKey: !!firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    apiKeyLength: firebaseConfig.apiKey?.length,
  });
}

// Initialize Firebase (only if no app exists and config is valid)
let app: ReturnType<typeof initializeApp> | null = null;

const isConfigValid = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

if (isConfigValid) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Firebase app initialization failed:', error);
  }
}

// Lazy getters for Firebase services - initialize on first access
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

// Get Auth instance (lazy initialization)
function getAuthInstance(): Auth | null {
  if (_auth) return _auth;
  if (!app) return null;
  try {
    _auth = getAuth(app);
    return _auth;
  } catch (error) {
    console.error('Firebase Auth initialization failed:', error);
    return null;
  }
}

// Get Firestore instance (lazy initialization)
function getFirestoreInstance(): Firestore | null {
  if (_db) return _db;
  if (!app) return null;
  try {
    _db = getFirestore(app);
    return _db;
  } catch (error) {
    console.error('Firestore initialization failed:', error);
    return null;
  }
}

// Get Storage instance (lazy initialization)
function getStorageInstance(): FirebaseStorage | null {
  if (_storage) return _storage;
  if (!app) return null;
  try {
    _storage = getStorage(app);
    return _storage;
  } catch (error) {
    console.error('Firebase Storage initialization failed:', error);
    return null;
  }
}

// Export getters that return initialized instances
// These are evaluated lazily when accessed
const auth = getAuthInstance();
const db = getFirestoreInstance();
const storage = getStorageInstance();

export { app, auth, db, storage, getAuthInstance, getFirestoreInstance, getStorageInstance };
