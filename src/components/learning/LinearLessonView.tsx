'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Import atom components
import { VideoAtom } from '@/components/learning/VideoAtom';
import { ReadingAtom } from '@/components/learning/ReadingAtom';
import { QuizAtom } from '@/components/learning/QuizAtom';
import { PracticeAtom } from '@/components/learning/PracticeAtom';

import type { Atom, VideoContent, ReadingContent, QuizContent, PracticeContent, Lesson } from '@/types';

// ============================================
// TYPES
// ============================================

interface LinearLessonViewProps {
  lesson: Lesson;
  atoms: Atom[];
  onAtomComplete: (xp: number) => void;
  onLessonComplete: () => void;
  isCompletingLesson?: boolean;
  className?: string;
}

// ============================================
// LINEAR LESSON VIEW COMPONENT
// ============================================

/**
 * LinearLessonView - Displays atoms in linear sequence with prev/next navigation.
 *
 * This is the traditional lesson view used as a fallback when adaptive mode
 * is not active or not available. It provides simple sequential navigation
 * through lesson atoms.
 */
export function LinearLessonView({
  lesson: _lesson,
  atoms,
  onAtomComplete,
  onLessonComplete,
  isCompletingLesson = false,
  className,
}: LinearLessonViewProps) {
  const [currentAtomIndex, setCurrentAtomIndex] = useState(0);

  const currentAtom = atoms[currentAtomIndex];

  // Navigation functions
  const goToNextAtom = () => {
    if (currentAtomIndex < atoms.length - 1) {
      setCurrentAtomIndex(currentAtomIndex + 1);
    }
  };

  const goToPreviousAtom = () => {
    if (currentAtomIndex > 0) {
      setCurrentAtomIndex(currentAtomIndex - 1);
    }
  };

  // Render atom based on type
  const renderAtom = () => {
    switch (currentAtom.type) {
      case 'video':
        return (
          <VideoAtom
            atom={currentAtom as Atom & { type: 'video'; content: VideoContent }}
            onComplete={() => onAtomComplete(15)}
          />
        );
      case 'reading':
        return (
          <ReadingAtom
            atom={currentAtom as Atom & { type: 'reading'; content: ReadingContent }}
            onComplete={() => onAtomComplete(10)}
          />
        );
      case 'quiz':
        return (
          <QuizAtom
            atom={currentAtom as Atom & { type: 'quiz'; content: QuizContent }}
            onComplete={() => onAtomComplete(25)}
          />
        );
      case 'practice':
        return (
          <PracticeAtom
            atom={currentAtom as Atom & { type: 'practice'; content: PracticeContent }}
            onComplete={() => onAtomComplete(20)}
          />
        );
      default:
        return <div>Unknown atom type</div>;
    }
  };

  return (
    <div className={className}>
      {/* Atom Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAtom.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderAtom()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-light-grey">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft size={18} />}
          onClick={goToPreviousAtom}
          disabled={currentAtomIndex === 0}
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {currentAtomIndex < atoms.length - 1 ? (
          <Button
            rightIcon={<ArrowRight size={18} />}
            onClick={goToNextAtom}
          >
            <span className="hidden sm:inline">Next</span>
          </Button>
        ) : (
          <Button
            variant="celebration"
            rightIcon={<CheckCircle size={18} />}
            onClick={onLessonComplete}
            disabled={isCompletingLesson}
          >
            {isCompletingLesson ? 'Completing...' : 'Complete Lesson'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Export progress calculation helper
export function getLinearProgress(currentIndex: number, totalAtoms: number): number {
  return ((currentIndex + 1) / totalAtoms) * 100;
}

export default LinearLessonView;
