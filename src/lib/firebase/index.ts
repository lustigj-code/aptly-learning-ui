// Client SDK
export { app, auth, db, storage } from './config';

// Auth helpers
export {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  sendPasswordReset,
  getIdToken,
  firebaseUserToAuthUser,
} from './auth';

// Firestore helpers
export {
  getDocData,
  setDocData,
  updateDocData,
  deleteDocFromFirestore,
  queryDocs,
  addDocument,
  batchWrite,
} from './firestore';

// Storage helpers
export {
  uploadFile,
  deleteFile,
  getDownloadURLForFile,
  uploadFileWithProgress,
  deleteMultipleFiles,
} from './storage';
