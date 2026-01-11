'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  detectStruggle,
  recommendIntervention,
  shouldTriggerIntervention,
  trackAttempt,
  type StruggleSignals,
  type Intervention,
  type AttemptHistory,
} from '@/lib/adaptive/struggleDetection';

export type CoachTrigger =
  | 'wrong_answers'      // After consecutive wrong answers
  | 'time_on_content'    // After too long on same content
  | 'before_quiz'        // Before starting a quiz
  | 'after_completion'   // After completing difficult section
  | 'welcome'            // First time on lesson
  | 'stuck'              // General stuck detection
  | 'struggle_detected'  // New: Detected via struggle detection system
  | 'prerequisite_weak'  // New: Weak prerequisite detected
  | 'mastery_stalling';  // New: Mastery not improving

export type ProactivePrompt = {
  trigger: CoachTrigger;
  message: string;
  suggestedAction?: string;
  isVisible: boolean;
  intervention?: Intervention; // New: Associated intervention if triggered by struggle detection
};

type ProactiveCoachOptions = {
  atomId: string;
  atomType: 'video' | 'reading' | 'quiz' | 'practice';
  skillId?: string; // New: Optional skill ID for struggle tracking
  onPromptDismiss?: () => void;
  onInterventionAccept?: (intervention: Intervention) => void; // New: Callback when intervention accepted
};

