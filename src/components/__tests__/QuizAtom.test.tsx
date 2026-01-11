/**
 * QuizAtom Component Tests
 * Phase 7.1: Test Suite Creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizAtom } from '../learning/QuizAtom';
import type { QuizContent } from '@/types';

// Mock dependencies
vi.mock('@/store/unifiedStore', () => ({
  useUnifiedStore: () => ({
    user: { id: 'test-user', name: 'Test User' },
    authUser: { uid: 'test-user' },
  }),
}));

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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
}));

vi.mock('@/hooks/useCelebratedProgress', () => ({
  useCelebratedProgress: () => ({
    celebrate: vi.fn(),
  }),
}));

// Sample quiz content
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
      correctAnswer: 1,
      explanation: 'Social media marketing primarily builds brand awareness and engages with your audience.',
      difficulty: 'medium',
    },
    {
      id: 'q2',
      question: 'Which metric is most important for engagement?',
      options: ['Impressions', 'Likes and comments', 'Follower count', 'Click-through rate'],
      correctAnswer: 1,
      explanation: 'Likes and comments show active engagement from your audience.',
      difficulty: 'easy',
    },
  ],
  passingScore: 70,
  allowRetake: true,
  randomizeQuestions: false,
  randomizeOptions: false,
};

const mockAtom = {
  id: 'atom-quiz-1',
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  type: 'quiz' as const,
  title: 'Social Media Marketing Basics Quiz',
  content: mockQuizContent,
  estimatedMinutes: 10,
  isRequired: true,
  masteryThreshold: 80,
};

describe('QuizAtom', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quiz title and question count', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText('Social Media Marketing Basics Quiz')).toBeInTheDocument();
    expect(screen.getByText(/2 questions/i)).toBeInTheDocument();
  });

  it('displays first question on start', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(
      screen.getByText('What is the primary goal of social media marketing?')
    ).toBeInTheDocument();
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

    // Check if option is selected (visual feedback)
    expect(option.closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows explanation after submitting answer', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Select correct answer
    await user.click(screen.getByText('Build brand awareness and engagement'));

    // Submit
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Social media marketing primarily builds brand awareness/)
      ).toBeInTheDocument();
    });
  });

  it('advances to next question after correct answer', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Answer first question
    await user.click(screen.getByText('Build brand awareness and engagement'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    // Click next
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Which metric is most important for engagement?')
      ).toBeInTheDocument();
    });
  });

  it('calculates score correctly', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Answer first question correctly
    await user.click(screen.getByText('Build brand awareness and engagement'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Answer second question correctly
    await user.click(screen.getByText('Likes and comments'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      // Should show 100% score
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  it('calls onComplete with correct data after quiz completion', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Answer both questions correctly
    await user.click(screen.getByText('Build brand awareness and engagement'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await user.click(screen.getByText('Likes and comments'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    // Click complete button
    await user.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 100,
          timeSpentSeconds: 45,
        })
      );
    });
  });

  it('shows failing message when score is below passing threshold', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Answer first question wrong
    await user.click(screen.getByText('Increase website traffic'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Answer second question wrong
    await user.click(screen.getByText('Impressions'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      // Should show 0% score
      expect(screen.getByText(/0%/)).toBeInTheDocument();
      expect(screen.getByText(/below the passing score/i)).toBeInTheDocument();
    });
  });

  it('allows retaking quiz if allowRetake is true', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Complete quiz with failing score
    await user.click(screen.getByText('Increase website traffic'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await user.click(screen.getByRole('button', { name: /next question/i }));

    await user.click(screen.getByText('Impressions'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    // Should show retake button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retake quiz/i })).toBeInTheDocument();
    });
  });

  it('tracks time spent on quiz', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show time tracking
    expect(screen.getByText(/0:45/)).toBeInTheDocument(); // Formatted time from mock
  });

  it('disables submit button until answer is selected', () => {
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole('button', { name: /submit answer/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button after selecting an answer', async () => {
    const user = userEvent.setup();
    render(<QuizAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole('button', { name: /submit answer/i });
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByText('Build brand awareness and engagement'));

    expect(submitButton).toBeEnabled();
  });
});
