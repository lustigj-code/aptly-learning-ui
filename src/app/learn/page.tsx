'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  CheckCircle,
  X,
  BookOpen,
  Brain,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonLearnPage } from '@/components/ui/Skeleton';
import { FloatingXP } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/layout/Header';
import { CoachChat } from '@/components/coach/CoachChat';
import { ProactivePrompt } from '@/components/coach/ProactivePrompt';

// Import proper learning components
import { VideoAtom } from '@/components/learning/VideoAtom';
import { ReadingAtom } from '@/components/learning/ReadingAtom';
import { QuizAtom } from '@/components/learning/QuizAtom';
import { PracticeAtom } from '@/components/learning/PracticeAtom';
import { ReviewTab } from '@/components/learning/ReviewTab';
import AdaptiveSessionView, {
  AdaptiveReasoningBanner,
  PretestOffer,
  SkipSuccessMessage,
} from '@/components/learning/AdaptiveSessionView';
import type { LearningSession, SessionItem } from '@/lib/adaptive/sessionBuilder';

import { useUser } from '@/store/unifiedStore';
import { useProactiveCoach, type Intervention } from '@/hooks/useProactiveCoach';
import { post, get } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import { COURSES, COURSE_1_MODULE_1, COURSE_3_MODULE_1 } from '@/data/mockData';
import { checkAndGetNewBadges } from '@/lib/api/badgeApi';
import { useAdaptiveContent } from '@/hooks/useAdaptiveContent';
import { CompletionOverlay } from '@/components/learning/CompletionOverlay';
import { getLessonById } from '@/data/aiAtWorkCourse';
import { cn } from '@/lib/utils';
import { MasteryGate } from '@/components/mastery/MasteryGate';
import {
  getPrerequisitesForLesson,
  areLessonPrerequisitesMet,
  getConceptsForLesson,
} from '@/data/courseToConceptMap';
import { getSkillsForLesson, getSkillName } from '@/data/skillMap';
import type { ConceptId } from '@/lib/mastery/knowledgeGraph';
import type { Atom, VideoContent, ReadingContent, QuizContent, PracticeContent } from '@/types';

type ActiveTab = 'learn' | 'review' | 'adaptive';

