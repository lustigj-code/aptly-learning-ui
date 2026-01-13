'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RotateCcw, CheckCircle, AlertCircle, Clock, TrendingUp, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuizOption, QuizProgress } from '@/components/learning/QuizOption';
import { SocraticQuizHint } from '@/components/ai/SocraticQuizHint';
import { useTimeTracking, formatTimeMMSS } from '@/hooks/useTimeTracking';
import { useCoach } from '@/hooks/useCoach';
import { useInteractionLogger } from '@/hooks/useInteractionLogger';
import { post } from '@/lib/api/client';
import type { Atom, QuizContent, Question } from '@/types';
import type { QuizQuestion } from '@/lib/ai/quiz-ai-integration';
import { DifficultyIndicator } from '@/components/learning/DifficultyIndicator';

type QuizAtomProps = {
  atom: Atom & { type: 'quiz'; content: QuizContent };
  onComplete: (score: number) => void;
  isSubmitting?: boolean;
  // Struggle detection callback for proactive coach integration
  onStruggleDetected?: (struggleData: {
    consecutiveWrong: number;
    skillId?: string;
    questionId: string;
  }) => void;
  /** Optional normalized difficulty (0-1) for adaptive difficulty display */
  difficulty?: number;
};

// Skill update from BKT
type SkillUpdate = {
  skillId: string;
  skillName: string;
  previousMastery: number;
  newMastery: number;
  previousMasteryPercent: string;
  newMasteryPercent: string;
  isMastered: boolean;
};

type QuizState = {
  currentQuestionIndex: number;
  answers: Record<number, string | number | (string | number)[]>;
  showingFeedback: boolean;
  isComplete: boolean;
  score: number;
  attempts: number;
  // BKT skill tracking
  currentSkillUpdates: SkillUpdate[];
  allSkillUpdates: SkillUpdate[];
  newlyMasteredSkills: string[];
  // Struggle tracking for proactive coach
  consecutiveWrong: number;
  // AI hint tracking
  hintsViewed: Record<number, number>; // questionIndex -> hint level
  // AI explanation
  aiExplanation: string | null;
  loadingExplanation: boolean;
};

/**
 * Convert Question type to QuizQuestion type for AI integration
 */
function toQuizQuestion(question: Question, index: number): QuizQuestion {
  const options = question.options || [];
  const correctAnswerIndex = options.indexOf(question.correctAnswer as string);

  return {
    id: question.id || `q-${index}`,
    question: question.question,
    options: options,
    correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
    explanation: question.explanation || '',
    difficulty: String(question.difficulty || 3),
  };
}

