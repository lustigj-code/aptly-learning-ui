'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronDown, Lightbulb, BookOpen, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTimeTracking, formatTimeMMSS } from '@/hooks/useTimeTracking';
import { post } from '@/lib/api/client';
import type { Atom, PracticeContent } from '@/types';

type PracticeAtomProps = {
  atom: Atom & { type: 'practice'; content: PracticeContent };
  onComplete: () => void;
  coachAvailable?: boolean;
};

type CoachMessage = {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
};

export function PracticeAtom({
  atom,
  onComplete,
  coachAvailable = true,
}: PracticeAtomProps) {
  const [userResponse, setUserResponse] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [showSampleSolution, setShowSampleSolution] = useState(false);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { content } = atom;

  // Time tracking
  const { elapsedSeconds, isActive, getTimeSpent } = useTimeTracking({
    atomId: atom.id,
    lessonId: atom.lessonId,
  });

  const handleGetCoachFeedback = async () => {
    if (!userResponse.trim()) return;

    setIsGettingFeedback(true);

    // Add user message
    const userMessage: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userResponse,
      timestamp: new Date(),
    };

    setCoachMessages((prev) => [...prev, userMessage]);

    try {
      // Build structured practice context for evaluation
      const practiceContext = {
        exerciseType: content.type,
        prompt: content.prompt,
        context: content.context,
        expectedOutcomes: content.expectedOutcomes,
        rubric: content.rubric || [],
        userResponse: userResponse,
      };

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...coachMessages.map((msg) => ({
              role: msg.role === 'coach' ? 'assistant' : 'user',
              content: msg.content,
            })),
            { role: 'user', content: userResponse },
          ],
          context: {
            userName: 'Learner',
            currentCourse: atom.lessonId.split('_')[0] || 'Course',
            currentModule: atom.lessonId.split('_')[0] || 'Module',
            currentLesson: atom.lessonId,
            currentAtom: atom.id,
            atomType: 'practice',
            atomContent: content.prompt,
            practiceContext: JSON.stringify(practiceContext),
          },
          type: 'practice_feedback',
        }),
      });

      const coachData = await response.json();
      if (response.ok) {
        const coachMessage: CoachMessage = {
          id: `coach-${Date.now()}`,
          role: 'coach',
          content: coachData.message,
          timestamp: new Date(),
        };
        setCoachMessages((prev) => [...prev, coachMessage]);
      }
    } catch (error) {
      console.error('Error getting coach feedback:', error);
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleComplete = useCallback(async () => {
    setIsCompleted(true);
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

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Time Tracking Header */}
      <div className="flex items-center justify-between bg-light-grey/50 rounded-lg px-4 py-2">
        <span className="text-sm font-medium text-navy">Practice Exercise</span>
        <div className="flex items-center gap-1 text-sm text-rich-black/60">
          <Clock size={14} className={isActive ? 'text-teal' : 'text-grey'} />
          <span className="font-mono">{formatTimeMMSS(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Exercise Prompt */}
      <Card variant="elevated" padding="lg" className="space-y-4 border-l-4 border-teal">
        <h2 className="text-2xl font-bold text-navy">{atom.title}</h2>
        <p className="text-navy leading-relaxed">{content.prompt}</p>

        {content.context && (
          <div className="bg-light-teal/20 p-4 rounded-lg border border-teal/30">
            <p className="text-sm font-semibold text-navy mb-2">Context:</p>
            <p className="text-sm text-navy">{content.context}</p>
          </div>
        )}
      </Card>

      {/* Expected Outcomes Section */}
      {content.expectedOutcomes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card variant="outlined" padding="lg" className="space-y-3">
            <h3 className="font-semibold text-navy">What to aim for:</h3>
            <ul className="space-y-2">
              {content.expectedOutcomes.map((outcome, idx) => (
                <motion.li
                  key={idx}
                  className="flex gap-3 items-start text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 + idx * 0.05 }}
                >
                  <div className="w-5 h-5 rounded-full bg-teal text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-navy flex-1">{outcome}</p>
                </motion.li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* User Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        <label className="block text-sm font-semibold text-navy">
          Your Response
        </label>
        <textarea
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          disabled={isCompleted}
          className={cn(
            'w-full min-h-32 p-4 rounded-lg border-2 border-grey',
            'focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20',
            'text-navy placeholder-rich-black/40 font-mono text-sm',
            'resize-none transition-colors duration-200',
            isCompleted && 'bg-light-grey cursor-not-allowed opacity-60'
          )}
          placeholder="Type your response here..."
        />
      </motion.div>

      {/* Hints Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <button
          onClick={() => setShowHints(!showHints)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-light-grey hover:bg-light-teal/20 transition-colors text-navy font-semibold"
        >
          <span className="flex items-center gap-2">
            <Lightbulb size={18} className="text-yellow" />
            Need a hint?
          </span>
          <motion.div
            animate={{ rotate: showHints ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={20} />
          </motion.div>
        </button>

        <AnimatePresence>
          {showHints && (
            <motion.div
              className="mt-2 space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {[
                'Start by identifying the main challenge in the scenario',
                'Think about how the concepts you learned apply here',
                'Consider both short-term and long-term implications',
                'Write clearly and structure your thoughts logically',
              ].map((hint, idx) => (
                <div key={idx} className="p-3 bg-yellow-light/20 rounded-lg border border-yellow/30">
                  <p className="text-sm text-navy">{hint}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Coach Messages */}
      {coachMessages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card variant="outlined" padding="lg" className="space-y-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-navy">Coach Feedback</h3>
            <div className="space-y-3">
              {coachMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'p-3 rounded-lg',
                    msg.role === 'coach'
                      ? 'bg-light-teal/20 border border-teal/30 text-navy'
                      : 'bg-light-grey text-navy ml-auto max-w-xs'
                  )}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-rich-black/50 mt-1">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Sample Solution Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <button
          onClick={() => setShowSampleSolution(!showSampleSolution)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-light-grey hover:bg-light-teal/20 transition-colors text-navy font-semibold"
        >
          <span className="flex items-center gap-2">
            <BookOpen size={18} className="text-teal" />
            View Sample Solution
          </span>
          <motion.div
            animate={{ rotate: showSampleSolution ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={20} />
          </motion.div>
        </button>

        <AnimatePresence>
          {showSampleSolution && (
            <motion.div
              className="mt-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-4 bg-light-teal/10 rounded-lg border border-teal/30">
                <p className="text-sm text-navy leading-relaxed">
                  A sample solution would include:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-navy">
                  <li>Clear explanation of your approach</li>
                  <li>Reference to specific concepts from the lesson</li>
                  <li>Practical examples or scenarios</li>
                  <li>Well-organized structure</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex gap-3 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        {coachAvailable && !isCompleted && (
          <Button
            variant="secondary"
            size="lg"
            onClick={handleGetCoachFeedback}
            isLoading={isGettingFeedback}
            isDisabled={!userResponse.trim() || isGettingFeedback}
            rightIcon={<Send size={20} />}
          >
            Get Coach Feedback
          </Button>
        )}

        {isCompleted ? (
          <div className="flex-1 flex items-center justify-center gap-2 p-4 bg-success-light rounded-lg border border-success">
            <Check size={20} className="text-success" />
            <span className="font-semibold text-success">Completed!</span>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth={!coachAvailable}
            onClick={handleComplete}
            isLoading={isSubmitting}
            isDisabled={!userResponse.trim() || isSubmitting}
            rightIcon={<Check size={20} />}
          >
            Mark as Complete
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
