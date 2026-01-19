/**
 * PracticeAtom Component Tests
 * Phase 7.1: Testing practice exercise component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeAtom } from '../learning/PracticeAtom';
import type { PracticeContent, Atom } from '@/types';

// Mock useTimeTracking hook
vi.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: () => ({
    elapsedSeconds: 180,
    isActive: true,
    getTimeSpent: () => 180,
  }),
  formatTimeMMSS: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
}));

// Mock useInteractionLogger hook
vi.mock('@/hooks/useInteractionLogger', () => ({
  useInteractionLogger: () => ({
    logPracticeResponse: vi.fn(),
    logHintRequest: vi.fn(),
    logCoachInteraction: vi.fn(),
  }),
}));

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  post: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock fetch for coach feedback
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        message: 'Good start! Consider adding more specific audience targeting...',
      }),
  } as Response)
);

const mockPracticeContent: PracticeContent = {
  type: 'campaign_brief',
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

const mockAtom: Atom & { type: 'practice'; content: PracticeContent } = {
  id: 'atom-practice-1',
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  type: 'practice',
  title: 'Campaign Brief Exercise',
  content: mockPracticeContent,
  estimatedMinutes: 15,
  isRequired: true,
  order: 1,
};

describe('PracticeAtom', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders practice prompt', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(
      screen.getByText(/Create a social media campaign brief/i)
    ).toBeInTheDocument();
  });

  it('renders atom title', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText('Campaign Brief Exercise')).toBeInTheDocument();
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

  it('provides text area for user response', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder', 'Type your response here...');
  });

  it('shows time tracking display', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // The hook returns 180 seconds, which should display as 03:00
    expect(screen.getByText('03:00')).toBeInTheDocument();
  });

  it('allows typing in the response area', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'This is my campaign brief...');

    expect(textarea).toHaveValue('This is my campaign brief...');
  });

  it('allows viewing hints when clicking hint button', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Find the hint toggle button
    const hintButton = screen.getByRole('button', { name: /Need a hint\?/i });
    expect(hintButton).toBeInTheDocument();

    await user.click(hintButton);

    // After clicking, hints should be visible
    await waitFor(() => {
      // The component shows generic hints, not the content.hints
      expect(
        screen.getByText(/Start by identifying the main challenge/i)
      ).toBeInTheDocument();
    });
  });

  it('has Mark as Complete button', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /Mark as Complete/i });
    expect(completeButton).toBeInTheDocument();
  });

  it('disables complete button when response is empty', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /Mark as Complete/i });
    expect(completeButton).toBeDisabled();
  });

  it('enables complete button when response is typed', async () => {
    const user = userEvent.setup();
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'My response');

    const completeButton = screen.getByRole('button', { name: /Mark as Complete/i });
    expect(completeButton).not.toBeDisabled();
  });

  it('has Get Coach Feedback button when coachAvailable is true', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} coachAvailable={true} />);

    const feedbackButton = screen.getByRole('button', { name: /Get Coach Feedback/i });
    expect(feedbackButton).toBeInTheDocument();
  });

  it('disables Get Coach Feedback when response is empty', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} coachAvailable={true} />);

    const feedbackButton = screen.getByRole('button', { name: /Get Coach Feedback/i });
    expect(feedbackButton).toBeDisabled();
  });

  it('has sample solution toggle button', () => {
    render(<PracticeAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const sampleButton = screen.getByRole('button', { name: /View Sample Solution/i });
    expect(sampleButton).toBeInTheDocument();
  });
});
