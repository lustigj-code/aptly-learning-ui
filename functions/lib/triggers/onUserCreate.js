"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const DEFAULT_PREFERENCES = {
    learningPace: 'moderate',
    dailyGoalMinutes: 30,
    preferredLearningTime: 'morning',
    voiceEnabled: true,
    soundEffectsEnabled: true,
    reducedMotion: false,
};
const DEFAULT_STREAK = {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: '',
    freezesAvailable: 2,
    freezesUsed: [],
    streakHistory: [],
};
const DEFAULT_PROGRESS = {
    currentCourseId: '',
    currentModuleId: '',
    currentLessonId: '',
    currentAtomId: '',
    overallPercentage: 0,
    coursesCompleted: [],
    modulesCompleted: [],
    lessonsCompleted: [],
    atomsCompleted: [],
    assessmentScores: [],
    masteryLevels: [],
    totalTimeSpentMinutes: 0,
    lastActiveAt: new Date(),
    xp: 0,
    streak: DEFAULT_STREAK,
};
exports.onUserCreate = functions
    .auth.user()
    .onCreate(async (user) => {
    const db = admin.firestore();
    const userId = user.uid;
    try {
        functions.logger.info(`Processing new user creation: ${userId}`);
        // Check if userProgress already exists
        const existingProgress = await db
            .collection('userProgress')
            .doc(userId)
            .get();
        if (existingProgress.exists) {
            functions.logger.info(`UserProgress document already exists for ${userId}, skipping creation`);
            return {
                success: true,
                message: 'User progress document already exists',
                skipped: true,
            };
        }
        // Create userProgress document with initialized fields
        const userProgressData = {
            ...DEFAULT_PROGRESS,
            lastActiveAt: new Date(),
        };
        await db.collection('userProgress').doc(userId).set(userProgressData);
        functions.logger.info(`Created userProgress document for user ${userId}`);
        // Create preferences subcollection
        await db
            .collection('userProgress')
            .doc(userId)
            .collection('preferences')
            .doc('default')
            .set(DEFAULT_PREFERENCES);
        functions.logger.info(`Created preferences subcollection for user ${userId}`);
        return {
            success: true,
            userId,
            message: 'User progress initialized successfully',
            progressData: userProgressData,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        functions.logger.error(`Failed to initialize user progress for ${userId}:`, {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Re-throw to trigger retry mechanism
        throw error;
    }
});
//# sourceMappingURL=onUserCreate.js.map