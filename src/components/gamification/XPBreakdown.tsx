/**
 * XP Breakdown Component
 * Phase 4.3: XP & Progression Transparency
 *
 * Shows detailed breakdown of XP earned with all bonuses
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Award, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

type XPBreakdownProps = {
  baseXP: number;
  streakBonus?: number;
  speedBonus?: number;
  perfectBonus?: number;
  breakdown: string[];
  totalXP: number;
  streakDays?: number;
  timeSpentSeconds?: number;
};

export function XPBreakdown({
  baseXP,
  streakBonus = 0,
  speedBonus = 0,
  perfectBonus = 0,
  breakdown,
  totalXP,
  streakDays,
  timeSpentSeconds,
}: XPBreakdownProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-teal/5 to-light-blue/5">
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-6 h-6 text-teal" />
        <h3 className="text-lg font-semibold text-navy">XP Breakdown</h3>
      </div>

      <div className="space-y-3">
        {/* Base XP */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between py-2 border-b border-gray-200"
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Base XP</span>
          </div>
          <span className="font-semibold text-navy">{baseXP} XP</span>
        </motion.div>

        {/* Streak Bonus */}
        {streakBonus > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between py-2 border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange" />
              <span className="text-sm text-gray-700">
                Streak Bonus
                {streakDays && <span className="text-xs text-gray-500 ml-1">({streakDays} days)</span>}
              </span>
            </div>
            <span className="font-semibold text-orange">+{streakBonus} XP</span>
          </motion.div>
        )}

        {/* Perfect Score Bonus */}
        {perfectBonus > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between py-2 border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple" />
              <span className="text-sm text-gray-700">Perfect Score</span>
            </div>
            <span className="font-semibold text-purple">+{perfectBonus} XP</span>
          </motion.div>
        )}

        {/* Speed Bonus */}
        {speedBonus > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between py-2 border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue" />
              <span className="text-sm text-gray-700">
                Speed Bonus
                {timeSpentSeconds && (
                  <span className="text-xs text-gray-500 ml-1">({timeSpentSeconds}s)</span>
                )}
              </span>
            </div>
            <span className="font-semibold text-blue">+{speedBonus} XP</span>
          </motion.div>
        )}

        {/* Total */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between py-3 mt-2 bg-teal/10 rounded-lg px-4"
        >
          <span className="text-base font-semibold text-navy">Total XP Earned</span>
          <span className="text-2xl font-bold text-teal">{totalXP} XP</span>
        </motion.div>
      </div>

      {/* Breakdown text for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        You earned {totalXP} XP: {breakdown.join(', ')}
      </div>
    </Card>
  );
}

/**
 * Compact XP Breakdown for inline display
 */
export function XPBreakdownCompact({
  totalXP,
  breakdown,
}: {
  totalXP: number;
  breakdown: string[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="text-sm text-teal hover:text-teal-dark underline decoration-dotted"
        aria-label="Show XP breakdown"
      >
        {totalXP} XP
      </button>

      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-10 bottom-full left-0 mb-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 w-64"
        >
          <p className="text-xs font-semibold text-navy mb-2">XP Breakdown:</p>
          <ul className="text-xs text-gray-700 space-y-1">
            {breakdown.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
