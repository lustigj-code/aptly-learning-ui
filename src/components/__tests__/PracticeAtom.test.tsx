/**
 * PracticeAtom Component Tests
 * Phase 7.1: Testing practice exercise component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeAtom } from '../learning/PracticeAtom';
import type { PracticeContent } from '@/types';

// Mock dependencies
vi.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: () => ({
    elapsedSeconds: 180,
    isActive: true,
    getTimeSpent: () => 180,
  }),
}));

vi.mock('@/hooks/useCoach', () => ({
  useCoach: () => ({
    messages: [],
    sendMessage: vi.fn(),
    requestPracticeFeedback: vi.fn(() =>
      Promise.resolve({
        feedback: 'Good start! Consider adding more specific audience targeting...',
        score: 75,
      })
    ),
    isLoading: false,
  }),
}));

vi.mock('@/store/unifiedStore', () => ({
  useUnifiedStore: () => ({
    user: { id: 'test-user', name: 'Test User' },
    authUser: { uid: 'test-user' },
  }),
}));

const mockPracticeContent: PracticeContent = {
  exerciseType: 'campaign_brief',
  prompt: 'Create a social media campaign brief for a new fitness app targeting millennials.',
  context: 'The app helps users track workouts and nutrition. Budget: $5,000/month.',
  expectedOutcomes: [
    'Clear target audience definition',
    'Realistic budget allocation',
    'Platform selection with justification',
    'Content strategy outline',
  ],
  rubric: [
    { criterion: 'Audience Targeting', weight: 30 },
    { criterion: 'Budget Allocation', weight: 25 },
    { criterion: 'Platform Strategy', weight: 25 },
    { criterion: 'Content Plan', weight: 20 },
  ],
  minimumWordCount: 200,
  hints: [
    'Think about where your audience spends time online',
    'Consider which platforms align with fitness content',
    'Budget should cover both organic and paid strategies',
  ],
};

const mockAtom = {
  id: 'atom-practice-1',
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  type: 'practice' as const,
  title: 'Campaign Brief Exercise',
  content: mockPracticeContent,
  estimatedMinutes: 15,
  isRequired: true,
  masteryThreshold: 70,
};

describe('PracticeAtom', () => {
  const mockOnComplete = vi.fn();

  it('renders practice prompt', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(
      screen.getByText(/Create a social media campaign brief/i)
    ).toBeInTheDocument();
  });

  it('shows exercise context', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText(/Budget: \$5,000\/month/i)).toBeInTheDocument();
  });

  it('displays expected outcomes', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText(/Clear target audience definition/i)).toBeInTheDocument();
    expect(screen.getByText(/Realistic budget allocation/i)).toBeInTheDocument();
  });

  it('shows rubric criteria', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText(/Audience Targeting/i)).toBeInTheDocument();
    expect(screen.getByText(/30/)).toBeInTheDocument(); // 30% weight
  });

  it('provides text area for user response', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder');
  });

  it('shows word count', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'This is my campaign brief...');

    // Should show word count somewhere
    expect(screen.getByText(/word/i)).toBeInTheDocument();
  });

  it('enforces minimum word count', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText(/200.*word/i)).toBeInTheDocument();
  });

  it('submits for AI feedback', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Target audience: Millennials aged 25-35...');

    const submitButton = screen.getByRole('button', { name: /submit|get feedback/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Good start/i)).toBeInTheDocument();
    });
  });

  it('shows AI feedback with score', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'My response...');

    const submitButton = screen.getByRole('button', { name: /submit|get feedback/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/75/)).toBeInTheDocument(); // Score
    });
  });

  it('allows viewing hints', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const hintButton = screen.getByRole('button', { name: /hint|show hint/i });
    await user.click(hintButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Think about where your audience spends time/i)
      ).toBeInTheDocument();
    });
  });

  it('tracks time spent on practice', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show time spent
    expect(screen.getByText(/3:00/i)).toBeInTheDocument(); // 180 seconds
  });

  it('calls onComplete with score and time', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Detailed campaign brief...');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      const completeButton = screen.getByRole('button', { name: /complete/i });
      user.click(completeButton);
    });

    expect(mockOnComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        score: expect.any(Number),
        timeSpentSeconds: 180,
      })
    );
  });
});
