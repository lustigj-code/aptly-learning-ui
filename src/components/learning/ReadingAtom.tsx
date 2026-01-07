'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Check, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTimeTracking, formatTimeMMSS } from '@/hooks/useTimeTracking';
import { post } from '@/lib/api/client';
import type { Atom, ReadingContent } from '@/types';

type ReadingAtomProps = {
  atom: Atom & { type: 'reading'; content: ReadingContent };
  onComplete: () => void;
  isLoading?: boolean;
};

export function ReadingAtom({ atom, onComplete, isLoading = false }: ReadingAtomProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { content } = atom;
  const relatedResources = content.relatedResources || [];

  // Time tracking
  const { elapsedSeconds, isActive, getTimeSpent } = useTimeTracking({
    atomId: atom.id,
    lessonId: atom.lessonId,
  });

  const submitCompletion = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await post('/api/progress/complete-atom', {
        atomId: atom.id,
        lessonId: atom.lessonId,
        moduleId: atom.lessonId.split('_')[0],
        courseId: atom.lessonId.split('_')[0],
        timeSpentSeconds: getTimeSpent(),
      });

      if (response.success) {
        onComplete();
      } else {
        console.error('Error completing atom:', response.error);
      }
    } catch (error) {
      console.error('Error completing atom:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [atom.id, atom.lessonId, getTimeSpent, onComplete]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const scrolled = element.scrollTop;
      const progress = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;

      setScrollProgress(progress);

      // Auto-complete at bottom
      if (progress >= 90 && !isCompleted) {
        setIsCompleted(true);
        submitCompletion();
      }
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [isCompleted, submitCompletion]);

  const handleManualComplete = async () => {
    setIsCompleted(true);
    await submitCompletion();
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full">
      {/* Progress Bar - Sticky */}
      <motion.div
        className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm p-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-navy">Reading Progress</span>
          <ProgressBar
            value={scrollProgress}
            max={100}
            size="sm"
            showLabel={true}
            labelPosition="right"
            animated={true}
            className="flex-1"
          />
          <div className="flex items-center gap-1 text-sm text-rich-black/60">
            <Clock size={14} className={isActive ? 'text-teal' : 'text-grey'} />
            <span className="font-mono">{formatTimeMMSS(elapsedSeconds)}</span>
          </div>
        </div>
      </motion.div>

      {/* Content Area */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto pr-4 space-y-6"
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-navy mb-2">{atom.title}</h1>
          <p className="text-sm text-rich-black/70">
            Estimated reading time: {atom.estimatedMinutes} minutes
          </p>
        </motion.div>

        {/* Markdown Content */}
        <motion.div
          className="prose prose-sm max-w-none space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card variant="default" padding="lg" className="space-y-4">
            <div className="prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-bold prose-p:text-navy prose-p:leading-relaxed prose-a:text-teal prose-a:hover:underline prose-strong:text-navy prose-code:bg-light-grey prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-rich-black">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content.body}
              </ReactMarkdown>
            </div>
          </Card>
        </motion.div>

        {/* Related Resources Section */}
        {relatedResources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card variant="outlined" padding="lg" className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-teal" />
                <h3 className="text-lg font-semibold text-navy">Related Resources</h3>
              </div>
              <div className="space-y-2">
                {relatedResources.map((resource, idx) => (
                  <motion.a
                    key={idx}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-light-grey hover:bg-light-teal/30 transition-colors duration-200 group"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-navy group-hover:text-teal transition-colors">
                          {resource.title}
                        </p>
                        <p className="text-xs text-rich-black/60 mt-1">
                          {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                        </p>
                      </div>
                      <ExternalLink
                        size={16}
                        className="text-teal flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </motion.a>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Spacer for bottom content */}
        <div className="h-20" />
      </div>

      {/* Completion Section - Sticky Bottom */}
      <motion.div
        className="sticky bottom-0 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm p-4 border-t border-light-grey"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 p-4 bg-success-light rounded-lg border border-success">
            <Check size={20} className="text-success" />
            <span className="font-semibold text-success">Completed!</span>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth={true}
            onClick={handleManualComplete}
            isLoading={isSubmitting}
            isDisabled={isSubmitting || isLoading}
          >
            Mark as Complete
          </Button>
        )}
        {scrollProgress < 90 && !isCompleted && (
          <p className="text-xs text-rich-black/60 text-center mt-2">
            Read to the bottom to auto-complete
          </p>
        )}
      </motion.div>
    </div>
  );
}
