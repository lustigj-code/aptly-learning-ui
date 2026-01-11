/**
 * useAdaptiveContent Hook
 *
 * Loads actual lesson content based on a session item from the sequencer.
 * Bridges the gap between sequencer recommendations and displayable content.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLessonById, getModuleByLessonId } from '@/data/aiAtWorkCourse';
import { parseSequencerItemId, type ContentType } from '@/lib/adaptive/idResolver';
import type { Lesson, Atom, Module } from '@/types';

export interface SessionItem {
  type: 'review' | 'learn' | 'practice' | 'quiz' | 'warmup' | 'cooldown';
  itemId: string;
  skillId: string;
  estimatedMinutes: number;
  reason: string;
}

export interface AdaptiveContent {
  contentType: ContentType;
  lesson: Lesson | null;
  module: Module | null;
  atoms: Atom[];
  currentAtomIndex: number;
  skillId: string;
  isLoading: boolean;
  error: string | null;
}

export interface UseAdaptiveContentReturn extends AdaptiveContent {
  setCurrentAtomIndex: (index: number) => void;
  nextAtom: () => boolean; // returns true if there's a next atom
  previousAtom: () => boolean; // returns true if there's a previous atom
  currentAtom: Atom | null;
  isLastAtom: boolean;
  isFirstAtom: boolean;
  progress: number; // 0-100
}

export function useAdaptiveContent(sessionItem: SessionItem | null): UseAdaptiveContentReturn {
  const [content, setContent] = useState<AdaptiveContent>({
    contentType: 'lesson',
    lesson: null,
    module: null,
    atoms: [],
    currentAtomIndex: 0,
    skillId: '',
    isLoading: true,
    error: null,
  });

  // Load content when session item changes
  useEffect(() => {
    if (!sessionItem) {
      setContent(prev => ({
        ...prev,
        isLoading: false,
        error: 'No session item provided',
      }));
      return;
    }

    setContent(prev => ({ ...prev, isLoading: true, error: null }));

    const parsed = parseSequencerItemId(sessionItem.itemId);

    if (parsed.type === 'lesson' && parsed.lessonId) {
      // Load lesson content
      const lesson = getLessonById(parsed.lessonId);

      if (lesson) {
        const module = getModuleByLessonId(parsed.lessonId);
        setContent({
          contentType: 'lesson',
          lesson,
          module: module || null,
          atoms: lesson.atoms || [],
          currentAtomIndex: 0,
          skillId: sessionItem.skillId,
          isLoading: false,
          error: null,
        });
      } else {
        setContent(prev => ({
          ...prev,
          isLoading: false,
          error: `Lesson ${parsed.lessonId} not found`,
        }));
      }
    } else if (parsed.type === 'quiz') {
      // For quiz items, load the lesson that contains the quiz
      const lesson = parsed.lessonId ? getLessonById(parsed.lessonId) || null : null;
      const quizAtoms = lesson?.atoms.filter(a => a.type === 'quiz') || [];

      setContent({
        contentType: 'quiz',
        lesson,
        module: lesson ? getModuleByLessonId(parsed.lessonId) || null : null,
        atoms: quizAtoms,
        currentAtomIndex: 0,
        skillId: parsed.skillId || sessionItem.skillId,
        isLoading: false,
        error: quizAtoms.length === 0 ? 'No quiz found for this skill' : null,
      });
    } else if (parsed.type === 'practice') {
      // Practice items - for now, show as a placeholder
      // TODO: Generate practice content from skill
      setContent({
        contentType: 'practice',
        lesson: null,
        module: null,
        atoms: [],
        currentAtomIndex: 0,
        skillId: parsed.skillId || sessionItem.skillId,
        isLoading: false,
        error: null,
      });
    } else if (parsed.type === 'review') {
      // Review items - similar to practice
      // TODO: Load review content for the skill
      setContent({
        contentType: 'review',
        lesson: null,
        module: null,
        atoms: [],
        currentAtomIndex: 0,
        skillId: parsed.skillId || sessionItem.skillId,
        isLoading: false,
        error: null,
      });
    }
  }, [sessionItem?.itemId, sessionItem?.skillId]);

  // Navigation functions
  const setCurrentAtomIndex = useCallback((index: number) => {
    setContent(prev => ({
      ...prev,
      currentAtomIndex: Math.max(0, Math.min(index, prev.atoms.length - 1)),
    }));
  }, []);

  const nextAtom = useCallback(() => {
    if (content.currentAtomIndex < content.atoms.length - 1) {
      setContent(prev => ({
        ...prev,
        currentAtomIndex: prev.currentAtomIndex + 1,
      }));
      return true;
    }
    return false;
  }, [content.currentAtomIndex, content.atoms.length]);

  const previousAtom = useCallback(() => {
    if (content.currentAtomIndex > 0) {
      setContent(prev => ({
        ...prev,
        currentAtomIndex: prev.currentAtomIndex - 1,
      }));
      return true;
    }
    return false;
  }, [content.currentAtomIndex]);

  // Computed values
  const currentAtom = content.atoms[content.currentAtomIndex] || null;
  const isLastAtom = content.currentAtomIndex === content.atoms.length - 1;
  const isFirstAtom = content.currentAtomIndex === 0;
  const progress = content.atoms.length > 0
    ? Math.round(((content.currentAtomIndex + 1) / content.atoms.length) * 100)
    : 0;

  return {
    ...content,
    setCurrentAtomIndex,
    nextAtom,
    previousAtom,
    currentAtom,
    isLastAtom,
    isFirstAtom,
    progress,
  };
}
