/**
 * QuizAtom Component Tests
 * Phase 7.1: Test Suite Creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizAtom } from '../learning/QuizAtom';
import type { QuizContent, Atom } from '@/types';

// Mock useTimeTracking hook
vi.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: () => ({
    elapsedSeconds: 45,
    isActive: true,
    getTimeSpent: () => 45,
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
  }),
  formatTimeMMSS: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
}));

// Mock useCoach hook
vi.mock('@/hooks/useCoach', () => ({
  useCoach: () => ({
    getQuizHelp: vi.fn(() => Promise.resolve({ content: 'Here is an explanation...' })),
    isLoading: false,
  }),
}));

// Mock useInteractionLogger hook
vi.mock('@/hooks/useInteractionLogger', () => ({
  useInteractionLogger: () => ({
    logQuizAnswer: vi.fn(),
    logHintRequest: vi.fn(),
  }),
}));

// Mock useAdaptiveQuiz hook
vi.mock('@/hooks/useAdaptiveQuiz', () => ({
  useAdaptiveQuiz: () => ({
    targetDifficulty: 0.5,
    recordAnswer: vi.fn(),
    needsRemediation: false,
    remediationTopic: null,
    struggleConcepts: [],
  }),
}));

// Mock API client
vi.mock('@/lib/api/client', () => ({
  post: vi.fn(() => Promise.resolve({ success: true, data: { updates: [] } })),
}));

// Sample quiz content - correctAnswer is the actual string value
const mockQuizContent: QuizContent = {
  questions: [
    {
      id: 'q1',
      question: 'What is the primary goal of social media marketing?',
      options: [
        'Increase website traffic',
        'Build brand awareness and engagement',
        'Sell products directly',
        'Collect customer data',
      ],
      correctAnswer: 'Build brand awareness and engagement',
      explanation: 'Social media marketing primarily builds brand awareness and engages with your audience.',
      difficulty: 3,
      type: 'multiple-choice',
    },
    {
      id: 'q2',
      question: 'Which metric is most important for engagement?',
      options: ['Impressions', 'Likes and comments', 'Follower count', 'Click-through rate'],
      correctAnswer: 'Likes and comments',
      explanation: 'Likes and comments show active engagement from your audience.',
      difficulty: 2,
      type: 'multiple-choice',
    },
  ],
  passingScore: 70,
  allowRetakes: true, // Note: component uses allowRetakes (plural)
  randomizeQuestions: false,
  randomizeOptions: false,
};

const mockAtom: Atom & { type: 'quiz'; content: QuizContent } = {
  id: 'atom-quiz-1',
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  type: 'quiz',
  title: 'Social Media Marketing Basics Quiz',
  content: mockQuizContent,
  estimatedMinutes: 10,
  isRequired: true,
  order: 1,
};

describe('QuizAtom', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage to avoid test interference
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('renders quiz with question', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show the first question
    expect(
      screen.getByText('What is the primary goal of social media marketing?')
    ).toBeInTheDocument();
  });

  it('shows question progress', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText(/Question 1 of 2/i)).toBeInTheDocument();
  });

  it('shows all answer options', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText('Increase website traffic')).toBeInTheDocument();
    expect(screen.getByText('Build brand awareness and engagement')).toBeInTheDocument();
    expect(screen.getByText('Sell products directly')).toBeInTheDocument();
    expect(screen.getByText('Collect customer data')).toBeInTheDocument();
  });

  it('allows selecting an answer option', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const option = screen.getByText('Build brand awareness and engagement');
    await user.click(option);

    // After selection, the Submit Answer button should be enabled
    const submitButton = screen.getByRole('button', { name: /Submit Answer/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows explanation after submitting answer', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Select correct answer
    await user.click(screen.getByText('Build brand awareness and engagement'));

    // Submit
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Social media marketing primarily builds brand awareness/)
      ).toBeInTheDocument();
    });
  });

  it('shows Next Question button after submitting', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Select correct answer
    await user.click(screen.getByText('Build brand awareness and engagement'));

    // Submit
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
    });
  });

  it('advances to next question after clicking Next Question', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Answer first question
    await user.click(screen.getByText('Build brand awareness and engagement'));
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    // Wait for feedback, then click next
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Next Question/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Which metric is most important for engagement?')
      ).toBeInTheDocument();
    });
  });

  it('shows See Results on last question', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Answer first question correctly
    await user.click(screen.getByText('Build brand awareness and engagement'));
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));
    await waitFor(() => screen.getByRole('button', { name: /Next Question/i }));
    await user.click(screen.getByRole('button', { name: /Next Question/i }));

    // Answer second question
    await waitFor(() => screen.getByText('Likes and comments'));
    await user.click(screen.getByText('Likes and comments'));
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    // Should show "See Results" instead of "Next Question"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /See Results/i })).toBeInTheDocument();
    });
  });

  it('tracks time spent on quiz', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // The mock returns 45 seconds, formatted as 00:45
    expect(screen.getByText('00:45')).toBeInTheDocument();
  });

  it('disables Submit Answer button until answer is selected', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole('button', { name: /Submit Answer/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables Submit Answer button after selecting an answer', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole('button', { name: /Submit Answer/i });
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByText('Build brand awareness and engagement'));

    expect(submitButton).not.toBeDisabled();
  });

  it('shows Correct! feedback for correct answers', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Select correct answer
    await user.click(screen.getByText('Build brand awareness and engagement'));
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    await waitFor(() => {
      expect(screen.getByText('Correct!')).toBeInTheDocument();
    });
  });

  it('shows Not quite right feedback for wrong answers', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Select wrong answer
    await user.click(screen.getByText('Increase website traffic'));
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    await waitFor(() => {
      expect(screen.getByText('Not quite right')).toBeInTheDocument();
    });
  });
});
