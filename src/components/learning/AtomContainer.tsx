'use client';

import { VideoAtom } from './VideoAtom';
import { ReadingAtom } from './ReadingAtom';
import { QuizAtom } from './QuizAtom';
import { PracticeAtom } from './PracticeAtom';
import type { Atom, VideoContent, ReadingContent, QuizContent, PracticeContent } from '@/types';

/** Video atom with properly typed content */
type VideoAtomType = Atom & { type: 'video'; content: VideoContent };

/** Reading atom with properly typed content */
type ReadingAtomType = Atom & { type: 'reading'; content: ReadingContent };

/** Quiz atom with properly typed content */
type QuizAtomType = Atom & { type: 'quiz'; content: QuizContent };

/** Practice atom with properly typed content */
type PracticeAtomType = Atom & { type: 'practice'; content: PracticeContent };

type AtomContainerProps = {
  atom: Atom;
  onComplete: (xpEarned?: number) => void;
  isLoading?: boolean;
  coachAvailable?: boolean;
};

/**
 * Type guard to check if atom is a video atom
 */
function isVideoAtom(atom: Atom): atom is VideoAtomType {
  return atom.type === 'video';
}

/**
 * Type guard to check if atom is a reading atom
 */
function isReadingAtom(atom: Atom): atom is ReadingAtomType {
  return atom.type === 'reading';
}

/**
 * Type guard to check if atom is a quiz atom
 */
function isQuizAtom(atom: Atom): atom is QuizAtomType {
  return atom.type === 'quiz';
}

/**
 * Type guard to check if atom is a practice atom
 */
function isPracticeAtom(atom: Atom): atom is PracticeAtomType {
  return atom.type === 'practice';
}

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
  if (isVideoAtom(atom)) {
    return (
      <VideoAtom
        atom={atom}
        onComplete={onComplete}
        isLoading={isLoading}
      />
    );
  }

  if (isReadingAtom(atom)) {
    return (
      <ReadingAtom
        atom={atom}
        onComplete={onComplete}
        isLoading={isLoading}
      />
    );
  }

  if (isQuizAtom(atom)) {
    return (
      <QuizAtom
        atom={atom}
        onComplete={onComplete}
      />
    );
  }

  if (isPracticeAtom(atom)) {
    return (
      <PracticeAtom
        atom={atom}
        onComplete={onComplete}
        coachAvailable={coachAvailable}
      />
    );
  }

  return (
    <div className="flex items-center justify-center p-8 text-navy">
      <p>Unknown atom type: {atom.type}</p>
    </div>
  );
}
