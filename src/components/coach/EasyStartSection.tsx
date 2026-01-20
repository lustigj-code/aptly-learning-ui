'use client';

import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/store/unifiedStore';
import { cn } from '@/lib/utils';

type EasyStartSectionProps = {
  onDismiss: () => void;
  className?: string;
};

export function EasyStartSection({ onDismiss, className }: EasyStartSectionProps) {
  const router = useRouter();
  const { currentLessonId, lessonsCompleted } = useProgress();

  // Get current lesson title based on progress
  // In a real app, this would come from course data lookup
  const getCurrentLessonTitle = () => {
    if (!currentLessonId) return 'Continue your lesson';

    // Mock lesson title lookup - in real app, fetch from course data
    const lessonTitles: Record<string, string> = {
      'c1-m1-l1': 'Introduction to Social Media Marketing',
      'c1-m1-l2': 'Understanding Your Audience',
      'c1-m1-l3': 'Building Your Strategy',
      'c3-m1-l1': 'Understanding Paid Social',
      'c3-m1-l2': 'Setting Your Campaign Objective',
      'c3-m1-l3': 'Understanding Ad Placements',
    };

    return lessonTitles[currentLessonId] || 'Continue your lesson';
  };

  const handleContinue = () => {
    router.push('/learn');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'bg-gradient-to-r from-teal/10 to-purple/10 rounded-xl p-4 border border-teal/20',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Play button */}
          <button
            onClick={handleContinue}
            className="flex-shrink-0 w-12 h-12 bg-teal rounded-xl flex items-center justify-center text-white hover:bg-teal/90 transition-colors shadow-md"
          >
            <Play size={20} className="ml-0.5" />
          </button>

          {/* Content */}
          <div className="min-w-0">
            <p className="text-xs text-teal font-semibold uppercase tracking-wide mb-0.5">
              Ready to continue?
            </p>
            <p className="text-sm font-medium text-navy truncate">
              {getCurrentLessonTitle()}
            </p>
            {lessonsCompleted.length > 0 && (
              <p className="text-xs text-rich-black/60 mt-0.5">
                {lessonsCompleted.length} lessons completed
              </p>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1.5 rounded-lg text-rich-black/40 hover:text-rich-black hover:bg-white/50 transition-colors"
          title="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
