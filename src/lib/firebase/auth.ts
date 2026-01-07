import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { auth } from './config';

type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

/**
 * Convert Firebase User to our AuthUser type
 */
export function firebaseUserToAuthUser(user: FirebaseUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  const userCredential: UserCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return firebaseUserToAuthUser(userCredential.user);
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  const userCredential: UserCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return firebaseUserToAuthUser(userCredential.user);
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  const provider = new GoogleAuthProvider();
  const userCredential: UserCredential = await signInWithPopup(auth, provider);
  return firebaseUserToAuthUser(userCredential.user);
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  await firebaseSignOut(auth);
}

/**
 * Get current authenticated user
 * Returns null if no user is authenticated
 */
export function getCurrentUser(): FirebaseUser | null {
  if (!auth) {
    return null;
  }

  return auth.currentUser;
}

/**
 * Listen to authentication state changes
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  if (!auth) {
    console.warn('Firebase Auth is not initialized');
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(firebaseUserToAuthUser(user));
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  await sendPasswordResetEmail(auth, email);
}

/**
 * Get current user's ID token
 */
export async function getIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  return user.getIdToken();
}
