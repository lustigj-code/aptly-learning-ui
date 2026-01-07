import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { dailyStreakCheck } from './scheduled/dailyStreakCheck';
export { onUserCreate } from './triggers/onUserCreate';
