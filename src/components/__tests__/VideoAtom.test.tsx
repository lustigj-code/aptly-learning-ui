/**
 * VideoAtom Component Tests
 * Phase 7.1: Testing video player component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoAtom } from '../learning/VideoAtom';
import type { VideoContent, Atom } from '@/types';

// Mock useTimeTracking hook
vi.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: () => ({
    elapsedSeconds: 60,
    isActive: true,
    getTimeSpent: () => 60,
    pause: vi.fn(),
    resume: vi.fn(),
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
    logContentView: vi.fn(),
  }),
}));

// Mock API client
vi.mock('@/lib/api/client', () => ({
  post: vi.fn(() => Promise.resolve({ success: true })),
}));

// The VideoContent type uses videoUrl, not url
const mockVideoContent: VideoContent = {
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  duration: 300, // 5 minutes
  transcript: 'Video transcript text...',
  chapters: [
    { title: 'Introduction', timestamp: 0 },
    { title: 'Key Concepts', timestamp: 60 },
    { title: 'Summary', timestamp: 240 },
  ],
  keyTakeaways: ['Takeaway 1', 'Takeaway 2'],
};

const mockAtom: Atom & { type: 'video'; content: VideoContent } = {
  id: 'atom-video-1',
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  type: 'video',
  title: 'Introduction to Social Media Ads',
  content: mockVideoContent,
  estimatedMinutes: 5,
  isRequired: true,
  order: 1,
};

describe('VideoAtom', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders video title', () => {
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText('Introduction to Social Media Ads')).toBeInTheDocument();
  });

  it('renders YouTube embed when videoUrl is youtube', () => {
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const iframe = screen.getByTitle('Introduction to Social Media Ads');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src');
    expect(iframe.getAttribute('src')).toContain('youtube.com/embed');
  });

  it('displays chapter markers', () => {
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Key Concepts')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('allows clicking chapters', async () => {
    const user = userEvent.setup();
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const chapterButton = screen.getByText('Key Concepts');
    await user.click(chapterButton);

    // Chapter click should not throw an error
    expect(chapterButton).toBeInTheDocument();
  });

  it('has transcript toggle when transcript available', () => {
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Look for transcript toggle button
    const transcriptToggle = screen.getByRole('button', { name: /transcript/i });
    expect(transcriptToggle).toBeInTheDocument();
  });

  it('shows time tracking display', () => {
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Should show time tracking - formatted as 01:00 for 60 seconds
    expect(screen.getByText('01:00')).toBeInTheDocument();
  });

  it('has Mark as Complete button', () => {
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /Mark as Complete/i });
    expect(completeButton).toBeInTheDocument();
  });

  it('calls onComplete when complete button clicked', async () => {
    const user = userEvent.setup();
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /Mark as Complete/i });
    await user.click(completeButton);

    // onComplete is called after API success
    // The component may change state after click, verify onComplete was called
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('shows key takeaways when available', () => {
    render(<VideoAtom atom={mockAtom} onComplete={mockOnComplete} />);

    // Component should display key takeaways section
    expect(screen.getByText('Takeaway 1')).toBeInTheDocument();
    expect(screen.getByText('Takeaway 2')).toBeInTheDocument();
  });
});