export default function LearnPage() {
  const router = useRouter();
  const {
    user,
    addXP,
    completeAtom,
    completeLesson,
    checkAndUpdateStreak,
    earnBadge
  } = useUser();
  const toast = useToast();

  // Get the current module based on user's progress
  const getCurrentModule = () => {
    if (!user) return COURSE_1_MODULE_1;

    const currentCourseId = user.progress?.currentCourseId || 'course-1';

    // Select the right module based on current course
    if (currentCourseId === 'course-1') {
      return COURSE_1_MODULE_1;
    } else if (currentCourseId === 'course-3') {
      return COURSE_3_MODULE_1;
    }

    // Default to Course 1 for new users
    return COURSE_1_MODULE_1;
  };

  const currentModule = getCurrentModule();

  // Get current lesson based on user's progress, or first lesson if new
  const getCurrentLesson = () => {
    if (!user) return currentModule.lessons[0];

    const currentLessonId = user.progress?.currentLessonId || 'c1-m1-l1';
    const foundLesson = currentModule.lessons.find(l => l.id === currentLessonId);

    // Return found lesson or first lesson in module
    return foundLesson || currentModule.lessons[0];
  };

  const lesson = getCurrentLesson();
  const atoms = lesson.atoms;

  const [currentAtomIndex, setCurrentAtomIndex] = useState(0);
  const [showCoachPanel, setShowCoachPanel] = useState(false);
  const [showFloatingXP, setShowFloatingXP] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('learn');
  const [reviewDueCount, setReviewDueCount] = useState(0);
  const [masteryLevels, setMasteryLevels] = useState<Record<ConceptId, number>>({});
  const [isCheckingPrereqs, setIsCheckingPrereqs] = useState(true);

  // Adaptive learning state
  const [showPretestOffer, setShowPretestOffer] = useState(false);
  const [pretestSkipped, setPretestSkipped] = useState(false);
  const [adaptiveReason, setAdaptiveReason] = useState<string | null>(null);

  // Session-based adaptive flow state
  const [learningMode, setLearningMode] = useState<'adaptive' | 'linear'>('adaptive');
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);
  const [sessionItemIndex, setSessionItemIndex] = useState(0);

  // Completion overlay state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionXP, setCompletionXP] = useState(0);

  // Get current session item for adaptive content loading
  const currentSessionItem: SessionItem | null = activeSession?.items[sessionItemIndex] || null;

  // Load content based on current session item
  const adaptiveContent = useAdaptiveContent(currentSessionItem);

  const currentAtom = atoms[currentAtomIndex];
  const progress = ((currentAtomIndex + 1) / atoms.length) * 100;

  // Get primary skill for current lesson (for struggle tracking)
  const lessonSkills = getSkillsForLesson(lesson.id);
  const currentSkillId = lessonSkills[0] || '';

  // Map atom type for proactive coach (handle all types)
  const coachAtomType = (['video', 'reading', 'quiz', 'practice'] as const).includes(
    currentAtom.type as 'video' | 'reading' | 'quiz' | 'practice'
  ) ? currentAtom.type as 'video' | 'reading' | 'quiz' | 'practice' : 'reading';

  // Proactive coach hook with struggle detection
  const {
    prompt: coachPrompt,
    dismissPrompt,
    recordWrongAnswer,
    recordCorrectAnswer,
    acceptIntervention,
  } = useProactiveCoach({
    atomId: currentAtom.id,
    atomType: coachAtomType,
    skillId: currentSkillId,
    onInterventionAccept: handleInterventionAccept,
  });

  // Handle intervention acceptance from proactive coach
  function handleInterventionAccept(intervention: Intervention) {
    console.log('[LearnPage] Intervention accepted:', intervention.type);

    switch (intervention.type) {
      case 'alternative_explanation':
        // Show coach panel with context
        setShowCoachPanel(true);
        break;
      case 'prerequisite_review':
        // Switch to review tab
        setActiveTab('review');
        break;
      case 'simpler_practice':
        // Could load simpler content variant here
        toast.info('Simpler practice', 'Loading easier questions...');
        break;
      case 'coach_session':
        setShowCoachPanel(true);
        break;
      case 'break_suggestion':
        toast.info('Take a break', 'A short break can help concepts click!');
        break;
    }
  }

  // Check if prerequisites are met for current lesson
  const prerequisitesMet = areLessonPrerequisitesMet(lesson.id, masteryLevels);

  // Fetch mastery levels for prerequisite checking
  const fetchMasteryLevels = useCallback(async () => {
    if (!user?.id) {
      setIsCheckingPrereqs(false);
      return;
    }

    setIsCheckingPrereqs(true);
    try {
      // Get all prerequisite concepts for this lesson
      const prereqs = getPrerequisitesForLesson(lesson.id);

      if (prereqs.length === 0) {
        // No prerequisites needed
        setIsCheckingPrereqs(false);
        return;
      }

      // Fetch mastery for each prerequisite
      type ReviewDueResponse = {
        success: boolean;
        items: Array<{ conceptId: string; masteryLevel: number }>;
        dueCount: number;
      };
      const response = await get<ReviewDueResponse>('/api/review/due?limit=100');
      if (response.success && response.data?.items) {
        const levels: Record<ConceptId, number> = {};
        for (const item of response.data.items) {
          levels[item.conceptId as ConceptId] = item.masteryLevel || 0;
        }
        setMasteryLevels(levels);
      }
    } catch (error) {
      console.error('Failed to fetch mastery levels:', error);
    } finally {
      setIsCheckingPrereqs(false);
    }
  }, [user?.id, lesson.id]);

  useEffect(() => {
    fetchMasteryLevels();
  }, [fetchMasteryLevels]);

  // Fetch review due count
  const fetchReviewDueCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      type ReviewDueResponse = { success: boolean; dueCount: number };
      const response = await get<ReviewDueResponse>('/api/review/due?limit=50');
      if (response.success && response.data) {
        setReviewDueCount(response.data.dueCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch review count:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReviewDueCount();
  }, [fetchReviewDueCount]);

  const handleAtomComplete = async (xp: number = 10) => {
    setEarnedXP(xp);
    setShowFloatingXP(true);

    // Update local state immediately (optimistic update via unified store)
    await addXP(xp);
    await completeAtom(currentAtom.id);

    // Small celebration
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#21A8B0', '#FFDE00'],
    });

    setTimeout(() => setShowFloatingXP(false), 1000);

    // Note: Atom components (VideoAtom, ReadingAtom, QuizAtom, PracticeAtom)
    // handle their own API calls with proper time tracking via useTimeTracking hook.
    // We only handle local state and badge checking here.

    // Check for newly earned badges
    try {
      if (user?.id) {
        const newBadges = await checkAndGetNewBadges(user.id);
        for (const badge of newBadges) {
          await earnBadge(badge.id);
          toast.badge(badge.title, `You earned the "${badge.title}" badge!`);
        }
      }
    } catch (error) {
      console.error('Failed to check badges:', error);
    }

    // Refresh review due count after completion (FSRS may schedule new reviews)
    fetchReviewDueCount();
  };

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

  const handleLessonComplete = async () => {
    setIsCompletingLesson(true);

    // Update local state via unified store (syncs to Firestore)
    await completeLesson(lesson.id);

    // Big celebration!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#21A8B0', '#FFDE00', '#6B4EE6'],
    });

    // Sync with backend APIs
    try {
      await fetch('/api/progress/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          userId: user?.id,
        }),
      });

      // Update streak via unified store (persists to Firestore)
      await checkAndUpdateStreak();

      // Also sync streak to backend API
      await fetch('/api/progress/update-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      // Check for new badges earned
      if (user?.id) {
        const newBadges = await checkAndGetNewBadges(user.id);
        for (const badge of newBadges) {
          await earnBadge(badge.id);
          toast.badge(badge.title, `You earned the "${badge.title}" badge!`);
          // Show extra celebration for badges
          confetti({
            particleCount: 50,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#FF69B4'],
          });
        }
      }

      // Show success toast
      toast.success('Lesson Complete!', 'Great job! Keep up the momentum.');
    } catch (error) {
      console.error('Failed to complete lesson:', error);
    }

    // Navigate back to dashboard after short delay
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  if (!user) return <SkeletonLearnPage />;

  // Type-cast atoms for proper component rendering
  const renderAtom = () => {
    switch (currentAtom.type) {
      case 'video':
        return (
          <VideoAtom
            atom={currentAtom as Atom & { type: 'video'; content: VideoContent }}
            onComplete={() => handleAtomComplete(15)}
          />
        );
      case 'reading':
        return (
          <ReadingAtom
            atom={currentAtom as Atom & { type: 'reading'; content: ReadingContent }}
            onComplete={() => handleAtomComplete(10)}
          />
        );
      case 'quiz':
        return (
          <QuizAtom
            atom={currentAtom as Atom & { type: 'quiz'; content: QuizContent }}
            onComplete={(score) => handleAtomComplete(25)}
          />
        );
      case 'practice':
        return (
          <PracticeAtom
            atom={currentAtom as Atom & { type: 'practice'; content: PracticeContent }}
            onComplete={() => handleAtomComplete(20)}
          />
        );
      default:
        return <div>Unknown atom type</div>;
    }
  };

  // Render atom from adaptive content (session-based)
  const renderAdaptiveAtom = () => {
    if (adaptiveContent.isLoading) {
      return <div className="animate-pulse bg-gray-100 h-64 rounded-lg" />;
    }

    if (adaptiveContent.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{adaptiveContent.error}</p>
          <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      );
    }

    const atomToRender = adaptiveContent.currentAtom;
    if (!atomToRender) {
      return <div className="text-center text-gray-500">No content available</div>;
    }

    switch (atomToRender.type) {
      case 'video':
        return (
          <VideoAtom
            atom={atomToRender as Atom & { type: 'video'; content: VideoContent }}
            onComplete={() => handleAdaptiveAtomComplete(15)}
          />
        );
      case 'reading':
        return (
          <ReadingAtom
            atom={atomToRender as Atom & { type: 'reading'; content: ReadingContent }}
            onComplete={() => handleAdaptiveAtomComplete(10)}
          />
        );
      case 'quiz':
        return (
          <QuizAtom
            atom={atomToRender as Atom & { type: 'quiz'; content: QuizContent }}
            onComplete={(score) => handleAdaptiveAtomComplete(25)}
          />
        );
      case 'practice':
        return (
          <PracticeAtom
            atom={atomToRender as Atom & { type: 'practice'; content: PracticeContent }}
            onComplete={() => handleAdaptiveAtomComplete(20)}
          />
        );
      default:
        return <div>Unknown atom type</div>;
    }
  };

  // Handle atom completion in adaptive mode
  const handleAdaptiveAtomComplete = (xp: number) => {
    handleAtomComplete(xp);

    // If this is the last atom in the current lesson, advance to next session item
    if (adaptiveContent.isLastAtom) {
      // Show completion overlay
      setCompletionXP(xp);
      setShowCompletionOverlay(true);
    } else {
      // Move to next atom within current lesson
      adaptiveContent.nextAtom();
    }
  };

  // Handle continue from completion overlay
  const handleCompletionContinue = () => {
    setShowCompletionOverlay(false);
    if (activeSession && sessionItemIndex < activeSession.items.length - 1) {
      setSessionItemIndex(prev => prev + 1);
    } else {
      // Session complete
      router.push('/dashboard');
    }
  };

  // Handle going to reviews from completion overlay
  const handleGoToReviews = () => {
    setShowCompletionOverlay(false);
    setActiveTab('review');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-light-grey px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumb
              items={[
                { label: `Course ${currentModule.courseId.replace('course-', '')}`, href: '/dashboard' },
                { label: `Module ${currentModule.number}` },
                { label: lesson.title },
              ]}
            />
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X size={18} />}
              onClick={() => router.push('/dashboard')}
            >
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-1 bg-light-grey rounded-lg p-1">
              <button
                onClick={() => setActiveTab('learn')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'learn'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-grey hover:text-navy'
                )}
              >
                <BookOpen size={16} />
                Learn
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
                  activeTab === 'review'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-grey hover:text-navy'
                )}
              >
                <Brain size={16} />
                Review
                {reviewDueCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold text-white bg-teal rounded-full">
                    {reviewDueCount > 99 ? '99+' : reviewDueCount}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'learn' && (
              <div className="flex items-center gap-4 flex-1">
                <ProgressBar
                  value={progress}
                  size="sm"
                  color="teal"
                  className="flex-1"
                />
                <span className="text-sm font-medium text-navy">
                  {currentAtomIndex + 1}/{atoms.length}
                </span>

                {/* Mode Toggle - for testing adaptive vs linear */}
                <div className="flex gap-1 bg-light-grey rounded-md p-0.5 ml-2">
                  <button
                    onClick={() => setLearningMode('adaptive')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      learningMode === 'adaptive'
                        ? 'bg-teal text-white'
                        : 'text-grey hover:text-navy'
                    )}
                  >
                    <Sparkles size={12} className="inline mr-1" />
                    Adaptive
                  </button>
                  <button
                    onClick={() => setLearningMode('linear')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      learningMode === 'linear'
                        ? 'bg-navy text-white'
                        : 'text-grey hover:text-navy'
                    )}
                  >
                    Linear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Learning Content Area */}
        <div className={cn(
          'flex-1 p-4 sm:p-6 transition-all duration-300',
          showCoachPanel ? 'lg:mr-[350px]' : ''
        )}>
          {activeTab === 'review' ? (
            <ReviewTab />
          ) : isCheckingPrereqs ? (
            // Loading state while checking prerequisites
            <div className="max-w-3xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : !prerequisitesMet ? (
            // Show mastery gate if prerequisites not met
            <div className="max-w-3xl mx-auto">
              {(() => {
                const conceptsForLesson = getConceptsForLesson(lesson.id);
                const targetConceptId = conceptsForLesson[0] || 'smm-fundamentals';
                return (
                  <MasteryGate
                    conceptId={targetConceptId}
                    masteryLevels={masteryLevels}
                    onReviewPrerequisite={(conceptId) => {
                      // Switch to review tab to practice the prerequisite
                      setActiveTab('review');
                    }}
                    onProceed={() => {
                      // Refresh prerequisites check
                      fetchMasteryLevels();
                    }}
                  >
                    {/* This won't render since prerequisites aren't met */}
                    <div />
                  </MasteryGate>
                );
              })()}
            </div>
          ) : learningMode === 'adaptive' && !activeSession ? (
            // Adaptive mode: Show session overview
            <div className="max-w-3xl mx-auto">
              <AdaptiveSessionView
                userId={user.id}
                availableMinutes={30}
                onStartSession={(session) => {
                  console.log('[LearnPage] Starting session with', session.items.length, 'items');
                  setActiveSession(session);
                  setSessionItemIndex(0);
                }}
onItemComplete={(item) => {
                  console.log('[LearnPage] Item complete:', item.skillId);
                  handleAtomComplete(15);
                  // Note: Session navigation is handled in the activeSession branch
                }}
              />
            </div>
          ) : learningMode === 'adaptive' && activeSession ? (
            // Adaptive mode: Show current session item with content loaded from session
            <div className="max-w-3xl mx-auto">
              <AdaptiveReasoningBanner
                reason={activeSession.items[sessionItemIndex]?.reason || 'Personalized for you'}
                skillName={activeSession.items[sessionItemIndex]?.skillId || 'Learning'}
                type={activeSession.items[sessionItemIndex]?.type === 'review' ? 'review' : 'learn'}
              />

              {/* Show lesson title from adaptive content */}
              {adaptiveContent.lesson && (
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{adaptiveContent.lesson.title}</h2>
                  {adaptiveContent.atoms.length > 1 && (
                    <p className="text-sm text-gray-500">
                      Part {adaptiveContent.currentAtomIndex + 1} of {adaptiveContent.atoms.length}
                    </p>
                  )}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeSession.items[sessionItemIndex]?.itemId}-${adaptiveContent.currentAtomIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderAdaptiveAtom()}
                </motion.div>
              </AnimatePresence>

              {/* Atom Navigation within lesson */}
              <div className="flex justify-between mt-8 pt-6 border-t border-light-grey">
                <Button
                  variant="ghost"
                  leftIcon={<ArrowLeft size={18} />}
                  onClick={() => {
                    if (!adaptiveContent.isFirstAtom) {
                      adaptiveContent.previousAtom();
                    } else if (sessionItemIndex > 0) {
                      setSessionItemIndex(prev => prev - 1);
                    }
                  }}
                  disabled={adaptiveContent.isFirstAtom && sessionItemIndex === 0}
                >
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                {!adaptiveContent.isLastAtom ? (
                  // More atoms in current lesson
                  <Button
                    rightIcon={<ArrowRight size={18} />}
                    onClick={() => adaptiveContent.nextAtom()}
                  >
                    <span className="hidden sm:inline">Next</span>
                  </Button>
                ) : sessionItemIndex < activeSession.items.length - 1 ? (
                  // Last atom but more session items
                  <Button
                    variant="celebration"
                    rightIcon={<CheckCircle size={18} />}
                    onClick={() => {
                      setCompletionXP(15);
                      setShowCompletionOverlay(true);
                    }}
                  >
                    Complete & Continue
                  </Button>
                ) : (
                  // Last atom of last session item
                  <Button
                    variant="celebration"
                    rightIcon={<CheckCircle size={18} />}
                    onClick={() => {
                      setCompletionXP(15);
                      setShowCompletionOverlay(true);
                    }}
                  >
                    Complete Session
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // Linear mode: Traditional atom-by-atom navigation
            <div className="max-w-3xl mx-auto">
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
                    onClick={handleLessonComplete}
                    disabled={isCompletingLesson}
                  >
                    {isCompletingLesson ? 'Completing...' : 'Complete Lesson'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Floating XP */}
          <AnimatePresence>
            {showFloatingXP && (
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                <FloatingXP amount={earnedXP} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Coach Panel - Desktop */}
        <AnimatePresence>
          {showCoachPanel && (
            <motion.div
              className="hidden lg:flex fixed right-0 top-[128px] bottom-0 w-[350px] bg-white border-l border-light-grey flex-col z-30"
              initial={{ x: 350 }}
              animate={{ x: 0 }}
              exit={{ x: 350 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <CoachChat
                isOpen={showCoachPanel}
                onClose={() => setShowCoachPanel(false)}
                lessonContext={{
                  currentCourse: currentModule.courseId,
                  currentModule: currentModule.title,
                  currentLesson: lesson.title,
                  atomType: currentAtom.type,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coach Panel - Mobile (Bottom Sheet) */}
        <AnimatePresence>
          {showCoachPanel && (
            <motion.div
              className="lg:hidden fixed inset-x-0 bottom-0 h-[70vh] bg-white rounded-t-3xl shadow-2xl z-40"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-grey/50 rounded-full" />
              </div>
              <CoachChat
                isOpen={showCoachPanel}
                onClose={() => setShowCoachPanel(false)}
                lessonContext={{
                  currentCourse: currentModule.courseId,
                  currentModule: currentModule.title,
                  currentLesson: lesson.title,
                  atomType: currentAtom.type,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile overlay when coach is open */}
        <AnimatePresence>
          {showCoachPanel && (
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCoachPanel(false)}
            />
          )}
        </AnimatePresence>

        {/* Toggle Coach Panel Button */}
        <button
          onClick={() => setShowCoachPanel(!showCoachPanel)}
          className={cn(
            'fixed right-4 bottom-4 w-14 h-14 rounded-full bg-teal text-white shadow-lg z-40',
            'flex items-center justify-center hover:bg-teal-dark transition-colors',
            showCoachPanel && 'lg:hidden'
          )}
          aria-label="Toggle coach panel"
        >
          <MessageCircle size={24} />
        </button>

        {/* Proactive Coach Prompt - Struggle Detection Integration */}
        <ProactivePrompt
          prompt={coachPrompt}
          onDismiss={dismissPrompt}
          onAction={(action) => {
            console.log('[LearnPage] Coach action:', action);
            setShowCoachPanel(true);
          }}
          onInterventionAccept={acceptIntervention}
        />
      </div>

      {/* Completion Overlay */}
      <CompletionOverlay
        isOpen={showCompletionOverlay}
        xpEarned={completionXP}
        itemTitle={adaptiveContent.lesson?.title}
        nextItemTitle={
          activeSession?.items[sessionItemIndex + 1]
            ? getSkillName(activeSession.items[sessionItemIndex + 1].skillId)
            : undefined
        }
        hasNextItem={
          activeSession
            ? sessionItemIndex < activeSession.items.length - 1
            : false
        }
        reviewsDue={reviewDueCount}
        isSessionComplete={
          activeSession
            ? sessionItemIndex >= activeSession.items.length - 1
            : false
        }
        onContinue={handleCompletionContinue}
        onGoToReviews={handleGoToReviews}
        onGoToDashboard={() => router.push('/dashboard')}
      />
    </div>
  );
}
