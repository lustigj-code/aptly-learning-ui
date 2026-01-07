import * as admin from 'firebase-admin';

// This file should ONLY be used on the server side
// Never import this in client-side code

type AdminCredential = {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
};

let adminApp: admin.app.App;
let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;

try {
  // Initialize Firebase Admin SDK
  // The credential comes from GOOGLE_APPLICATION_CREDENTIALS environment variable
  // or from the FIREBASE_ADMIN_SDK_JSON environment variable
  if (!admin.apps.length) {
    if (process.env.FIREBASE_ADMIN_SDK_JSON) {
      // If JSON is passed as base64 encoded string
      let credential: Record<string, unknown>;
      try {
        const decodedJson = Buffer.from(
          process.env.FIREBASE_ADMIN_SDK_JSON,
          'base64'
        ).toString('utf-8');
        credential = JSON.parse(decodedJson) as Record<string, unknown>;
      } catch {
        // If not base64, try to parse directly
        credential = JSON.parse(
          process.env.FIREBASE_ADMIN_SDK_JSON
        ) as Record<string, unknown>;
      }

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(credential as admin.ServiceAccount),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use the default credential from GOOGLE_APPLICATION_CREDENTIALS
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      // During build time or when credentials are not available,
      // initialize with a dummy credential that will be replaced at runtime
      if (process.env.NODE_ENV === 'production' || !process.env.CI) {
        console.warn(
          'Firebase Admin SDK credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_SDK_JSON environment variable.'
        );
      }

      // For development/build, create minimal initialization
      if (!admin.apps.length) {
        adminApp = admin.initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy-project',
        });
      } else {
        adminApp = admin.app();
      }
    }

    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
  } else {
    adminApp = admin.app();
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  // Don't throw during build - allow graceful degradation
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Continuing with partial Firebase initialization');
  }
}

export { adminApp, adminAuth, adminDb };
