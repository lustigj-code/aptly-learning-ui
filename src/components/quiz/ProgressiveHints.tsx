/**
 * Progressive Hints Component
 * Phase 3.3: Quiz System Overhaul - Progressive hint disclosure
 *
 * Shows hints in stages: subtle → moderate → strong → full explanation
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type ProgressiveHintsProps = {
  hints: string[];
  explanation: string;
  onHintViewed?: (hintLevel: number) => void;
};

export function ProgressiveHints({ hints, explanation, onHintViewed }: ProgressiveHintsProps) {
  const [currentHintLevel, setCurrentHintLevel] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const showNextHint = () => {
    const nextLevel = currentHintLevel + 1;
    setCurrentHintLevel(nextLevel);
    onHintViewed?.(nextLevel);
  };

  const revealExplanation = () => {
    setShowExplanation(true);
    onHintViewed?.(-1); // -1 indicates full explanation viewed
  };

  const hasMoreHints = currentHintLevel < hints.length;

  return (
    <div className="space-y-3">
      {/* Hint Progression */}
      <AnimatePresence>
        {hints.slice(0, currentHintLevel).map((hint, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-4 bg-light-blue/10 border-blue/30">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy mb-1">Hint {index + 1}:</p>
                  <p className="text-sm text-gray-700">{hint}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {hasMoreHints && !showExplanation && (
          <Button
            variant="secondary"
            size="sm"
            onClick={showNextHint}
            className="flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            Show Hint {currentHintLevel + 1}
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}

        {currentHintLevel > 0 && !showExplanation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={revealExplanation}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Show Full Explanation
          </Button>
        )}
      </div>

      {/* Full Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 bg-teal/10 border-teal/30">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-teal mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy mb-2">Explanation:</p>
                  <p className="text-sm text-gray-700">{explanation}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint Usage Feedback */}
      {currentHintLevel > 0 && (
        <p className="text-xs text-gray-500">
          {currentHintLevel === hints.length
            ? 'You viewed all hints. That\'s okay - learning is about understanding, not memorizing!'
            : `Hint ${currentHintLevel} of ${hints.length} revealed. Try solving with what you know so far.`}
        </p>
      )}
    </div>
  );
}

/**
 * Hint System Wrapper for Quiz Questions
 * Integrates progressive hints into quiz interface
 */
export function QuizHintSystem({
  hints,
  explanation,
  hasAnswered,
  isCorrect,
}: {
  hints: string[];
  explanation: string;
  hasAnswered: boolean;
  isCorrect: boolean;
}) {
  if (hasAnswered) {
    // After answering, always show explanation
    return (
      <Card className={`p-4 ${isCorrect ? 'bg-green/10 border-green/30' : 'bg-red/10 border-red/30'}`}>
        <div className="flex items-start gap-3">
          <Eye className={`w-5 h-5 mt-0.5 ${isCorrect ? 'text-green' : 'text-red'}`} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy mb-2">
              {isCorrect ? 'Correct!' : 'Not quite. Here\'s why:'}
            </p>
            <p className="text-sm text-gray-700">{explanation}</p>
          </div>
        </div>
      </Card>
    );
  }

  // Before answering, show progressive hints
  return <ProgressiveHints hints={hints} explanation={explanation} />;
}
