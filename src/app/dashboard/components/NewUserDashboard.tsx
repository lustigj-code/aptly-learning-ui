/**
 * New User Dashboard
 *
 * Clean onboarding experience for users with no progress.
 * Shows welcome card, course preview, and prominent CTA.
 * No empty states with zeros - just actionable content.
 */

'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Target, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING } from '@/lib/motion/springs';
import { COLORS_RAW } from '@/lib/design-tokens';

interface NewUserDashboardProps {
  userName: string;
  courseName: string;
  courseDescription?: string;
  totalLessons: number;
  estimatedHours?: number;
  onStartLearning: () => void;
  onViewPath?: () => void;
}

export function NewUserDashboard({
  userName,
  courseName,
  courseDescription: _courseDescription,
  totalLessons,
  estimatedHours = Math.ceil(totalLessons * 0.25),
  onStartLearning,
  onViewPath,
}: NewUserDashboardProps) {
  const prefersReducedMotion = useReducedMotion();

  const features = [
    {
      icon: Brain,
      title: 'AI Coach',
      description: 'Get personalized help whenever you need it',
      color: 'teal',
    },
    {
      icon: Target,
      title: 'Adaptive Learning',
      description: 'Content adapts to your pace and style',
      color: 'purple',
    },
    {
      icon: Zap,
      title: 'Track Progress',
      description: 'Earn XP and build your learning streak',
      color: 'yellow',
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Hero Section */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING.gentle}
        className={cn(
          'relative overflow-hidden rounded-3xl p-8 md:p-12',
          'bg-gradient-to-br from-navy via-purple to-navy',
          'text-white'
        )}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: COLORS_RAW.teal }}
          />
          <div
            className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-2xl opacity-15"
            style={{ background: COLORS_RAW.yellow }}
          />
        </div>

        <div className="relative z-10 max-w-2xl">
          {/* Welcome badge */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
          >
            <Sparkles size={14} className="text-yellow" />
            <span className="text-sm font-medium">Welcome to Aptly</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight"
          >
            Ready to begin your journey, {userName}?
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-white/80 mb-8"
          >
            Start mastering <span className="text-teal font-semibold">{courseName}</span> with
            AI-powered adaptive learning that moves at your pace.
          </motion.p>

          {/* Course stats */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap gap-6 mb-8"
          >
            <div className="flex items-center gap-2 text-white/70">
              <BookOpen size={18} />
              <span>{totalLessons} lessons</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Target size={18} />
              <span>~{estimatedHours} hours total</span>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={onStartLearning}
              className={cn(
                'flex items-center justify-center gap-2 px-8 py-4 rounded-xl',
                'bg-teal text-white font-semibold text-lg',
                'shadow-[0_8px_24px_rgba(33,168,176,0.4)]',
                'hover:bg-teal-dark hover:shadow-[0_12px_32px_rgba(33,168,176,0.5)]',
                'transition-all duration-200'
              )}
            >
              Start Your First Lesson
              <ArrowRight size={20} />
            </button>

            {onViewPath && (
              <button
                onClick={onViewPath}
                className={cn(
                  'flex items-center justify-center gap-2 px-6 py-4 rounded-xl',
                  'bg-white/10 backdrop-blur-sm border border-white/20',
                  'text-white font-medium',
                  'hover:bg-white/20 transition-colors'
                )}
              >
                View Learning Path
              </button>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className={cn(
              'p-6 rounded-2xl',
              'backdrop-blur-xl bg-white/75 border border-white/15',
              'shadow-[0px_4px_8px_rgba(0,0,0,0.04),0px_20px_40px_rgba(0,0,0,0.08)]'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                feature.color === 'teal' && 'bg-teal/10',
                feature.color === 'purple' && 'bg-purple/10',
                feature.color === 'yellow' && 'bg-yellow/10'
              )}
            >
              <feature.icon
                size={24}
                className={cn(
                  feature.color === 'teal' && 'text-teal',
                  feature.color === 'purple' && 'text-purple',
                  feature.color === 'yellow' && 'text-yellow-dark'
                )}
              />
            </div>
            <h3 className="font-semibold text-navy mb-2">{feature.title}</h3>
            <p className="text-sm text-rich-black/60">{feature.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Getting Started Guide */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className={cn(
          'mt-6 p-6 rounded-2xl',
          'backdrop-blur-xl bg-white/75 border border-white/15',
          'shadow-[0px_4px_8px_rgba(0,0,0,0.04),0px_20px_40px_rgba(0,0,0,0.08)]'
        )}
      >
        <h3 className="font-semibold text-navy mb-4">How Aptly Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: 1, title: 'Start Small', desc: 'Bite-sized lessons for quick understanding' },
            { step: 2, title: 'Practice', desc: 'Interactive quizzes reinforce learning' },
            { step: 3, title: 'Build Mastery', desc: 'Spaced repetition for long-term retention' },
            { step: 4, title: 'Stay Motivated', desc: 'Earn XP and celebrate achievements' },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-teal">{item.step}</span>
              </div>
              <div>
                <p className="font-medium text-navy text-sm">{item.title}</p>
                <p className="text-xs text-rich-black/50">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default NewUserDashboard;
