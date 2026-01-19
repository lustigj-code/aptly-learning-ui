'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, BookOpen, Check, Clock, Lightbulb, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/Button';
import { useTimeTracking, formatTimeMMSS } from '@/hooks/useTimeTracking';
import { useCoach } from '@/hooks/useCoach';
import { useInteractionLogger } from '@/hooks/useInteractionLogger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { post } from '@/lib/api/client';
import type { Atom, ReadingContent } from '@/types';

type ReadingAtomProps = {
  atom: Atom & { type: 'reading'; content: ReadingContent };
  onComplete: () => void;
  isLoading?: boolean;
};

/**
 * Calculate estimated reading time based on word count
 * Average reading speed: ~200 words per minute
 */
function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function ReadingAtom({ atom, onComplete, isLoading = false }: ReadingAtomProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Track view start time for logging
  const viewStartTimeRef = useRef<number>(Date.now());
  const hasLoggedViewRef = useRef<boolean>(false);

  // AI Coach for summary feature
  const { getSummary, isLoading: coachLoading } = useCoach();

  // Interaction logging for ML model training
  const { logContentView } = useInteractionLogger();

  const { content } = atom;
  const relatedResources = content.relatedResources || [];
  const highlights = content.highlights || [];

  // Calculate reading time from content
  const estimatedMinutes = atom.estimatedMinutes || calculateReadingTime(content.body);

  // Time tracking
  const { elapsedSeconds, isActive, getTimeSpent } = useTimeTracking({
    atomId: atom.id,
    lessonId: atom.lessonId,
  });

  // Log content view when component unmounts or completes
  useEffect(() => {
    // Capture the ref value at effect creation time
    const startTime = viewStartTimeRef.current;

    return () => {
      // Log content view on unmount if not already logged
      if (!hasLoggedViewRef.current) {
        const viewDurationMs = Date.now() - startTime;
        logContentView({
          atomId: atom.id,
          atomType: 'reading',
          viewDurationMs,
        });
        hasLoggedViewRef.current = true;
      }
    };
  }, [atom.id, logContentView]);

  // Calculate time-based progress
  const targetSeconds = estimatedMinutes * 60;
  const timeProgress = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

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

  const handleManualComplete = async () => {
    // Log content view on completion
    if (!hasLoggedViewRef.current) {
      const viewDurationMs = Date.now() - viewStartTimeRef.current;
      logContentView({
        atomId: atom.id,
        atomType: 'reading',
        viewDurationMs,
      });
      hasLoggedViewRef.current = true;
    }

    setIsCompleted(true);
    await submitCompletion();
  };

  // Request AI summary of the content
  const handleGetSummary = async () => {
    if (aiSummary) {
      // Already have summary, just show it
      setShowSummary(true);
      return;
    }

    setLoadingSummary(true);
    setShowSummary(true);

    try {
      const response = await getSummary(content.body, {
        currentLesson: atom.lessonId,
        currentAtom: atom.id,
        atomType: 'reading',
        atomContent: content.body.substring(0, 500), // First 500 chars for context
      });

      setAiSummary(response?.content || 'Here are the key points from this reading...');
    } catch (error) {
      console.error('Error getting summary:', error);
      setAiSummary('This content covers important concepts. Focus on the Key Takeaways section for the main points.');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Time-Based Progress Header - Sticky */}
      <motion.div
        className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-light-grey/60 px-4 py-3 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        <div className="max-w-[680px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-teal" />
            <span className="text-sm font-medium text-navy">{estimatedMinutes} min read</span>
          </div>
          <div className="flex items-center gap-4">
            {/* AI Summary Button */}
            <button
              onClick={handleGetSummary}
              disabled={loadingSummary || coachLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal bg-light-teal/30 hover:bg-light-teal/50 rounded-full transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>AI Summary</span>
            </button>
            <div className="flex items-center gap-2 text-sm text-rich-black/60">
              <Clock size={14} className={isActive ? 'text-teal' : 'text-grey'} />
              <span className="font-mono">{formatTimeMMSS(elapsedSeconds)}</span>
              <span className="text-xs">({timeProgress}%)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Summary Panel */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-light-teal/20 to-light-blue/20 border-b border-teal/30"
          >
            <div className="max-w-[680px] mx-auto px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 bg-teal/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-teal" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy mb-2">AI Summary</h3>
                    {loadingSummary || coachLoading ? (
                      <div className="flex items-center gap-2 text-sm text-rich-black/60">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal border-t-transparent" />
                        <span>Generating summary...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-rich-black leading-relaxed">{aiSummary}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowSummary(false)}
                  className="p-1 text-rich-black/40 hover:text-rich-black/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area - Centered, Optimal Reading Width */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-[680px] mx-auto space-y-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-3xl font-bold text-navy mb-2">{atom.title}</h1>
          </motion.div>

          {/* Markdown Content - Optimized Typography */}
          <motion.article
            className="prose prose-lg prose-headings:text-navy prose-headings:font-bold prose-p:text-rich-black prose-p:leading-relaxed prose-a:text-teal prose-a:hover:underline prose-strong:text-navy prose-code:bg-light-grey prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:text-rich-black"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.body}
            </ReactMarkdown>
          </motion.article>

          {/* Key Takeaways Section */}
          {highlights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-light-teal/20 border border-teal/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={20} className="text-teal" />
                <h3 className="text-lg font-semibold text-navy">Key Takeaways</h3>
              </div>
              <ul className="space-y-2">
                {highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check size={16} className="text-teal mt-1 flex-shrink-0" />
                    <span className="text-rich-black">{highlight}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Related Resources Section */}
          {relatedResources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="pt-6 border-t border-light-grey"
            >
              <div className="flex items-center gap-2 mb-4">
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
                    className="block p-3 rounded-lg hover:bg-light-teal/20 transition-colors duration-150 group"
                    whileHover={!prefersReducedMotion ? { x: 4 } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-navy group-hover:text-teal transition-colors">
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
            </motion.div>
          )}

          {/* Bottom Spacing for Sticky Footer */}
          <div className="h-24" />
        </div>
      </div>

      {/* Completion Section - Sticky Bottom */}
      <motion.div
        className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-light-grey/60 px-4 py-4 shadow-lg shadow-navy/5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30, delay: 0.2 }}
      >
        <div className="max-w-[680px] mx-auto">
          {isCompleted ? (
            <motion.div
              className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-green-50 to-success-light/30 rounded-xl border border-green-200 shadow-md shadow-success/20"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 15, delay: 0.1 }}
              >
                <Check size={20} className="text-green-600" />
              </motion.div>
              <span className="font-semibold text-green-600">Completed!</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
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
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
