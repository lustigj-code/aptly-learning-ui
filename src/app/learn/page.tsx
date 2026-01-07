'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  BookOpen,
  CheckCircle,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonLearnPage } from '@/components/ui/Skeleton';
import { QuizOption, QuizProgress } from '@/components/learning/QuizOption';
import { Character } from '@/components/characters/Character';
import { FloatingXP } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/layout/Header';
import { useUser } from '@/store/unifiedStore';
import { post } from '@/lib/api/client';
import { useCoach } from '@/hooks/useCoach';
import { useToast } from '@/components/ui/Toast';
import { COURSES, COURSE_1_MODULE_1, COURSE_3_MODULE_1 } from '@/data/mockData';
import { checkAndGetNewBadges } from '@/lib/api/badgeApi';
import { cn, formatTime } from '@/lib/utils';
import type { Atom, VideoContent, ReadingContent, QuizContent, PracticeContent } from '@/types';

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
  const [showCoachPanel, setShowCoachPanel] = useState(true);
  const [showFloatingXP, setShowFloatingXP] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);

  const currentAtom = atoms[currentAtomIndex];
  const progress = ((currentAtomIndex + 1) / atoms.length) * 100;

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

    // Sync with backend API and check for new badges
    try {
      await post('/api/progress/complete-atom', {
        lessonId: lesson.id,
        atomId: currentAtom.id,
        moduleId: lesson.id.split('_')[0],
        courseId: lesson.id.split('_')[0],
        timeSpentSeconds: 60, // TODO: Track actual time
      });

      // Check for newly earned badges
      if (user?.id) {
        const newBadges = await checkAndGetNewBadges(user.id);
        for (const badge of newBadges) {
          await earnBadge(badge.id);
          toast.badge(badge.title, `You earned the "${badge.title}" badge!`);
        }
      }
    } catch (error) {
      console.error('Failed to sync atom completion:', error);
    }
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

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-light-grey px-6 py-4">
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
              Exit
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <ProgressBar
              value={progress}
              size="sm"
              color="teal"
              className="flex-1"
            />
            <span className="text-sm font-medium text-navy">
              {currentAtomIndex + 1}/{atoms.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Learning Content Area */}
        <div className={cn(
          'flex-1 p-6 transition-all duration-300',
          showCoachPanel ? 'mr-[350px]' : ''
        )}>
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAtom.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentAtom.type === 'video' && (
                  <VideoAtom
                    atom={currentAtom}
                    onComplete={() => handleAtomComplete(15)}
                    onNext={goToNextAtom}
                  />
                )}

                {currentAtom.type === 'reading' && (
                  <ReadingAtom
                    atom={currentAtom}
                    onComplete={() => handleAtomComplete(10)}
                    onNext={goToNextAtom}
                  />
                )}

                {currentAtom.type === 'practice' && (
                  <PracticeAtom
                    atom={currentAtom}
                    onComplete={() => handleAtomComplete(20)}
                    onNext={goToNextAtom}
                  />
                )}

                {currentAtom.type === 'quiz' && (
                  <QuizAtom
                    atom={currentAtom}
                    onComplete={() => handleAtomComplete(25)}
                    onNext={goToNextAtom}
                  />
                )}
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
                Previous
              </Button>

              {currentAtomIndex < atoms.length - 1 ? (
                <Button
                  rightIcon={<ArrowRight size={18} />}
                  onClick={goToNextAtom}
                >
                  Next
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

          {/* Floating XP */}
          <AnimatePresence>
            {showFloatingXP && (
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                <FloatingXP amount={earnedXP} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Coach Panel */}
        <AnimatePresence>
          {showCoachPanel && (
            <motion.div
              className="fixed right-0 top-[128px] bottom-0 w-[350px] bg-white border-l border-light-grey flex flex-col"
              initial={{ x: 350 }}
              animate={{ x: 0 }}
              exit={{ x: 350 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <CoachPanel atomType={currentAtom.type} atomTitle={currentAtom.title} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Coach Panel */}
        <button
          onClick={() => setShowCoachPanel(!showCoachPanel)}
          className={cn(
            'fixed right-4 bottom-4 w-14 h-14 rounded-full bg-teal text-white shadow-lg z-40',
            'flex items-center justify-center hover:bg-teal-dark transition-colors'
          )}
        >
          <MessageCircle size={24} />
        </button>
      </div>
    </div>
  );
}

// Video Atom Component
function VideoAtom({
  atom,
  onComplete,
  onNext,
}: {
  atom: Atom;
  onComplete: () => void;
  onNext: () => void;
}) {
  const content = atom.content as VideoContent;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showChapters, setShowChapters] = useState(false);

  const progress = (currentTime / content.duration) * 100;

  useEffect(() => {
    // Simulate video progress
    if (isPlaying && currentTime < content.duration) {
      const timer = setInterval(() => {
        setCurrentTime((t) => Math.min(t + 1, content.duration));
      }, 1000);
      return () => clearInterval(timer);
    }
    if (currentTime >= content.duration) {
      onComplete();
    }
  }, [isPlaying, currentTime, content.duration, onComplete]);

  return (
    <div>
      <h2 className="h3 text-navy mb-4">{atom.title}</h2>

      {/* Video Player Placeholder */}
      <Card variant="elevated" padding="none" className="mb-6 overflow-hidden">
        <div className="aspect-video bg-navy relative flex items-center justify-center">
          <div className="text-white text-center">
            <Play size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-white/70">Video Player Placeholder</p>
            <p className="text-sm text-white/50">({formatTime(content.duration)})</p>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <ProgressBar
              value={progress}
              size="sm"
              color="teal"
              className="mb-3"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <span className="text-sm text-white/80">
                  {formatTime(currentTime)} / {formatTime(content.duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChapters(!showChapters)}
                  className="px-3 py-1 rounded text-sm bg-white/20 hover:bg-white/30 transition-colors"
                >
                  Chapters
                </button>
                <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
                  <Maximize size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <AnimatePresence>
          {showChapters && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-light-grey"
            >
              <div className="p-4 space-y-2">
                {content.chapters.map((chapter, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTime(chapter.time)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                      currentTime >= chapter.time
                        ? 'bg-light-teal text-teal'
                        : 'hover:bg-light-grey'
                    )}
                  >
                    <span className="text-sm text-rich-black/60">{formatTime(chapter.time)}</span>
                    <span className="font-medium">{chapter.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Key Takeaways */}
      <Card variant="outlined" padding="lg" className="bg-light-teal/30 border-teal/20">
        <h3 className="font-semibold text-navy mb-3 flex items-center gap-2">
          <BookOpen size={18} className="text-teal" />
          Key Takeaways
        </h3>
        <ul className="space-y-2">
          {content.keyTakeaways.map((takeaway, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle size={16} className="text-teal mt-0.5 flex-shrink-0" />
              <span className="text-rich-black/80">{takeaway}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// Reading Atom Component
function ReadingAtom({
  atom,
  onComplete,
  onNext,
}: {
  atom: Atom;
  onComplete: () => void;
  onNext: () => void;
}) {
  const content = atom.content as ReadingContent;
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      setReadProgress(Math.min(scrollPercent, 100));

      if (scrollPercent > 80) {
        onComplete();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onComplete]);

  // Simple markdown-like rendering
  const renderContent = (body: string) => {
    const lines = body.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) {
        return <h2 key={i} className="h3 text-navy mb-4 mt-8">{line.slice(2)}</h2>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="h4 text-navy mb-3 mt-6">{line.slice(3)}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-navy mb-2">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={i} className="border-l-4 border-teal pl-4 py-2 my-4 bg-light-teal/20 rounded-r-lg">
            <p className="text-navy italic">{line.slice(2)}</p>
          </blockquote>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="flex items-start gap-2 mb-2">
            <span className="w-2 h-2 bg-teal rounded-full mt-2 flex-shrink-0" />
            <span>{line.slice(2)}</span>
          </li>
        );
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="mb-4 text-rich-black/80 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div>
      <h2 className="h3 text-navy mb-6">{atom.title}</h2>

      {/* Reading progress indicator */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <ProgressBar value={readProgress} size="xs" color="teal" animated={false} />
      </div>

      {/* Highlights Card */}
      {content.highlights.length > 0 && (
        <Card variant="elevated" padding="lg" className="mb-8 bg-yellow/10 border border-yellow/30">
          <h3 className="font-semibold text-navy mb-3">Key Points</h3>
          <ul className="space-y-2">
            {content.highlights.map((highlight, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <span className="font-medium text-navy">{highlight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Main Content */}
      <Card variant="outlined" padding="lg" className="prose max-w-none">
        {renderContent(content.body)}
      </Card>

      {/* Continue Button */}
      <div className="mt-8 text-center">
        <Button size="lg" onClick={() => { onComplete(); onNext(); }}>
          I&apos;ve read this
        </Button>
      </div>
    </div>
  );
}

// Practice Atom Component
function PracticeAtom({
  atom,
  onComplete,
  onNext,
}: {
  atom: Atom;
  onComplete: () => void;
  onNext: () => void;
}) {
  const content = atom.content as PracticeContent;
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    setSubmitted(true);
    // Simulate AI feedback
    setFeedback(
      "Great attempt! You've touched on the key points. Remember, ROI is specifically about measuring the profitability of your investment. Your answer shows good understanding of why it matters for marketing decisions."
    );
    onComplete();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center">
          <span className="text-xl">✍️</span>
        </div>
        <div>
          <span className="label text-purple">Practice</span>
          <h2 className="h4 text-navy">{atom.title}</h2>
        </div>
      </div>

      <Card variant="outlined" padding="lg" className="mb-6">
        <p className="text-navy leading-relaxed">{content.prompt}</p>
      </Card>

      {!submitted ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full h-40 p-4 border-2 border-grey rounded-xl focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none resize-none"
          />

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim()}
            >
              Submit Answer
            </Button>
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="elevated" padding="lg" className="bg-success-light border border-success/30">
            <div className="flex items-start gap-4">
              <Character character="owl" mood="proud" size="sm" />
              <div>
                <h4 className="font-semibold text-navy mb-2">Coach&apos;s Feedback</h4>
                <p className="text-rich-black/80">{feedback}</p>

                <Button
                  className="mt-4"
                  rightIcon={<ArrowRight size={18} />}
                  onClick={onNext}
                >
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// Quiz Atom Component
function QuizAtom({
  atom,
  onComplete,
  onNext,
}: {
  atom: Atom;
  onComplete: () => void;
  onNext: () => void;
}) {
  const content = atom.content as QuizContent;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const question = content.questions[currentQuestionIndex];
  const isCorrect = selectedAnswer === question.correctAnswer;

  const handleCheckAnswer = () => {
    setIsAnswered(true);
    if (isCorrect) {
      setScore(score + 1);
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#21A8B0', '#FFDE00'],
      });
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < content.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
      onComplete();
    }
  };

  if (isComplete) {
    const percentage = Math.round((score / content.questions.length) * 100);
    const passed = percentage >= content.passingScore;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <Character
          character={passed ? 'cat' : 'dog'}
          mood={passed ? 'celebrating' : 'encouraging'}
          size="xl"
          className="mb-6"
        />

        <h2 className="h2 text-navy mb-2">
          {passed ? 'Great job!' : 'Keep practicing!'}
        </h2>

        <p className="text-xl text-rich-black/70 mb-6">
          You scored {score}/{content.questions.length} ({percentage}%)
        </p>

        <div className="flex justify-center gap-4">
          {!passed && (
            <Button variant="secondary" onClick={() => {
              setCurrentQuestionIndex(0);
              setSelectedAnswer(null);
              setIsAnswered(false);
              setScore(0);
              setIsComplete(false);
            }}>
              Try Again
            </Button>
          )}
          <Button onClick={onNext}>
            Continue
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center">
            <span className="text-xl">❓</span>
          </div>
          <div>
            <span className="label text-teal">Quiz</span>
            <h2 className="h4 text-navy">{atom.title}</h2>
          </div>
        </div>

        <span className="text-sm font-medium text-rich-black/60">
          Question {currentQuestionIndex + 1} of {content.questions.length}
        </span>
      </div>

      <QuizProgress
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={content.questions.length}
        className="mb-8"
      />

      <Card variant="elevated" padding="lg" className="mb-6">
        <p className="text-lg font-medium text-navy">{question.question}</p>
      </Card>

      <div className="space-y-3 mb-6">
        {question.options?.map((option, i) => (
          <QuizOption
            key={i}
            label={option}
            optionLetter={String.fromCharCode(65 + i)}
            isSelected={selectedAnswer === i}
            isCorrect={i === question.correctAnswer}
            isAnswered={isAnswered}
            onSelect={() => !isAnswered && setSelectedAnswer(i)}
          />
        ))}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card
              variant="outlined"
              padding="lg"
              className={cn(
                'mb-6',
                isCorrect ? 'bg-success-light border-success/30' : 'bg-warning-light border-warning/30'
              )}
            >
              <div className="flex items-start gap-3">
                <Character
                  character={isCorrect ? 'owl' : 'dog'}
                  mood={isCorrect ? 'proud' : 'encouraging'}
                  size="xs"
                />
                <div>
                  <h4 className="font-semibold text-navy mb-1">
                    {isCorrect ? 'Correct!' : 'Not quite...'}
                  </h4>
                  <p className="text-rich-black/70">{question.explanation}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        {!isAnswered ? (
          <Button
            onClick={handleCheckAnswer}
            disabled={selectedAnswer === null}
          >
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentQuestionIndex < content.questions.length - 1 ? 'Next Question' : 'See Results'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Coach Panel Component
function CoachPanel({ atomType, atomTitle }: { atomType: string; atomTitle: string }) {
  const [inputMessage, setInputMessage] = useState('');
  const { messages, sendMessage, isLoading, initializeChat } = useCoach();

  // Initialize chat with welcome message
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageToSend = inputMessage;
    setInputMessage('');

    await sendMessage(messageToSend, 'chat', {
      currentLesson: atomTitle,
      atomType,
    });
  };

  return (
    <>
      <div className="p-4 border-b border-light-grey flex items-center gap-3">
        <Character character="owl" mood={isLoading ? 'thinking' : 'idle'} size="xs" />
        <div>
          <h3 className="font-semibold text-navy">Coach</h3>
          <p className="text-xs text-rich-black/60">
            {isLoading ? 'Thinking...' : 'Ready to help'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex gap-3',
              msg.role === 'user' && 'flex-row-reverse'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-light-teal flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🦉</span>
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] p-3 rounded-xl',
                msg.role === 'assistant'
                  ? 'bg-light-teal text-navy'
                  : 'bg-teal text-white'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-light-teal flex items-center justify-center flex-shrink-0">
              <span className="text-sm">🦉</span>
            </div>
            <div className="bg-light-teal p-3 rounded-xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 border-t border-light-grey">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask Coach anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-grey rounded-full text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button size="sm" onClick={handleSend} disabled={isLoading || !inputMessage.trim()}>
            Send
          </Button>
        </div>
      </div>
    </>
  );
}
