'use client';

import { VideoAtom } from './VideoAtom';
import { ReadingAtom } from './ReadingAtom';
import { QuizAtom } from './QuizAtom';
import { PracticeAtom } from './PracticeAtom';
import type { Atom } from '@/types';

type AtomContainerProps = {
  atom: Atom;
  onComplete: (xpEarned?: number) => void;
  isLoading?: boolean;
  coachAvailable?: boolean;
};

/**
 * AtomContainer routes to the correct atom component based on atom type
 * Provides a unified interface for rendering learning atoms
 */
export function AtomContainer({
  atom,
  onComplete,
  isLoading = false,
  coachAvailable = true,
}: AtomContainerProps) {
  // Type assertion is safe here because atom.type is used as discriminator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedAtom = atom as any;

  switch (atom.type) {
    case 'video':
      return (
        <VideoAtom
          atom={typedAtom}
          onComplete={onComplete}
          isLoading={isLoading}
        />
      );

    case 'reading':
      return (
        <ReadingAtom
          atom={typedAtom}
          onComplete={onComplete}
          isLoading={isLoading}
        />
      );

    case 'quiz':
      return (
        <QuizAtom
          atom={typedAtom}
          onComplete={onComplete}
        />
      );

    case 'practice':
      return (
        <PracticeAtom
          atom={typedAtom}
          onComplete={onComplete}
          coachAvailable={coachAvailable}
        />
      );

    default:
      return (
        <div className="flex items-center justify-center p-8 text-navy">
          <p>Unknown atom type: {atom.type}</p>
        </div>
      );
  }
}
