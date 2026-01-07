'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RotateCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuizOption, QuizProgress } from '@/components/learning/QuizOption';
import { useTimeTracking, formatTimeMMSS } from '@/hooks/useTimeTracking';
import { post } from '@/lib/api/client';
import type { Atom, QuizContent, Question } from '@/types';

type QuizAtomProps = {
  atom: Atom & { type: 'quiz'; content: QuizContent };
  onComplete: (score: number) => void;
  isSubmitting?: boolean;
};

type QuizState = {
  currentQuestionIndex: number;
  answers: Record<number, string | number | (string | number)[]>;
  showingFeedback: boolean;
  isComplete: boolean;
  score: number;
  attempts: number;
};

export function QuizAtom({ atom, onComplete }: QuizAtomProps) {
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    showingFeedback: false,
    isComplete: false,
    score: 0,
    attempts: 0,
  });

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
    setState((prev) => ({
      ...prev,
      showingFeedback: true,
    }));
  };

  const handleNextQuestion = () => {
    if (state.currentQuestionIndex < questions.length - 1) {
      setState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        showingFeedback: false,
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
              });
              resetTimer(); // Reset timer for new attempt
            }}
            leftIcon={<RotateCcw size={20} />}
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
            <span className="text-xs font-medium text-teal">
              Difficulty: {currentQuestion.difficulty}/5
            </span>
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
            />
          ))}
        </motion.div>
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