export function QuizAtom({ atom, onComplete, onStruggleDetected, difficulty }: QuizAtomProps) {
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    showingFeedback: false,
    isComplete: false,
    score: 0,
    attempts: 0,
    currentSkillUpdates: [],
    allSkillUpdates: [],
    newlyMasteredSkills: [],
    consecutiveWrong: 0,
    hintsViewed: {},
    aiExplanation: null,
    loadingExplanation: false,
  });

  // AI Coach for "Explain Why" feature
  const { getQuizHelp, isLoading: coachLoading } = useCoach();

  // Interaction logging for ML model training
  const { logQuizAnswer, logHintRequest } = useInteractionLogger();

  // Track question start time for response time calculation
  const questionStartTimeRef = useRef<number>(Date.now());

  const { content } = atom;

  // Time tracking
  const { elapsedSeconds, isActive, getTimeSpent, reset: resetTimer } = useTimeTracking({
    atomId: atom.id,
    lessonId: atom.lessonId,
  });

  const questions = content.questions || [];
  const currentQuestion = questions[state.currentQuestionIndex];
  const passingScore = content.passingScore || 70;
  const allowRetakes = content.allowRetakes || false;

  const handleAnswerSelect = (answerValue: string | number | (string | number)[]) => {
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [state.currentQuestionIndex]: answerValue,
      },
    }));
  };

  const handleSubmitAnswer = async () => {
    const userAnswer = state.answers[state.currentQuestionIndex];
    const correct = checkAnswer(currentQuestion, userAnswer);

    // Calculate response time
    const responseTimeMs = Date.now() - questionStartTimeRef.current;

    // Track consecutive wrong answers for struggle detection
    const newConsecutiveWrong = correct ? 0 : state.consecutiveWrong + 1;

    // Log interaction for ML model training
    const skillId = currentQuestion.skills?.[0] || `skill-${atom.lessonId}-default`;
    const skillName = currentQuestion.skills?.[0] || 'General Knowledge';
    logQuizAnswer({
      questionId: currentQuestion.id || `q${atom.lessonId}.${state.currentQuestionIndex + 1}`,
      skillId,
      skillName,
      isCorrect: correct,
      selectedAnswer: String(userAnswer),
      correctAnswer: String(currentQuestion.correctAnswer),
      responseTimeMs,
      attemptNumber: state.attempts + 1,
      questionDifficulty: currentQuestion.difficulty,
      pMasteryBefore: 0.5, // TODO: Get actual mastery from BKT state
      pMasteryAfter: correct ? 0.6 : 0.4, // Will be updated by BKT response
    });

    // Trigger struggle callback if 3+ consecutive wrong answers
    if (newConsecutiveWrong >= 3 && onStruggleDetected) {
      const questionId = currentQuestion.id || `q${atom.lessonId}.${state.currentQuestionIndex + 1}`;
      onStruggleDetected({
        consecutiveWrong: newConsecutiveWrong,
        skillId: currentQuestion.skills?.[0],
        questionId,
      });
    }

    // Update skill mastery via BKT
    try {
      // Use the question's skill mapping if available, or generate questionId from index
      const questionId = currentQuestion.id || `q${atom.lessonId}.${state.currentQuestionIndex + 1}`;

      const response = await post<{ success: boolean; updates?: SkillUpdate[] }>('/api/skills', {
        questionId,
        correct,
        // Also pass skills from question if available
        skillIds: currentQuestion.skills || undefined,
      });

      if (response.success && response.data?.updates) {
        const updates = response.data.updates;

        // Check for newly mastered skills
        const newMastered = updates
          .filter((u) => u.isMastered && u.previousMastery < 0.95)
          .map((u) => u.skillName);

        setState((prev) => ({
          ...prev,
          showingFeedback: true,
          consecutiveWrong: newConsecutiveWrong,
          currentSkillUpdates: updates,
          allSkillUpdates: [...prev.allSkillUpdates, ...updates],
          newlyMasteredSkills: [...prev.newlyMasteredSkills, ...newMastered],
        }));
      } else {
        setState((prev) => ({
          ...prev,
          showingFeedback: true,
          consecutiveWrong: newConsecutiveWrong,
          currentSkillUpdates: [],
        }));
      }
    } catch (error) {
      console.error('Error updating skills:', error);
      setState((prev) => ({
        ...prev,
        showingFeedback: true,
        consecutiveWrong: newConsecutiveWrong,
        currentSkillUpdates: [],
      }));
    }
  };

  const handleNextQuestion = () => {
    if (state.currentQuestionIndex < questions.length - 1) {
      // Reset question start time for next question
      questionStartTimeRef.current = Date.now();
      setState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        showingFeedback: false,
        aiExplanation: null, // Clear AI explanation for next question
      }));
    } else {
      calculateScoreAndComplete();
    }
  };

  const calculateScoreAndComplete = async () => {
    let correctCount = 0;

    questions.forEach((question, idx) => {
      const userAnswer = state.answers[idx];
      const isCorrect = checkAnswer(question, userAnswer);
      if (isCorrect) correctCount++;
    });

    const score = Math.round((correctCount / questions.length) * 100);

    setState((prev) => ({
      ...prev,
      score,
      isComplete: true,
      attempts: prev.attempts + 1,
    }));

    // Submit to server
    await submitQuizCompletion(score);
  };

  const submitQuizCompletion = useCallback(async (score: number) => {
    try {
      const response = await post('/api/progress/complete-atom', {
        atomId: atom.id,
        lessonId: atom.lessonId,
        moduleId: atom.lessonId.split('_')[0],
        courseId: atom.lessonId.split('_')[0],
        score,
        timeSpentSeconds: getTimeSpent(),
      });

      if (response.success) {
        onComplete(score);
      } else {
        console.error('Error submitting quiz:', response.error);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  }, [atom.id, atom.lessonId, getTimeSpent, onComplete]);

  const checkAnswer = (question: Question, answer: unknown): boolean => {
    if (answer === undefined || answer === null) return false;

    if (question.type === 'multiple-choice' || question.type === 'true-false') {
      return answer === question.correctAnswer;
    }

    // Open-ended questions would typically be evaluated server-side
    return false;
  };

  // Track hint usage
  const handleHintViewed = (level: number) => {
    const currentHintsUsed = state.hintsViewed[state.currentQuestionIndex] || 0;
    const skillId = currentQuestion.skills?.[0] || `skill-${atom.lessonId}-default`;

    // Log hint request for ML model training
    logHintRequest({
      atomId: atom.id,
      skillId,
      questionId: currentQuestion.id || `q${atom.lessonId}.${state.currentQuestionIndex + 1}`,
      hintsUsedBefore: currentHintsUsed,
    });

    setState((prev) => ({
      ...prev,
      hintsViewed: {
        ...prev.hintsViewed,
        [state.currentQuestionIndex]: level,
      },
    }));
  };

  // Request AI explanation for wrong answer
  const handleExplainWhy = async () => {
    if (!currentQuestion) return;

    setState((prev) => ({ ...prev, loadingExplanation: true }));

    try {
      const userAnswer = state.answers[state.currentQuestionIndex];
      const prompt = `I got this question wrong. Question: "${currentQuestion.question}". I answered "${userAnswer}" but the correct answer is "${currentQuestion.correctAnswer}". Can you explain why my answer was wrong and help me understand the concept better?`;

      const response = await getQuizHelp(prompt);

      setState((prev) => ({
        ...prev,
        aiExplanation: response?.content || 'I can help explain this! The key is to understand the underlying concept.',
        loadingExplanation: false,
      }));
    } catch (error) {
      console.error('Error getting explanation:', error);
      setState((prev) => ({
        ...prev,
        aiExplanation: 'I can help explain this! Think about why each option might or might not be correct.',
        loadingExplanation: false,
      }));
    }
  };

  const isAnswered = state.answers[state.currentQuestionIndex] !== undefined;
  const isCorrect =
    isAnswered && checkAnswer(currentQuestion, state.answers[state.currentQuestionIndex]);
  const passed = state.score >= passingScore;

  if (state.isComplete) {
    return (
      <motion.div
        className="max-w-2xl mx-auto space-y-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Final Score Card */}
        <Card variant="gradient" padding="xl" className="text-center space-y-4">
          <div className="flex justify-center">
            {passed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle size={64} className="text-success" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <AlertCircle size={64} className="text-error" />
              </motion.div>
            )}
          </div>

          <h2 className="text-3xl font-bold text-navy">
            {passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
          </h2>

          <div className="space-y-2">
            <p className="text-5xl font-bold">
              <span className={passed ? 'text-success' : 'text-error'}>{state.score}%</span>
            </p>
            <p className="text-navy/70">
              {Object.values(state.answers).filter((ans, idx) => checkAnswer(questions[idx], ans))
                .length}{' '}
              of {questions.length} correct
            </p>
            <p className="text-sm text-navy/60">Passing score: {passingScore}%</p>
          </div>

          {!passed && allowRetakes && (
            <p className="text-sm text-navy/70 bg-yellow-light/20 p-3 rounded-lg">
              You can retake this quiz to improve your score.
            </p>
          )}
        </Card>

        {/* Newly Mastered Skills Celebration */}
        {state.newlyMasteredSkills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <Card variant="elevated" padding="lg" className="bg-gradient-to-r from-yellow/10 to-teal/10 border-2 border-yellow/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-yellow/20 rounded-full flex items-center justify-center">
                  <Sparkles size={20} className="text-yellow" />
                </div>
                <div>
                  <h3 className="font-bold text-navy">Skills Mastered!</h3>
                  <p className="text-sm text-rich-black/60">You've reached 95%+ mastery</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.newlyMasteredSkills.map((skillName, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium"
                  >
                    {skillName}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Skill Progress Summary */}
        {state.allSkillUpdates.length > 0 && (
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-teal" />
              <h3 className="font-semibold text-navy">Skill Progress Summary</h3>
            </div>
            <div className="space-y-3">
              {/* Aggregate skill updates by skillId (use final value) */}
              {Object.values(
                state.allSkillUpdates.reduce((acc, update) => {
                  acc[update.skillId] = update;
                  return acc;
                }, {} as Record<string, SkillUpdate>)
              ).map((update) => (
                <div key={update.skillId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy">{update.skillName}</span>
                    <span className={cn(
                      'text-sm font-semibold',
                      update.isMastered ? 'text-success' : 'text-teal'
                    )}>
                      {update.newMasteryPercent}
                      {update.isMastered && ' ✓'}
                    </span>
                  </div>
                  <ProgressBar
                    value={update.newMastery * 100}
                    size="sm"
                    color={update.isMastered ? 'success' : 'teal'}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Retake Button */}
        {!passed && allowRetakes && (
          <Button
            variant="primary"
            size="lg"
            fullWidth={true}
            onClick={() => {
              setState({
                currentQuestionIndex: 0,
                answers: {},
                showingFeedback: false,
                isComplete: false,
                score: 0,
                attempts: state.attempts,
                currentSkillUpdates: [],
                allSkillUpdates: [],
                newlyMasteredSkills: [],
                consecutiveWrong: 0,
                hintsViewed: {},
                aiExplanation: null,
                loadingExplanation: false,
              });
              resetTimer(); // Reset timer for new attempt
            }}
            leftIcon={<RotateCcw size={20} />}
            className="min-h-[48px]" // Enhanced touch target for mobile
          >
            Retake Quiz
          </Button>
        )}
      </motion.div>
    );
  }

  if (!currentQuestion) {
    return <div>No questions available</div>;
  }

  const options = currentQuestion.options || [];
  const selectedAnswer = state.answers[state.currentQuestionIndex];

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-navy">
            Question {state.currentQuestionIndex + 1} of {questions.length}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-rich-black/60">
              <Clock size={14} className={isActive ? 'text-teal' : 'text-grey'} />
              <span className="font-mono">{formatTimeMMSS(elapsedSeconds)}</span>
            </div>
            {/* Use adaptive difficulty if provided, otherwise fall back to question difficulty */}
            {difficulty !== undefined ? (
              <DifficultyIndicator
                difficulty={difficulty}
                scale="0-1"
                size="sm"
                animate={false}
              />
            ) : (
              <DifficultyIndicator
                difficulty={currentQuestion.difficulty || 3}
                scale="1-5"
                size="sm"
                animate={false}
              />
            )}
          </div>
        </div>
        <QuizProgress
          currentQuestion={state.currentQuestionIndex + 1}
          totalQuestions={questions.length}
        />
      </div>

      {/* Question Card */}
      <Card variant="elevated" padding="lg" className="space-y-6">
        {/* Question Text */}
        <motion.div
          key={state.currentQuestionIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="text-xl font-bold text-navy">{currentQuestion.question}</h2>
        </motion.div>

        {/* Options */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {options.map((option, idx) => (
            <QuizOption
              key={idx}
              label={option}
              optionLetter={String.fromCharCode(65 + idx)} // A, B, C, D
              isSelected={selectedAnswer === option}
              isCorrect={checkAnswer(currentQuestion, option)}
              isAnswered={state.showingFeedback}
              isDisabled={state.showingFeedback}
              onSelect={() => handleAnswerSelect(option)}
              className="min-h-[44px]" // Minimum touch target size for mobile
            />
          ))}
        </motion.div>

        {/* AI Hint Section - Only show before submitting */}
        {!state.showingFeedback && (
          <div className="border-t border-grey/20 pt-4 mt-4">
            <SocraticQuizHint
              question={toQuizQuestion(currentQuestion, state.currentQuestionIndex)}
              userMastery={50} // Default mastery, could be fetched from user state
              attemptNumber={state.attempts + 1}
              onHintViewed={handleHintViewed}
            />
          </div>
        )}
      </Card>

      {/* Feedback Section */}
      <AnimatePresence>
        {state.showingFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              variant={isCorrect ? 'default' : 'outlined'}
              padding="lg"
              className={cn(
                'border-2',
                isCorrect
                  ? 'border-success bg-success-light'
                  : 'border-error bg-error-light'
              )}
            >
              <div className="space-y-3">
                <h4
                  className={cn(
                    'font-bold text-lg',
                    isCorrect ? 'text-success' : 'text-error'
                  )}
                >
                  {isCorrect ? 'Correct!' : 'Not quite right'}
                </h4>

                <p className="text-navy">{currentQuestion.explanation}</p>

                {!isCorrect && (
                  <div className="bg-white/50 p-3 rounded-lg mt-3">
                    <p className="text-sm text-navy">
                      <span className="font-semibold">Correct answer: </span>
                      {options[options.indexOf(currentQuestion.correctAnswer as string)]}
                    </p>
                  </div>
                )}

                {/* AI Explain Why Button - Only for wrong answers */}
                {!isCorrect && !state.aiExplanation && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExplainWhy}
                    isLoading={state.loadingExplanation || coachLoading}
                    isDisabled={state.loadingExplanation || coachLoading}
                    leftIcon={<MessageCircle size={16} />}
                    className="mt-3 min-h-[44px]" // Mobile-friendly touch target
                  >
                    Explain Why
                  </Button>
                )}

                {/* AI Explanation Display */}
                {state.aiExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 bg-light-blue/20 rounded-lg border border-blue/30"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <MessageCircle size={16} className="text-blue mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-semibold text-navy">AI Coach Explanation</span>
                    </div>
                    <p className="text-sm text-rich-black">{state.aiExplanation}</p>
                  </motion.div>
                )}

                {/* Skill Mastery Updates */}
                {state.currentSkillUpdates.length > 0 && (
                  <div className="border-t border-grey/20 pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-teal" />
                      <span className="text-sm font-semibold text-navy">Skill Progress</span>
                    </div>
                    <div className="space-y-2">
                      {state.currentSkillUpdates.map((update) => (
                        <div key={update.skillId} className="flex items-center gap-3">
                          <span className="text-sm text-navy flex-1 truncate">{update.skillName}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-rich-black/60">{update.previousMasteryPercent}</span>
                            <span className="text-rich-black/40">→</span>
                            <span className={cn(
                              'font-semibold',
                              update.isMastered ? 'text-success' : 'text-teal'
                            )}>
                              {update.newMasteryPercent}
                            </span>
                            {update.isMastered && (
                              <Sparkles size={12} className="text-yellow" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {!state.showingFeedback ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth={true}
            onClick={handleSubmitAnswer}
            isDisabled={!isAnswered}
            rightIcon={<ChevronRight size={20} />}
            className="min-h-[48px]" // Enhanced touch target for mobile
          >
            Submit Answer
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth={true}
            onClick={handleNextQuestion}
            rightIcon={<ChevronRight size={20} />}
            className="min-h-[48px]" // Enhanced touch target for mobile
          >
            {state.currentQuestionIndex < questions.length - 1
              ? 'Next Question'
              : 'See Results'}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
