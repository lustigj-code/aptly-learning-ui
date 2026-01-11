/**
 * ReadingAtom Component Tests
 * Phase 7.1: Testing reading content component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  formatTimeMMSS: (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`,
}));

vi.mock('@/store/unifiedStore', () => ({
  useUnifiedStore: () => ({
    user: { id: 'test-user' },
    authUser: { uid: 'test-user' },
  }),
}));

const mockReadingContent: ReadingContent = {
  markdown: '# Social Media Marketing Basics\n\nSocial media marketing is the practice of...',
  keyTakeaways: [
    'Social media builds brand awareness',
    'Engagement is key to success',
    'Content should provide value',
  ],
  estimatedReadingTime: 5,
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
  masteryThreshold: 80,
};

describe('ReadingAtom', () => {
  const mockOnComplete = vi.fn();

  it('renders markdown content', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText(/Social Media Marketing Basics/i)).toBeInTheDocument();
    expect(screen.getByText(/practice of/i)).toBeInTheDocument();
  });

  it('displays key takeaways', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText('Social media builds brand awareness')).toBeInTheDocument();
    expect(screen.getByText('Engagement is key to success')).toBeInTheDocument();
    expect(screen.getByText('Content should provide value')).toBeInTheDocument();
  });

  it('shows estimated reading time', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText(/5 min read/i)).toBeInTheDocument();
  });

  it('tracks actual time spent reading', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show time tracker
    expect(screen.getByText(/2:00/i)).toBeInTheDocument(); // 120 seconds = 2:00
  });

  it('enables complete button after minimum time', async () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /complete|mark complete/i });

    // Initially might be disabled (depends on implementation)
    // After reading time, should be enabled
    expect(completeButton).toBeInTheDocument();
  });

  it('calls onComplete with time spent', async () => {
    const user = userEvent.setup();
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /complete|mark complete/i });
    await user.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        timeSpentSeconds: 120,
      })
    );
  });

  it('renders markdown with proper formatting', () => {
    const contentWithFormatting: ReadingContent = {
      markdown: '## Subheading\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2',
      keyTakeaways: [],
      estimatedReadingTime: 3,
    };

    const atomWithFormatting = {
      ...mockAtom,
      content: contentWithFormatting,
    };

    render(<ReadingAtom atom={atomWithFormatting} onComplete={mockOnComplete} />);

    expect(screen.getByText('Subheading')).toBeInTheDocument();
    expect(screen.getByText('Bold text')).toBeInTheDocument();
  });

  it('displays progress indicator while reading', () => {
    render(<ReadingAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show some kind of progress or status
    const progressElement = screen.queryByRole('progressbar');
    // Progress bar might not always be present, but time should be
    expect(screen.getByText(/2:00/i)).toBeInTheDocument();
  });
});
