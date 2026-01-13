'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  TrendingUp,
  Briefcase,
  Compass,
  Clock,
  BookOpen,
  Video,
  Mic,
  ArrowRight,
  Check,
  Brain,
  Share2,
  BarChart3,
  FolderKanban,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Character } from '@/components/characters/Character';
import { useUnifiedStore, createNewUser } from '@/store/unifiedStore';
import { BADGES } from '@/data/mockData';
import { updateProfile, updatePreferences } from '@/lib/api/userApi';
import { cn, calculateWeeksToComplete } from '@/lib/utils';
import type { OnboardingStep, LearningPace } from '@/types';
import { DEFAULT_COURSE_ID, getPrimaryCourseForDomain } from '@/data/courseRegistry';
import { getActiveDomains, type DomainConfig } from '@/lib/content/domainConfig';

const STEPS: OnboardingStep[] = ['welcome', 'name', 'domain', 'goal', 'experience', 'time', 'style', 'complete'];

// Map domain icon names to Lucide components
const DOMAIN_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Brain,
  Share2,
  BarChart3,
  FolderKanban,
};

// Goals are now dynamic based on selected domain
const getGoalsForDomain = (domain: DomainConfig | null) => {
  const certName = domain?.certification?.name || 'certification';
  const domainName = domain?.name || 'this topic';

  return [
    {
      id: 'certified',
      label: domain?.certification ? `Get ${certName}` : 'Earn a Certificate',
      icon: Award,
      description: domain?.certification ? `Earn your ${domain.certification.provider} certification` : 'Earn your professional certification',
    },
    {
      id: 'learn',
      label: `Learn ${domainName}`,
      icon: TrendingUp,
      description: 'Build valuable skills',
    },
    {
      id: 'career',
      label: 'Advance My Career',
      icon: Briefcase,
      description: 'Take the next step professionally',
    },
    {
      id: 'explore',
      label: 'Explore What\'s Possible',
      icon: Compass,
      description: 'See what this is all about',
    },
  ];
};

// Experience levels are now dynamic based on domain
const getExperienceLevelsForDomain = (domain: DomainConfig | null) => {
  const domainName = domain?.name?.toLowerCase() || 'this topic';

  return [
    { id: 0, label: 'Brand New', description: `Never worked with ${domainName}` },
    { id: 25, label: 'Some Basics', description: 'Know the fundamentals' },
    { id: 50, label: 'Intermediate', description: 'Have practical experience' },
    { id: 75, label: 'Pretty Advanced', description: 'Work with it regularly' },
  ];
};

