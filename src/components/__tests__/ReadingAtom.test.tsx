/**
 * ReadingAtom Component Tests
 * Phase 7.1: Testing reading content component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingAtom } from '../learning/ReadingAtom';
import type { ReadingContent } from '@/types';

// Mock dependencies
vi.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: () => ({
    elapsedSeconds: 120,
    isActive: true,
    getTimeSpent: () => 120,
  }),
  formatTimeMMSS: (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`,
}));

vi.mock('@/hooks/useCoach', () => ({
  useCoach: () => ({
    getSummary: vi.fn(() => Promise.resolve({ content: 'AI generated summary' })),
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useInteractionLogger', () => ({
  useInteractionLogger: () => ({
    logContentView: vi.fn(),
  }),
}));

vi.mock('@/lib/api/client', () => ({
  post: vi.fn(() => Promise.resolve({ success: true })),
}));

// The component expects content.body and content.highlights
const mockReadingContent: ReadingContent = {
  body: '# Social Media Marketing Basics\n\nSocial media marketing is the practice of promoting your brand...',
  highlights: [
    'Social media builds brand awareness',
    'Engagement is key to success',
    'Content should provide value',
  ],
  relatedResources: [],
};

const mockAtom = {
  id: 'atom-reading-1',
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  type: 'reading' as const,
  title: 'Introduction to Social Media Marketing',
  content: mockReadingContent,
  estimatedMinutes: 5,
  isRequired: true,
  order: 1,
};

describe('ReadingAtom', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders markdown content', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // The component renders content.body as markdown
    expect(screen.getByText(/Social Media Marketing Basics/i)).toBeInTheDocument();
  });

  it('displays key takeaways (highlights)', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Component uses content.highlights for key takeaways
    expect(screen.getByText('Social media builds brand awareness')).toBeInTheDocument();
    expect(screen.getByText('Engagement is key to success')).toBeInTheDocument();
    expect(screen.getByText('Content should provide value')).toBeInTheDocument();
  });

  it('shows estimated reading time', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Shows "X min read"
    expect(screen.getByText(/5 min read/i)).toBeInTheDocument();
  });

  it('tracks actual time spent reading', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show time tracker - mocked elapsedSeconds is 120
    expect(screen.getByText(/02:00/i)).toBeInTheDocument();
  });

  it('has Mark as Complete button', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /Mark as Complete/i });
    expect(completeButton).toBeInTheDocument();
  });

  it('calls onComplete when Mark as Complete is clicked', async () => {
    const user = userEvent.setup();
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /Mark as Complete/i });
    await user.click(completeButton);

    // onComplete is called with no arguments after API success
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('renders markdown with proper formatting', () => {
    const contentWithFormatting: ReadingContent = {
      body: '## Subheading\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2',
      highlights: [],
      relatedResources: [],
    };

    const atomWithFormatting = {
      ...mockAtom,
      content: contentWithFormatting,
    };

    render(<ReadingAtom atom={atomWithFormatting} onComplete={mockOnComplete} />);

    expect(screen.getByText('Subheading')).toBeInTheDocument();
  });

  it('displays time tracker while reading', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show time tracker with formatted time
    expect(screen.getByText(/02:00/i)).toBeInTheDocument();
  });
});
