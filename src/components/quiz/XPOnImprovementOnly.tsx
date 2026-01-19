/**
 * XP On Improvement Only Component
 * Phase 3.3: Quiz System - Award XP only when score improves
 *
 * Tracks quiz attempts and calculates XP based on improvement
 */

'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Award, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';

type QuizAttempt = {
  attemptNumber: number;
  score: number;
  timestamp: Date;
  xpEarned: number;
};

type XPCalculationResult = {
  currentScore: number;
  previousBestScore: number;
  improvement: number;
  xpEarned: number;
  reason: 'first_attempt' | 'improvement' | 'no_improvement' | 'decline';
  message: string;
};

/**
 * Calculate XP for quiz attempt - only award on improvement
 */
export function calculateQuizXP(
  currentScore: number,
  previousAttempts: QuizAttempt[]
): XPCalculationResult {
  const baseQuizXP = 15; // From constants/gamification.ts

  // First attempt always earns XP
  if (previousAttempts.length === 0) {
    const xp = Math.round(baseQuizXP * (currentScore / 100));

    return {
      currentScore,
      previousBestScore: 0,
      improvement: currentScore,
      xpEarned: xp,
      reason: 'first_attempt',
      message: `First attempt! You earned ${xp} XP for ${currentScore}% score.`,
    };
  }

  // Find previous best score
  const previousBestScore = Math.max(...previousAttempts.map((a) => a.score));

  // Calculate improvement
  const improvement = currentScore - previousBestScore;

  if (improvement > 0) {
    // Earned XP! Award based on improvement percentage
    const xp = Math.round(baseQuizXP * (improvement / 100));

    return {
      currentScore,
      previousBestScore,
      improvement,
      xpEarned: xp,
      reason: 'improvement',
      message: `Great! You improved from ${previousBestScore}% to ${currentScore}% (+${improvement}%). Earned ${xp} XP!`,
    };
  } else if (improvement === 0) {
    // Same score, no XP
    return {
      currentScore,
      previousBestScore,
      improvement: 0,
      xpEarned: 0,
      reason: 'no_improvement',
      message: `You matched your previous best of ${currentScore}%. No XP this time, but great consistency!`,
    };
  } else {
    // Score declined, no XP
    return {
      currentScore,
      previousBestScore,
      improvement,
      xpEarned: 0,
      reason: 'decline',
      message: `Your score was ${currentScore}% (previous best: ${previousBestScore}%). Keep practicing to improve!`,
    };
  }
}

/**
 * Quiz Improvement Visualization
 * Shows score progression across attempts
 */
export function QuizImprovementDisplay({
  attempts,
  currentScore: _currentScore,
  xpResult,
}: {
  attempts: QuizAttempt[];
  currentScore: number;
  xpResult: XPCalculationResult;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-6 h-6 text-teal" />
        <h3 className="text-lg font-semibold text-navy">Your Progress</h3>
      </div>

      {/* Score Comparison */}
      {xpResult.previousBestScore > 0 && (
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center flex-1">
            <p className="text-xs text-gray-600 mb-1">Previous Best</p>
            <p className="text-2xl font-bold text-gray-700">{xpResult.previousBestScore}%</p>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0 mx-4"
          >
            <TrendingUp
              className={`w-8 h-8 ${xpResult.improvement > 0 ? 'text-green' : 'text-gray-400'}`}
            />
          </motion.div>

          <div className="text-center flex-1">
            <p className="text-xs text-gray-600 mb-1">Current Score</p>
            <p className="text-2xl font-bold text-teal">{xpResult.currentScore}%</p>
          </div>
        </div>
      )}

      {/* XP Award Message */}
      <div
        className={`p-4 rounded-lg ${
          xpResult.xpEarned > 0
            ? 'bg-teal/10 border-2 border-teal/30'
            : 'bg-gray-50 border border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {xpResult.xpEarned > 0 ? (
            <Award className="w-5 h-5 text-teal mt-0.5" />
          ) : (
            <RotateCcw className="w-5 h-5 text-gray-500 mt-0.5" />
          )}
          <div>
            <p className="text-sm text-gray-700">{xpResult.message}</p>

            {xpResult.improvement > 0 && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-teal mt-2 font-semibold"
              >
                Improvement: +{xpResult.improvement} percentage points
              </motion.p>
            )}
          </div>
        </div>
      </div>

      {/* Attempt History */}
      {attempts.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-600 mb-2">Attempt History:</p>
          <div className="space-y-1">
            {attempts.slice(-5).map((attempt, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs text-gray-600 py-1"
              >
                <span>
                  Attempt {attempt.attemptNumber}: {attempt.score}%
                </span>
                <span className="text-teal">{attempt.xpEarned > 0 ? `+${attempt.xpEarned} XP` : '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement for Retakes */}
      {xpResult.improvement <= 0 && (
        <p className="text-xs text-gray-500 mt-4 italic">
          Tip: Review the material and try again. You&apos;ll earn XP when you improve your score!
        </p>
      )}
    </Card>
  );
}
