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
exports.dailyStreakCheck = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const STREAK_MILESTONES = [7, 14, 30, 60, 100];
function getTodayUTC() {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const date = String(today.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}
function getYesterdayUTC() {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const year = yesterday.getUTCFullYear();
    const month = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
    const date = String(yesterday.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}
function isMilestoneReached(streakLength) {
    return STREAK_MILESTONES.includes(streakLength);
}
async function processStreakUpdates(userDocs) {
    const result = {
        totalUsers: userDocs.size,
        streaksExtended: 0,
        freezesApplied: 0,
        streakResets: 0,
        errors: [],
    };
    const db = admin.firestore();
    const today = getTodayUTC();
    const yesterday = getYesterdayUTC();
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;
    for (const doc of userDocs.docs) {
        try {
            const userId = doc.id;
            const userProgress = doc.data();
            const streakRef = db.collection('userProgress').doc(userId);
            if (!userProgress.streak) {
                userProgress.streak = {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastCompletedDate: '',
                    freezesAvailable: 2,
                    freezesUsed: [],
                    streakHistory: [],
                };
            }
            const { lastCompletedDate, freezesAvailable } = userProgress.streak;
            if (lastCompletedDate === yesterday) {
                // User completed learning yesterday - extend the streak
                const newStreak = userProgress.streak.currentStreak + 1;
                batch.update(streakRef, {
                    'streak.currentStreak': newStreak,
                    'streak.lastCompletedDate': today,
                });
                result.streaksExtended++;
                // Check for milestone
                if (isMilestoneReached(newStreak)) {
                    functions.logger.info(`Streak milestone reached for user ${userId}: ${newStreak} days`);
                    // Badge check will be triggered separately
                }
            }
            else if (lastCompletedDate !== today && freezesAvailable > 0) {
                // Apply freeze if available
                const updatedFreezesUsed = [...(userProgress.streak.freezesUsed || []), yesterday];
                batch.update(streakRef, {
                    'streak.freezesUsed': updatedFreezesUsed,
                    'streak.freezesAvailable': freezesAvailable - 1,
                    'streak.lastCompletedDate': yesterday,
                });
                result.freezesApplied++;
            }
            else if (lastCompletedDate !== today && freezesAvailable === 0) {
                // Reset streak - no freeze available
                batch.update(streakRef, {
                    'streak.currentStreak': 0,
                    'streak.lastCompletedDate': today,
                });
                result.streakResets++;
            }
            batchCount++;
            // Commit batch when reaching size limit
            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                functions.logger.info(`Committed batch of ${batchCount} updates`);
                batchCount = 0;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push({
                userId: doc.id,
                error: errorMessage,
            });
            functions.logger.error(`Error processing streak for user ${doc.id}: ${errorMessage}`);
        }
    }
    // Commit remaining batch
    if (batchCount > 0) {
        await batch.commit();
        functions.logger.info(`Committed final batch of ${batchCount} updates`);
    }
    return result;
}
exports.dailyStreakCheck = functions
    .pubsub.schedule('0 1 * * *')
    .timeZone('UTC')
    .onRun(async () => {
    const db = admin.firestore();
    const startTime = Date.now();
    try {
        functions.logger.info('Daily streak check started at:', new Date().toISOString());
        // Query all users in userProgress collection
        const userProgressSnapshot = await db.collection('userProgress').get();
        if (userProgressSnapshot.empty) {
            functions.logger.info('No users found in userProgress collection');
            return {
                success: true,
                timestamp: new Date().toISOString(),
                message: 'No users to process',
            };
        }
        const result = await processStreakUpdates(userProgressSnapshot);
        const duration = Date.now() - startTime;
        functions.logger.info('Daily streak check completed:', {
            totalUsers: result.totalUsers,
            streaksExtended: result.streaksExtended,
            freezesApplied: result.freezesApplied,
            streakResets: result.streakResets,
            errors: result.errors.length,
            durationMs: duration,
        });
        if (result.errors.length > 0) {
            functions.logger.warn('Errors encountered during processing:', result.errors);
        }
        return {
            success: true,
            timestamp: new Date().toISOString(),
            result,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const duration = Date.now() - startTime;
        functions.logger.error(`Daily streak check failed after ${duration}ms:`, {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });
        return {
            success: false,
            timestamp: new Date().toISOString(),
            error: errorMessage,
        };
    }
});
//# sourceMappingURL=dailyStreakCheck.js.map