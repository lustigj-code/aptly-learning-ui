/**
 * CoachLearningView Component Tests
 * Task 2.Q2: Critical Component Tests for Main Learning View
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoachLearningView } from '../learning/CoachLearningView';
import type { Module, Lesson, Atom } from '@/types';

// Mock course content
const mockAtom: Atom = {
  id: 'atom-1',
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  type: 'reading',
  title: 'Introduction to Social Media',
  content: {
    body: 'Social media marketing is a powerful tool...',
    estimatedReadTimeMinutes: 5,
  },
  estimatedMinutes: 5,
  isRequired: true,
  order: 1,
};

const mockLesson: Lesson = {
  id: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  number: 1,
  title: 'Understanding Paid Social',
  objectives: ['Understand the basics'],
  estimatedMinutes: 15,
  atoms: [mockAtom],
  isLocked: false,
};

const mockModule: Module = {
  id: 'module-1',
  courseId: 'course-1',
  number: 1,
  title: 'Social Media Marketing Fundamentals',
  objectives: ['Learn the fundamentals'],
  estimatedMinutes: 60,
  lessons: [mockLesson],
  isLocked: false,
};

// Mock courseRegistry module
vi.mock('@/data/courseRegistry', () => ({
  getCourse: vi.fn(() => ({
    id: 'course-1',
    title: 'Social Media Marketing',
    modules: [mockModule],
  })),
  getDefaultCourse: vi.fn(() => ({
    id: 'course-1',
    title: 'Social Media Marketing',
    modules: [mockModule],
  })),
  DEFAULT_COURSE_ID: 'course-1',
}));

// Mock useCourse and useModule hooks
vi.mock('@/hooks/useCourseContent', () => ({
  useCourse: vi.fn(() => ({
    data: {
      id: 'course-1',
      title: 'Social Media Marketing',
      modules: [mockModule],
    },
    isLoading: false,
    error: null,
  })),
  useModule: vi.fn(() => ({
    data: mockModule,
    isLoading: false,
    error: null,
  })),
  usePrefetchNextLesson: vi.fn(),
}));

// Mock useUser from unifiedStore
vi.mock('@/store/unifiedStore', () => ({
  useUser: vi.fn(() => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      progress: {
        currentCourseId: 'course-1',
        currentModuleId: 'module-1',
        lessonsCompleted: [],
        atomsCompleted: [],
      },
    },
    isLoading: false,
    error: null,
  })),
}));

// Mock useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Mock useReviewQueue hook
vi.mock('@/hooks/useReviewQueue', () => ({
  useReviewQueue: vi.fn(() => ({
    dueCount: 0,
    isLoading: false,
  })),
}));

// Mock useOfflineSync hook
vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: vi.fn(() => ({
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
    withOfflineSupport: vi.fn((fn) => fn()),
    syncPendingProgress: vi.fn(),
  })),
}));

// Mock useLearningPreference hook
vi.mock('@/hooks/useLearningPreference', () => ({
  useLearningPreference: vi.fn(() => ({
    sessionRecommendation: null,
    prefersVideo: false,
    prefersReading: true,
  })),
}));

// Mock useMasteryLevels hook
vi.mock('@/hooks/useMasteryLevels', () => ({
  useMasteryLevels: vi.fn(() => ({
    masteryLevels: {},
    isColdStart: false,
    isLoading: false,
  })),
}));

// Mock courseToConceptMap
vi.mock('@/data/courseToConceptMap', () => ({
  areLessonPrerequisitesMet: vi.fn(() => true),
  getMissingPrerequisites: vi.fn(() => []),
}));

// Mock knowledgeGraph
vi.mock('@/lib/mastery/knowledgeGraph', () => ({
  SOCIAL_MEDIA_MARKETING_GRAPH: {
    concepts: {},
  },
}));

// Mock struggleDetector
vi.mock('@/lib/coach/struggleDetector', () => ({
  initStruggleTracking: vi.fn(),
  recordAnswer: vi.fn(() => ({ isStruggling: false, signals: [] })),
  recordContentView: vi.fn(() => ({ isStruggling: false, signals: [] })),
  clearStruggleTracking: vi.fn(),
}));

// Mock optimalTiming
vi.mock('@/lib/coach/optimalTiming', () => ({
  checkSessionTransition: vi.fn(() => null),
  filterByPreferences: vi.fn(() => null),
  DEFAULT_TIMING_PREFERENCES: {
    enableWarmupTips: true,
    enableStreakCelebrations: true,
    enableProgressMilestones: true,
    enableBreakReminders: true,
    enableTransitionMessages: true,
  },
}));

// Mock ContentRenderer component
vi.mock('../learning/ContentRenderer', () => ({
  ContentRenderer: vi.fn(({ atom, onComplete }) => (
    <div data-testid="content-renderer">
      <h2>{atom.title}</h2>
      <button onClick={() => onComplete(atom.id)}>Complete</button>
    </div>
  )),
}));

// Mock SwipeableAtomView component
vi.mock('../learning/SwipeableAtomView', () => ({
  SwipeableAtomView: vi.fn(({ children }) => (
    <div data-testid="swipeable-atom-view">{children}</div>
  )),
}));

// Mock AnimatedContent component
vi.mock('../learning/AnimatedContent', () => ({
  AnimatedContent: vi.fn(({ children }) => (
    <div data-testid="animated-content">{children}</div>
  )),
}));

// Mock ContentSkeleton component
vi.mock('../learning/ContentSkeleton', () => ({
  ContentSkeleton: vi.fn(() => (
    <div data-testid="content-skeleton">Loading...</div>
  )),
}));

// Mock MainCoachChat component
vi.mock('../coach/MainCoachChat', () => ({
  MainCoachChat: vi.fn(() => (
    <div data-testid="main-coach-chat">Coach Chat</div>
  )),
}));

// Mock StrugglePrompt component
vi.mock('../coach/ProactivePrompt', () => ({
  StrugglePrompt: vi.fn(() => null),
}));

// Mock TimingPrompt component
vi.mock('../coach/TimingPrompt', () => ({
  TimingPrompt: vi.fn(() => null),
}));

// Mock PacingIndicator component
vi.mock('../learning/PacingIndicator', () => ({
  PacingIndicator: vi.fn(() => null),
  calculateAverageResponseTime: vi.fn(() => 30000),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  CheckCircle: () => <span data-testid="check-icon">Check</span>,
  ChevronRight: () => <span data-testid="chevron-icon">Chevron</span>,
  MessageCircle: () => <span data-testid="message-icon">Message</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeft</span>,
  Brain: () => <span data-testid="brain-icon">Brain</span>,
  WifiOff: () => <span data-testid="wifi-off-icon">WifiOff</span>,
  RefreshCw: () => <span data-testid="refresh-icon">Refresh</span>,
  BookOpen: () => <span data-testid="book-icon">Book</span>,
}));

// Import mocked hooks to update their return values
import { useCourse, useModule } from '@/hooks/useCourseContent';

const mockUseCourse = vi.mocked(useCourse);
const mockUseModule = vi.mocked(useModule);

describe('CoachLearningView Component', () => {
  const mockOnExit = vi.fn();
  const mockOnLessonComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Clear localStorage between tests
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }

    // Reset mock values
    mockUseCourse.mockReturnValue({
      data: {
        id: 'course-1',
        title: 'Social Media Marketing',
        modules: [mockModule],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useCourse>);

    mockUseModule.mockReturnValue({
      data: mockModule,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useModule>);
  });

  it('renders without crashing', () => {
    render(<CoachLearningView />);

    // Should render the main learning view
    expect(screen.getByTestId('content-renderer')).toBeInTheDocument();
  });

  it('displays content skeleton when course is loading', () => {
    mockUseCourse.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useCourse>);

    render(<CoachLearningView />);

    // Should show loading spinner
    expect(screen.getByText('Loading learning content...')).toBeInTheDocument();
  });

  it('displays error message when course fails to load', () => {
    const errorMessage = 'Failed to load course';
    mockUseCourse.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
    } as unknown as ReturnType<typeof useCourse>);

    render(<CoachLearningView />);

    // Should show error state
    expect(screen.getByText('Unable to Load Content')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('displays atom content when loaded', () => {
    render(<CoachLearningView />);

    // Should render the atom title from ContentRenderer mock
    expect(screen.getByText('Introduction to Social Media')).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(<CoachLearningView />);

    // Should show part indicator
    expect(screen.getByText(/Part 1 of 1/i)).toBeInTheDocument();
  });

  it('shows lesson title', () => {
    render(<CoachLearningView />);

    // Should show the lesson title (appears in header and sidebar)
    const lessonTitles = screen.getAllByText('Understanding Paid Social');
    expect(lessonTitles.length).toBeGreaterThanOrEqual(1);
  });

  it('shows exit button when onExit is provided', () => {
    render(<CoachLearningView onExit={mockOnExit} />);

    // Should show exit button
    expect(screen.getByRole('button', { name: /Exit/i })).toBeInTheDocument();
  });

  it('calls onExit when exit button is clicked', async () => {
    const user = userEvent.setup();
    render(<CoachLearningView onExit={mockOnExit} />);

    const exitButton = screen.getByRole('button', { name: /Exit/i });
    await user.click(exitButton);

    expect(mockOnExit).toHaveBeenCalled();
  });

  it('shows Ask Sage button in smart coach bar', () => {
    render(<CoachLearningView />);

    // Should show Ask Sage button
    expect(screen.getByRole('button', { name: /Ask Sage/i })).toBeInTheDocument();
  });

  it('opens chat overlay when Ask Sage is clicked', async () => {
    const user = userEvent.setup();
    render(<CoachLearningView />);

    const askSageButton = screen.getByRole('button', { name: /Ask Sage/i });
    await user.click(askSageButton);

    // Should show the coach chat
    await waitFor(() => {
      expect(screen.getByTestId('main-coach-chat')).toBeInTheDocument();
    });
  });

  it('shows continue button after content is complete', async () => {
    const user = userEvent.setup();
    render(<CoachLearningView />);

    // Click the complete button (from mocked ContentRenderer)
    const completeButton = screen.getByRole('button', { name: /Complete/i });
    await user.click(completeButton);

    // Should show Continue button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    });
  });

  it('navigates correctly when Continue is clicked', async () => {
    // Create module with multiple atoms
    const multiAtomLesson: Lesson = {
      ...mockLesson,
      atoms: [
        mockAtom,
        {
          ...mockAtom,
          id: 'atom-2',
          title: 'Second Atom',
          order: 2,
        },
      ],
    };

    const multiAtomModule: Module = {
      ...mockModule,
      lessons: [multiAtomLesson],
    };

    mockUseCourse.mockReturnValue({
      data: {
        id: 'course-1',
        title: 'Social Media Marketing',
        modules: [multiAtomModule],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useCourse>);

    mockUseModule.mockReturnValue({
      data: multiAtomModule,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useModule>);

    const user = userEvent.setup();
    render(<CoachLearningView />);

    // Complete first atom
    const completeButton = screen.getByRole('button', { name: /Complete/i });
    await user.click(completeButton);

    // Click continue
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /Continue/i });
    await user.click(continueButton);

    // Should navigate to second atom
    await waitFor(() => {
      expect(screen.getByText(/Part 2 of 2/i)).toBeInTheDocument();
    });
  });

  it('shows progress sidebar on large screens', () => {
    render(<CoachLearningView />);

    // Should show module title in sidebar
    expect(screen.getByText('Social Media Marketing Fundamentals')).toBeInTheDocument();
  });

  it('shows lesson in progress sidebar', () => {
    render(<CoachLearningView />);

    // Should show lesson title in sidebar (lesson list)
    const lessonItems = screen.getAllByText('Understanding Paid Social');
    expect(lessonItems.length).toBeGreaterThan(0);
  });

  it('displays coach tip in smart coach bar', () => {
    render(<CoachLearningView />);

    // Smart coach bar should have the owl emoji
    const owlEmojis = screen.getAllByText(/\ud83e\udd89/u);
    expect(owlEmojis.length).toBeGreaterThan(0);
  });

  it('shows Content Not Found state when no lesson exists', () => {
    const emptyModule: Module = {
      ...mockModule,
      lessons: [],
    };

    mockUseCourse.mockReturnValue({
      data: {
        id: 'course-1',
        title: 'Social Media Marketing',
        modules: [emptyModule],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useCourse>);

    mockUseModule.mockReturnValue({
      data: emptyModule,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useModule>);

    render(<CoachLearningView />);

    // Should show content not found
    expect(screen.getByText('Content Not Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Fresh/i })).toBeInTheDocument();
  });

  it('calls onLessonComplete when lesson is finished', async () => {
    const user = userEvent.setup();
    render(<CoachLearningView onLessonComplete={mockOnLessonComplete} />);

    // Complete the only atom (which completes the lesson)
    const completeButton = screen.getByRole('button', { name: /Complete/i });
    await user.click(completeButton);

    // Click continue to finish the lesson
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /Continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(mockOnLessonComplete).toHaveBeenCalledWith('lesson-1');
    });
  });

  it('renders with swipeable atom view', () => {
    render(<CoachLearningView />);

    expect(screen.getByTestId('swipeable-atom-view')).toBeInTheDocument();
  });

  it('renders with animated content wrapper', () => {
    render(<CoachLearningView />);

    expect(screen.getByTestId('animated-content')).toBeInTheDocument();
  });

  it('accepts courseId prop', () => {
    render(<CoachLearningView courseId="course-1" />);

    // Component should render with the provided courseId
    expect(screen.getByTestId('content-renderer')).toBeInTheDocument();
  });
});