const timeCommitments: { minutes: number; pace: LearningPace; label: string }[] = [
  { minutes: 10, pace: 'relaxed', label: '10 min/day' },
  { minutes: 15, pace: 'moderate', label: '15 min/day' },
  { minutes: 20, pace: 'moderate', label: '20 min/day' },
  { minutes: 30, pace: 'intensive', label: '30+ min/day' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const setUser = useUnifiedStore((state) => state.setUser);

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<number>(0);
  const [dailyMinutes, setDailyMinutes] = useState<number>(15);
  const [learningPace, setLearningPace] = useState<LearningPace>('moderate');
  const [preferReadingOrVideo, setPreferReadingOrVideo] = useState<'reading' | 'video'>('video');
  const [quizTiming, setQuizTiming] = useState<'during' | 'end'>('during');
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Get available domains
  const activeDomains = useMemo(() => getActiveDomains(), []);
  const selectedDomain = useMemo(
    () => activeDomains.find(d => d.id === selectedDomainId) || null,
    [activeDomains, selectedDomainId]
  );

  // Dynamic goals and experience levels based on domain
  const goals = useMemo(() => getGoalsForDomain(selectedDomain), [selectedDomain]);
  const experienceLevels = useMemo(() => getExperienceLevelsForDomain(selectedDomain), [selectedDomain]);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Calculate weeks based on selected domain's primary course
  const selectedCourse = selectedDomainId ? getPrimaryCourseForDomain(selectedDomainId) : null;
  const totalContentMinutes = selectedCourse ? selectedCourse.estimatedHours * 60 : 60 * 60;
  const weeksToComplete = calculateWeeksToComplete(totalContentMinutes, dailyMinutes);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleComplete = async () => {
    // Get the Firebase auth user to use their UID
    const authUser = useUnifiedStore.getState().authUser;

    // Create a fresh user with actual onboarding data
    const newUser = createNewUser(
      name.trim(),
      authUser?.email || '',
      authUser?.uid
    );

    // Apply onboarding preferences
    newUser.preferences = {
      ...newUser.preferences,
      dailyGoalMinutes: dailyMinutes,
      learningPace,
      voiceEnabled,
      preferReadingOrVideo,
      quizTiming,
      preferredLearningTime: 'morning', // Could add this to onboarding later
    };

    // Set user's goal and experience from onboarding
    newUser.goal = selectedGoal || undefined;
    newUser.experienceLevel = experienceLevel;

    // Get the primary course for the selected domain
    const domainCourse = selectedDomainId ? getPrimaryCourseForDomain(selectedDomainId) : null;
    const startingCourseId = domainCourse?.id || DEFAULT_COURSE_ID;

    // Determine starting position based on domain
    // For AI at Work: ai-m1, lesson 1.1
    // For Social Media Marketing: c1-m1, lesson c1-m1-l1
    let startingModuleId = 'ai-m1';
    let startingLessonId = '1.1';
    let startingAtomId = '1.1-intro';

    if (selectedDomainId === 'social-media-marketing') {
      startingModuleId = 'c1-m1';
      startingLessonId = 'c1-m1-l1';
      startingAtomId = 'c1-m1-l1-a1';
    }

    // Start with fresh progress - beginning of selected domain's course
    newUser.progress = {
      ...newUser.progress,
      currentCourseId: startingCourseId,
      currentModuleId: startingModuleId,
      currentLessonId: startingLessonId,
      currentAtomId: startingAtomId,
      overallPercentage: 0,
      coursesCompleted: [],
      modulesCompleted: [],
      lessonsCompleted: [],
      atomsCompleted: [],
      xp: 0,
      totalTimeSpentMinutes: 0,
      lastActiveAt: new Date(),
    };

    // Start with fresh streak
    newUser.streak = {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      freezesAvailable: 2,
      freezesUsed: [],
      streakHistory: [],
    };

    // All badges start unearned
    newUser.badges = BADGES.map(badge => ({
      ...badge,
      earnedAt: undefined,
    }));

    setUser(newUser);

    // Save to Firestore (non-blocking - don't fail onboarding if this fails)
    if (authUser?.uid) {
      try {
        await Promise.all([
          updateProfile(authUser.uid, {
            name: name.trim(),
            goal: selectedGoal || undefined,
            experienceLevel,
            onboardingCompleted: true,
          }),
          updatePreferences(authUser.uid, {
            dailyGoalMinutes: dailyMinutes,
            learningPace,
            voiceEnabled,
          }),
        ]);
      } catch (error) {
        console.error('Error saving onboarding data to Firestore:', error);
        // Continue anyway - local state is set
      }
    }

    // Celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#21A8B0', '#FFDE00', '#0A004A'],
    });

    // Navigate to dashboard
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  const slideVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-teal/50 via-white to-light-teal/30 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
        <ProgressBar value={progress} size="xs" color="teal" animated />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {/* Welcome */}
            {currentStep === 'welcome' && (
              <motion.div
                key="welcome"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="text-center"
              >
                <motion.div
                  className="w-20 h-20 bg-teal rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                >
                  <span className="text-4xl font-bold text-white">A</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h1 className="h2 text-navy mb-2">Welcome to Aptly</h1>
                  <p className="body-lg text-rich-black/70 mb-6">
                    Your personal path to Meta certification
                  </p>

                  <div className="flex justify-center mb-8">
                    <Character character="owl" mood="encouraging" size="lg" />
                  </div>

                  <Card variant="outlined" padding="lg" className="mb-8 text-left">
                    <p className="text-navy">
                      &ldquo;Hi there! I&apos;ll be your coach throughout this journey.
                      Let&apos;s start by getting to know each other.&rdquo;
                    </p>
                    <p className="text-sm text-rich-black/60 mt-2">— Coach Owl</p>
                  </Card>

                  <Button
                    size="lg"
                    rightIcon={<ArrowRight size={20} />}
                    onClick={goToNextStep}
                    fullWidth
                  >
                    Let&apos;s Begin
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Name */}
            {currentStep === 'name' && (
              <motion.div
                key="name"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="flex items-start gap-4 mb-6">
                  <Character character="owl" mood="thinking" size="sm" />
                  <Card variant="outlined" padding="md" className="flex-1 coach-bubble relative">
                    <p className="text-navy">
                      First things first—what should I call you?
                    </p>
                  </Card>
                </div>

                <Input
                  inputSize="lg"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mb-6"
                />

                <Button
                  size="lg"
                  rightIcon={<ArrowRight size={20} />}
                  onClick={goToNextStep}
                  disabled={!name.trim()}
                  fullWidth
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* Domain Selection */}
            {currentStep === 'domain' && (
              <motion.div
                key="domain"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="flex items-start gap-4 mb-6">
                  <Character character="owl" mood="encouraging" size="sm" />
                  <Card variant="outlined" padding="md" className="flex-1 coach-bubble relative">
                    <p className="text-navy">
                      Great, <strong>{name}</strong>! What would you like to learn?
                    </p>
                  </Card>
                </div>

                <div className="grid gap-3 mb-6">
                  {activeDomains.map((domain) => {
                    const IconComponent = DOMAIN_ICONS[domain.icon] || Brain;
                    const isSelected = selectedDomainId === domain.id;

                    // Get domain-specific color classes
                    const colorClasses: Record<string, { bg: string; selected: string; text: string }> = {
                      purple: { bg: 'bg-purple', selected: 'border-purple bg-purple/10', text: 'text-purple' },
                      teal: { bg: 'bg-teal', selected: 'border-teal bg-light-teal/30', text: 'text-teal' },
                      navy: { bg: 'bg-navy', selected: 'border-navy bg-navy/10', text: 'text-navy' },
                      yellow: { bg: 'bg-yellow', selected: 'border-yellow bg-yellow/10', text: 'text-yellow' },
                    };
                    const colors = colorClasses[domain.color] || colorClasses.teal;

                    return (
                      <motion.button
                        key={domain.id}
                        onClick={() => setSelectedDomainId(domain.id)}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 text-left transition-all',
                          'flex items-center gap-4',
                          isSelected
                            ? colors.selected
                            : 'border-grey bg-white hover:border-muted-teal'
                        )}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div
                          className={cn(
                            'w-14 h-14 rounded-xl flex items-center justify-center',
                            isSelected ? colors.bg + ' text-white' : 'bg-light-grey text-navy'
                          )}
                        >
                          <IconComponent size={28} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-navy">{domain.name}</p>
                          <p className="text-sm text-rich-black/60 line-clamp-2">{domain.description}</p>
                          {domain.certification && (
                            <div className="flex items-center gap-1 mt-1">
                              <Award size={14} className={colors.text} />
                              <span className={cn('text-xs font-medium', colors.text)}>
                                {domain.certification.provider} Certification
                              </span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className={colors.text} size={24} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <Button
                  size="lg"
                  rightIcon={<ArrowRight size={20} />}
                  onClick={goToNextStep}
                  disabled={!selectedDomainId}
                  fullWidth
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* Goal */}
            {currentStep === 'goal' && (
              <motion.div
                key="goal"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="flex items-start gap-4 mb-6">
                  <Character character="owl" mood="encouraging" size="sm" />
                  <Card variant="outlined" padding="md" className="flex-1 coach-bubble relative">
                    <p className="text-navy">
                      Nice to meet you, <strong>{name}</strong>! What brings you here today?
                    </p>
                  </Card>
                </div>

                <div className="grid gap-3 mb-6">
                  {goals.map((goal) => {
                    const Icon = goal.icon;
                    const isSelected = selectedGoal === goal.id;

                    return (
                      <motion.button
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal.id)}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 text-left transition-all',
                          'flex items-center gap-4',
                          isSelected
                            ? 'border-teal bg-light-teal/30'
                            : 'border-grey bg-white hover:border-muted-teal'
                        )}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center',
                            isSelected ? 'bg-teal text-white' : 'bg-light-grey text-navy'
                          )}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-navy">{goal.label}</p>
                          <p className="text-sm text-rich-black/60">{goal.description}</p>
                        </div>
                        {isSelected && (
                          <Check className="text-teal" size={24} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <Button
                  size="lg"
                  rightIcon={<ArrowRight size={20} />}
                  onClick={goToNextStep}
                  disabled={!selectedGoal}
                  fullWidth
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* Experience */}
            {currentStep === 'experience' && (
              <motion.div
                key="experience"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="flex items-start gap-4 mb-6">
                  <Character character="owl" mood="thinking" size="sm" />
                  <Card variant="outlined" padding="md" className="flex-1 coach-bubble relative">
                    <p className="text-navy">
                      How much do you already know about social media marketing?
                    </p>
                  </Card>
                </div>

                <div className="grid gap-3 mb-6">
                  {experienceLevels.map((level) => {
                    const isSelected = experienceLevel === level.id;

                    return (
                      <motion.button
                        key={level.id}
                        onClick={() => setExperienceLevel(level.id)}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 text-left transition-all',
                          isSelected
                            ? 'border-teal bg-light-teal/30'
                            : 'border-grey bg-white hover:border-muted-teal'
                        )}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-navy">{level.label}</p>
                            <p className="text-sm text-rich-black/60">{level.description}</p>
                          </div>
                          {isSelected && <Check className="text-teal" size={24} />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <Button
                  size="lg"
                  rightIcon={<ArrowRight size={20} />}
                  onClick={goToNextStep}
                  fullWidth
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* Time Commitment */}
            {currentStep === 'time' && (
              <motion.div
                key="time"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="flex items-start gap-4 mb-6">
                  <Character character="owl" mood="encouraging" size="sm" />
                  <Card variant="outlined" padding="md" className="flex-1 coach-bubble relative">
                    <p className="text-navy">
                      How much time can you dedicate each day? Even 10 minutes makes a difference.
                    </p>
                  </Card>
                </div>

                <div className="flex gap-3 mb-4">
                  {timeCommitments.map((time) => {
                    const isSelected = dailyMinutes === time.minutes;

                    return (
                      <motion.button
                        key={time.minutes}
                        onClick={() => {
                          setDailyMinutes(time.minutes);
                          setLearningPace(time.pace);
                        }}
                        className={cn(
                          'flex-1 py-4 px-3 rounded-xl border-2 text-center transition-all',
                          isSelected
                            ? 'border-teal bg-light-teal/30'
                            : 'border-grey bg-white hover:border-muted-teal'
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Clock
                          size={24}
                          className={cn(
                            'mx-auto mb-2',
                            isSelected ? 'text-teal' : 'text-grey'
                          )}
                        />
                        <p className={cn(
                          'font-semibold',
                          isSelected ? 'text-teal' : 'text-navy'
                        )}>
                          {time.label}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>

                <Card variant="outlined" padding="md" className="mb-6 bg-yellow/10 border-yellow/30">
                  <p className="text-sm text-navy text-center">
                    At this pace, you&apos;ll be exam-ready in approximately{' '}
                    <strong>{weeksToComplete} weeks</strong>
                  </p>
                </Card>

                <Button
                  size="lg"
                  rightIcon={<ArrowRight size={20} />}
                  onClick={goToNextStep}
                  fullWidth
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* Learning Style */}
            {currentStep === 'style' && (
              <motion.div
                key="style"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="flex items-start gap-4 mb-6">
                  <Character character="owl" mood="thinking" size="sm" />
                  <Card variant="outlined" padding="md" className="flex-1 coach-bubble relative">
                    <p className="text-navy">
                      One more thing—how do you prefer to learn?
                    </p>
                  </Card>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Reading vs Video */}
                  <div className="flex rounded-xl border-2 border-grey overflow-hidden">
                    <button
                      onClick={() => setPreferReadingOrVideo('reading')}
                      className={cn(
                        'flex-1 py-4 px-4 flex items-center justify-center gap-2 transition-colors',
                        preferReadingOrVideo === 'reading'
                          ? 'bg-teal text-white'
                          : 'bg-white text-navy hover:bg-light-grey'
                      )}
                    >
                      <BookOpen size={20} />
                      <span className="font-medium">Reading</span>
                    </button>
                    <button
                      onClick={() => setPreferReadingOrVideo('video')}
                      className={cn(
                        'flex-1 py-4 px-4 flex items-center justify-center gap-2 transition-colors',
                        preferReadingOrVideo === 'video'
                          ? 'bg-teal text-white'
                          : 'bg-white text-navy hover:bg-light-grey'
                      )}
                    >
                      <Video size={20} />
                      <span className="font-medium">Videos</span>
                    </button>
                  </div>

                  {/* Quiz timing */}
                  <div className="flex rounded-xl border-2 border-grey overflow-hidden">
                    <button
                      onClick={() => setQuizTiming('during')}
                      className={cn(
                        'flex-1 py-4 px-4 text-center transition-colors',
                        quizTiming === 'during'
                          ? 'bg-teal text-white'
                          : 'bg-white text-navy hover:bg-light-grey'
                      )}
                    >
                      <span className="font-medium">Quiz as I go</span>
                    </button>
                    <button
                      onClick={() => setQuizTiming('end')}
                      className={cn(
                        'flex-1 py-4 px-4 text-center transition-colors',
                        quizTiming === 'end'
                          ? 'bg-teal text-white'
                          : 'bg-white text-navy hover:bg-light-grey'
                      )}
                    >
                      <span className="font-medium">Quiz at the end</span>
                    </button>
                  </div>

                  {/* Voice toggle */}
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={cn(
                      'w-full py-4 px-4 rounded-xl border-2 flex items-center justify-between transition-all',
                      voiceEnabled
                        ? 'border-teal bg-light-teal/30'
                        : 'border-grey bg-white hover:border-muted-teal'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Mic size={20} className={voiceEnabled ? 'text-teal' : 'text-grey'} />
                      <span className="font-medium text-navy">Voice conversations with Coach</span>
                    </div>
                    <div
                      className={cn(
                        'w-12 h-7 rounded-full transition-colors relative',
                        voiceEnabled ? 'bg-teal' : 'bg-grey'
                      )}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full absolute top-1"
                        animate={{ left: voiceEnabled ? 26 : 4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                </div>

                <Button
                  size="lg"
                  rightIcon={<ArrowRight size={20} />}
                  onClick={goToNextStep}
                  fullWidth
                >
                  Finish Setup
                </Button>
              </motion.div>
            )}

            {/* Complete */}
            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mb-6"
                >
                  <Character character="owl" mood="celebrating" size="xl" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="h2 text-navy mb-2">You&apos;re all set, {name}!</h1>
                  <p className="body text-rich-black/70 mb-6">
                    Based on what you told me, I&apos;ve created your personalized learning path.
                  </p>

                  <Card variant="elevated" padding="lg" className="mb-6 text-left">
                    {(() => {
                      // Get domain-specific info for the completion card
                      const DomainIcon = selectedDomain ? (DOMAIN_ICONS[selectedDomain.icon] || Brain) : Award;
                      const colorClasses: Record<string, { bg: string; text: string }> = {
                        purple: { bg: 'bg-purple/10', text: 'text-purple' },
                        teal: { bg: 'bg-teal/10', text: 'text-teal' },
                        navy: { bg: 'bg-navy/10', text: 'text-navy' },
                        yellow: { bg: 'bg-yellow/10', text: 'text-yellow' },
                      };
                      const colors = selectedDomain ? (colorClasses[selectedDomain.color] || colorClasses.teal) : colorClasses.teal;
                      const courseCount = selectedDomainId ? (getPrimaryCourseForDomain(selectedDomainId)?.modules?.length || 1) : 5;

                      return (
                        <>
                          <div className="flex items-center gap-4 mb-4">
                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.bg)}>
                              <DomainIcon className={colors.text} size={24} />
                            </div>
                            <div>
                              <p className="font-semibold text-navy">
                                {selectedDomain?.certification?.name || selectedDomain?.name || 'Learning Path'}
                              </p>
                              <p className="text-sm text-rich-black/60">
                                {courseCount} {courseCount === 1 ? 'module' : 'modules'} · ~{weeksToComplete} weeks
                              </p>
                            </div>
                          </div>

                          {selectedDomain?.certification && (
                            <div className="flex items-center gap-2 mb-4 text-sm">
                              <Award size={16} className={colors.text} />
                              <span className="text-rich-black/70">
                                Prepares you for {selectedDomain.certification.provider} certification
                              </span>
                            </div>
                          )}

                          <ProgressBar
                            value={experienceLevel}
                            size="md"
                            color={selectedDomain?.color === 'purple' ? 'purple' : selectedDomain?.color === 'yellow' ? 'yellow' : 'teal'}
                            showLabel
                            labelPosition="right"
                            className="mb-4"
                          />

                          <p className="text-sm text-rich-black/60">
                            Starting at {experienceLevel}% based on your experience
                          </p>
                        </>
                      );
                    })()}
                  </Card>

                  <Button
                    variant="celebration"
                    size="xl"
                    rightIcon={<ArrowRight size={22} />}
                    onClick={handleComplete}
                    fullWidth
                  >
                    Start Learning
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
