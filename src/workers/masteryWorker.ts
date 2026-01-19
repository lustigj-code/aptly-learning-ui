/**
 * Mastery Web Worker - SLOW BRAIN
 *
 * Offloads expensive BKT and FSRS calculations to a background thread
 * to keep the UI thread (FAST BRAIN) responsive.
 *
 * Handles:
 * - BKT mastery updates (Bayesian Knowledge Tracing)
 * - FSRS scheduling (Free Spaced Repetition Scheduler)
 * - Struggle analysis
 * - Batch calculations
 */

import { updateMastery, type SkillState, type BKTParameters, DEFAULT_BKT_PARAMS } from '../lib/mastery/bkt';
import { calculateNextState, type ReviewRating, type FSRSParameters, DEFAULT_PARAMETERS } from '../lib/mastery/fsrs';
import type { FSRSState } from '../lib/mastery/knowledgeGraph';

// ============================================
// MESSAGE TYPES
// ============================================

export type WorkerMessageType =
  | 'UPDATE_BKT'
  | 'SCHEDULE_REVIEW'
  | 'BATCH_UPDATE';

export type WorkerMessage =
  | UpdateBKTMessage
  | ScheduleReviewMessage
  | BatchUpdateMessage;

export type UpdateBKTMessage = {
  type: 'UPDATE_BKT';
  id: string;
  payload: {
    currentState: SkillState;
    correct: boolean;
    params?: BKTParameters;
  };
};

export type ScheduleReviewMessage = {
  type: 'SCHEDULE_REVIEW';
  id: string;
  payload: {
    currentState: FSRSState;
    rating: ReviewRating;
    params?: FSRSParameters;
  };
};

export type BatchUpdateMessage = {
  type: 'BATCH_UPDATE';
  id: string;
  payload: {
    updates: Array<{
      skillId: string;
      currentState: SkillState;
      correct: boolean;
      params?: BKTParameters;
    }>;
  };
};

// ============================================
// RESPONSE TYPES
// ============================================

export type WorkerResponse =
  | SuccessResponse
  | ErrorResponse;

export type SuccessResponse = {
  type: 'SUCCESS';
  id: string;
  payload: unknown;
};

export type ErrorResponse = {
  type: 'ERROR';
  id: string;
  error: string;
};

// ============================================
// MESSAGE HANDLERS
// ============================================

/**
 * Handle BKT mastery update
 */
function handleUpdateBKT(message: UpdateBKTMessage): SuccessResponse {
  const { currentState, correct, params } = message.payload;

  const updatedState = updateMastery(
    currentState,
    correct,
    params || DEFAULT_BKT_PARAMS
  );

  return {
    type: 'SUCCESS',
    id: message.id,
    payload: updatedState,
  };
}

/**
 * Handle FSRS scheduling
 */
function handleScheduleReview(message: ScheduleReviewMessage): SuccessResponse {
  const { currentState, rating, params } = message.payload;

  const result = calculateNextState(
    currentState,
    rating,
    params || DEFAULT_PARAMETERS
  );

  return {
    type: 'SUCCESS',
    id: message.id,
    payload: result,
  };
}

/**
 * Handle batch BKT updates
 */
function handleBatchUpdate(message: BatchUpdateMessage): SuccessResponse {
  const { updates } = message.payload;

  const results = updates.map(update => ({
    skillId: update.skillId,
    updatedState: updateMastery(
      update.currentState,
      update.correct,
      update.params || DEFAULT_BKT_PARAMS
    ),
  }));

  return {
    type: 'SUCCESS',
    id: message.id,
    payload: results,
  };
}

// ============================================
// MAIN MESSAGE HANDLER
// ============================================

/**
 * Main message handler - routes to appropriate handler
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  try {
    let response: WorkerResponse;

    switch (message.type) {
      case 'UPDATE_BKT':
        response = handleUpdateBKT(message);
        break;

      case 'SCHEDULE_REVIEW':
        response = handleScheduleReview(message);
        break;

      case 'BATCH_UPDATE':
        response = handleBatchUpdate(message);
        break;

      default:
        response = {
          type: 'ERROR',
          id: (message as { id: string }).id,
          error: `Unknown message type: ${(message as { type: string }).type}`,
        };
    }

    self.postMessage(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      type: 'ERROR',
      id: message.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(errorResponse);
  }
};

// Export empty object to make this a module
export {};