export function useProactiveCoach({
  atomId,
  atomType,
  skillId,
  onPromptDismiss,
  onInterventionAccept,
}: ProactiveCoachOptions) {
  const [prompt, setPrompt] = useState<ProactivePrompt | null>(null);
  const [wrongAnswerCount, setWrongAnswerCount] = useState(0);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [currentStruggle, setCurrentStruggle] = useState<StruggleSignals | null>(null);

  const timeOnContentRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAtomIdRef = useRef(atomId);
  const attemptHistoryRef = useRef<AttemptHistory[]>([]);

  // Reset state when atom changes
  useEffect(() => {
    if (lastAtomIdRef.current !== atomId) {
      setWrongAnswerCount(0);
      timeOnContentRef.current = 0;
      lastAtomIdRef.current = atomId;

      // Show welcome/ready prompt for quizzes
      if (atomType === 'quiz' && !hasShownWelcome) {
        setTimeout(() => {
          showPrompt({
            trigger: 'before_quiz',
            message: "Ready for a quick check? Take your time - I'm here if you need help.",
            suggestedAction: 'Ask for a hint',
          });
        }, 500);
        setHasShownWelcome(true);
      }
    }
  }, [atomId, atomType, hasShownWelcome]);

  // Track time on content (for reading and video atoms)
  useEffect(() => {
    if (atomType === 'reading' || atomType === 'video') {
      timerRef.current = setInterval(() => {
        timeOnContentRef.current += 1;

        // After 3 minutes (180 seconds) on the same content
        if (timeOnContentRef.current === 180 && !prompt) {
          showPrompt({
            trigger: 'time_on_content',
            message: "Taking your time is great! Would you like me to explain any part differently?",
            suggestedAction: 'Explain this differently',
          });
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [atomType, prompt]);

  const showPrompt = useCallback((newPrompt: Omit<ProactivePrompt, 'isVisible'>) => {
    setPrompt({ ...newPrompt, isVisible: true });
  }, []);

  const dismissPrompt = useCallback(() => {
    setPrompt(prev => prev ? { ...prev, isVisible: false } : null);
    onPromptDismiss?.();

    // Clear after animation
    setTimeout(() => setPrompt(null), 300);
  }, [onPromptDismiss]);

  // Called when user gets a wrong answer in quiz
  const recordWrongAnswer = useCallback((timeSpentSeconds: number = 30) => {
    const newCount = wrongAnswerCount + 1;
    setWrongAnswerCount(newCount);

    // Track attempt for struggle detection (if skillId provided)
    if (skillId) {
      const attempt = trackAttempt('user', skillId, false, timeSpentSeconds, false, false);
      attemptHistoryRef.current = [...attemptHistoryRef.current.slice(-19), attempt];

      // Check for struggle using the detection system
      const struggle = detectStruggle('user', skillId, attemptHistoryRef.current);
      setCurrentStruggle(struggle);

      if (shouldTriggerIntervention(struggle)) {
        const intervention = recommendIntervention(struggle);
        showPrompt({
          trigger: 'struggle_detected',
          message: intervention.reason,
          suggestedAction: getInterventionAction(intervention),
          intervention,
        });
        return;
      }
    }

    // Fallback to original behavior
    if (newCount >= 2 && !prompt) {
      showPrompt({
        trigger: 'wrong_answers',
        message: "That's okay - this is a tricky one! Need a hint?",
        suggestedAction: 'Get a hint',
      });
    }
  }, [wrongAnswerCount, prompt, showPrompt, skillId]);

  // Called when user gets a correct answer
  const recordCorrectAnswer = useCallback((timeSpentSeconds: number = 30) => {
    setWrongAnswerCount(0); // Reset streak

    // Track attempt for struggle detection
    if (skillId) {
      const attempt = trackAttempt('user', skillId, true, timeSpentSeconds, false, false);
      attemptHistoryRef.current = [...attemptHistoryRef.current.slice(-19), attempt];
    }
  }, [skillId]);

  // Accept an intervention (new)
  const acceptIntervention = useCallback(() => {
    if (prompt?.intervention) {
      onInterventionAccept?.(prompt.intervention);
    }
    dismissPrompt();
  }, [prompt, onInterventionAccept, dismissPrompt]);

  // Get action text for intervention
  const getInterventionAction = (intervention: Intervention): string => {
    switch (intervention.type) {
      case 'alternative_explanation':
        return 'Show different explanation';
      case 'prerequisite_review':
        return 'Review basics first';
      case 'simpler_practice':
        return 'Try easier questions';
      case 'coach_session':
        return 'Talk to Sage';
      case 'break_suggestion':
        return 'Take a break';
      case 'skip_for_now':
        return 'Skip for now';
      default:
        return 'Get help';
    }
  };

  // Called when user completes a difficult section
  const recordCompletion = useCallback((wasDifficult: boolean = false) => {
    if (wasDifficult && !prompt) {
      setTimeout(() => {
        showPrompt({
          trigger: 'after_completion',
          message: "Great work on that section! Any questions before we move on?",
          suggestedAction: 'I have a question',
        });
      }, 1000);
    }
  }, [prompt, showPrompt]);

  // Get message based on trigger type
  const getPromptMessage = (trigger: CoachTrigger): string => {
    const messages: Record<CoachTrigger, string[]> = {
      wrong_answers: [
        "That's okay - this is a tricky one! Need a hint?",
        "Don't worry, you're learning! Want me to explain this concept?",
        "Almost there! Would you like some help with this?",
      ],
      time_on_content: [
        "Taking your time is great! Would you like me to explain any part differently?",
        "Still working through this? I can break it down if that helps.",
        "Need a different perspective on this topic?",
      ],
      before_quiz: [
        "Ready for a quick check? Take your time - I'm here if you need help.",
        "Let's see what you've learned! Remember, I can help if you get stuck.",
        "Quiz time! Don't worry - you can always ask me for hints.",
      ],
      after_completion: [
        "Great work on that section! Any questions before we move on?",
        "Well done! Anything you'd like me to clarify?",
        "Nice job! Ready to continue or want to review anything?",
      ],
      welcome: [
        "Hi there! I'm your learning coach. Ask me anything as you work through this lesson.",
      ],
      stuck: [
        "Looks like you might be stuck. Can I help with anything?",
        "Need some guidance? I'm here to help!",
      ],
      struggle_detected: [
        "I noticed you're having some trouble with this concept. Want me to explain it differently?",
        "Let's try a different approach to this topic. Would that help?",
        "This can be tricky! Let me offer some additional support.",
      ],
      prerequisite_weak: [
        "It looks like reviewing a foundational concept might help here. Want me to walk you through it?",
        "Let's reinforce some background knowledge that will make this easier.",
        "A quick review of some basics could really help here. Interested?",
      ],
      mastery_stalling: [
        "Let's try some different practice to help solidify this concept.",
        "I have some alternative examples that might help things click.",
        "Sometimes a fresh perspective helps! Want to try a different approach?",
      ],
    };

    const options = messages[trigger];
    return options[Math.floor(Math.random() * options.length)];
  };

  return {
    prompt,
    showPrompt,
    dismissPrompt,
    recordWrongAnswer,
    recordCorrectAnswer,
    recordCompletion,
    acceptIntervention,
    getPromptMessage,
    // New exports for struggle detection
    currentStruggle,
    attemptHistory: attemptHistoryRef.current,
  };
}

// Export types for external use
export type { StruggleSignals, Intervention, AttemptHistory };
