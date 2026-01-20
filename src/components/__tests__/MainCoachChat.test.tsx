/**
 * MainCoachChat Component Tests
 * Task 2.Q2: Critical Component Tests for AI Coach Interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainCoachChat } from '../coach/MainCoachChat';

// Mock scrollIntoView for tests
Element.prototype.scrollIntoView = vi.fn();

// Mock useCoach hook with full return value
vi.mock('@/hooks/useCoach', () => ({
  useCoach: vi.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    conversationId: 'test-conv-123',
    conversationLoaded: true,
    conversationHistory: [],
    historyLoading: false,
    sendMessage: vi.fn(() => Promise.resolve({ content: 'Mock AI response' })),
    clearMessages: vi.fn(),
    initializeChat: vi.fn(),
    loadLatestForLesson: vi.fn(),
    loadConversation: vi.fn(),
    startNewConversation: vi.fn(),
    getQuizHelp: vi.fn(() => Promise.resolve({ content: 'Mock quiz help' })),
    getSummary: vi.fn(() => Promise.resolve({ content: 'Mock summary' })),
  })),
}));

// Mock useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Mock react-markdown to avoid SSR issues in tests
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon">Send</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  Sparkles: () => <span data-testid="sparkles-icon">Sparkles</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  History: () => <span data-testid="history-icon">History</span>,
  X: () => <span data-testid="x-icon">X</span>,
  ArrowRight: () => <span data-testid="arrow-right-icon">ArrowRight</span>,
  Lightbulb: () => <span data-testid="lightbulb-icon">Lightbulb</span>,
  Bookmark: () => <span data-testid="bookmark-icon">Bookmark</span>,
  Coffee: () => <span data-testid="coffee-icon">Coffee</span>,
  CheckCircle: () => <span data-testid="check-icon">Check</span>,
  ExternalLink: () => <span data-testid="external-link-icon">ExternalLink</span>,
  ThumbsUp: () => <span data-testid="thumbs-up-icon">ThumbsUp</span>,
  ThumbsDown: () => <span data-testid="thumbs-down-icon">ThumbsDown</span>,
}));

// Mock AIFeedbackWidget since it has complex dependencies
vi.mock('@/components/ai/AIFeedbackWidget', () => ({
  AIFeedbackInline: () => <div data-testid="ai-feedback">Feedback</div>,
}));

// Get mocked useCoach
import { useCoach } from '@/hooks/useCoach';
const mockUseCoach = vi.mocked(useCoach);

describe('MainCoachChat Component', () => {
  const mockOnMessageSent = vi.fn();
  const _mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock state
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(() => Promise.resolve({ content: 'Mock AI response' })),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(() => Promise.resolve({ content: 'Mock quiz help' })),
      getSummary: vi.fn(() => Promise.resolve({ content: 'Mock summary' })),
    } as unknown as ReturnType<typeof useCoach>);
  });

  it('renders without crashing', () => {
    render(<MainCoachChat />);

    // Should render the header with Sage branding
    expect(screen.getByText('Sage')).toBeInTheDocument();
    expect(screen.getByText('Your AI learning coach')).toBeInTheDocument();
  });

  it('displays welcome message when no messages exist', () => {
    render(<MainCoachChat />);

    // Should show welcome message
    expect(screen.getByText(/Hi there! I'm Sage/i)).toBeInTheDocument();
    expect(screen.getByText(/I'm your AI learning coach/i)).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    mockUseCoach.mockReturnValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
        },
      ],
      isLoading: true,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    // Check that loader icon is visible (in the typing indicator)
    // The loader appears in the send button area
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('shows error state when error exists', () => {
    const errorMessage = 'Failed to connect to AI service';
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: false,
      error: errorMessage,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    // Error should be displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows conversation loading state when lessonId provided and conversation not loaded', () => {
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: null,
      conversationLoaded: false,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat lessonId="lesson-123" />);

    // Should show loading conversation message
    expect(screen.getByText('Loading conversation...')).toBeInTheDocument();
  });

  it('displays messages correctly', () => {
    mockUseCoach.mockReturnValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'What is social media marketing?',
          timestamp: new Date(),
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Social media marketing is the practice of using social platforms to promote products or services.',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    // Both messages should be visible
    expect(screen.getByText('What is social media marketing?')).toBeInTheDocument();
    expect(screen.getByText('Social media marketing is the practice of using social platforms to promote products or services.')).toBeInTheDocument();
  });

  it('allows typing in the input field', async () => {
    const user = userEvent.setup();
    render(<MainCoachChat />);

    const input = screen.getByPlaceholderText(/Ask Sage anything/i);
    await user.type(input, 'Hello Sage!');

    expect(input).toHaveValue('Hello Sage!');
  });

  it('sends message when send button is clicked', async () => {
    const mockSendMessage = vi.fn(() => Promise.resolve({ content: 'Response' }));
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: mockSendMessage,
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    const user = userEvent.setup();
    render(<MainCoachChat onMessageSent={mockOnMessageSent} />);

    const input = screen.getByPlaceholderText(/Ask Sage anything/i);
    await user.type(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: /Send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled();
      expect(mockOnMessageSent).toHaveBeenCalled();
    });
  });

  it('sends message when Enter key is pressed', async () => {
    const mockSendMessage = vi.fn(() => Promise.resolve({ content: 'Response' }));
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: mockSendMessage,
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    const user = userEvent.setup();
    render(<MainCoachChat />);

    const input = screen.getByPlaceholderText(/Ask Sage anything/i);
    await user.type(input, 'Test message{enter}');

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  it('disables send button when input is empty', () => {
    render(<MainCoachChat />);

    const sendButton = screen.getByRole('button', { name: /Send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when loading', () => {
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: true,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    const sendButton = screen.getByRole('button', { name: /Sending message/i });
    expect(sendButton).toBeDisabled();
  });

  it('shows quick prompts when there are few messages', () => {
    mockUseCoach.mockReturnValue({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Welcome!',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    // Quick prompts should be visible
    expect(screen.getByText('Try asking:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explain this concept simply/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Give me a real-world example/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quiz me on this topic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /What should I focus on/i })).toBeInTheDocument();
  });

  it('fills input when quick prompt is clicked', async () => {
    const user = userEvent.setup();

    mockUseCoach.mockReturnValue({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Welcome!',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    const quickPromptButton = screen.getByRole('button', { name: /Explain this concept simply/i });
    await user.click(quickPromptButton);

    const input = screen.getByPlaceholderText(/Ask Sage anything/i);
    expect(input).toHaveValue('Explain this concept simply');
  });

  it('shows clear chat button when there are messages', () => {
    mockUseCoach.mockReturnValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'Message 1',
          timestamp: new Date(),
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response 1',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    // Clear chat button should be visible
    expect(screen.getByRole('button', { name: /Clear chat/i })).toBeInTheDocument();
  });

  it('calls clearMessages when clear button is clicked', async () => {
    const mockClearMessages = vi.fn();
    mockUseCoach.mockReturnValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'Message 1',
          timestamp: new Date(),
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response 1',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      conversationId: 'test-conv-123',
      conversationLoaded: true,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: mockClearMessages,
      initializeChat: vi.fn(),
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    const user = userEvent.setup();
    render(<MainCoachChat />);

    const clearButton = screen.getByRole('button', { name: /Clear chat/i });
    await user.click(clearButton);

    expect(mockClearMessages).toHaveBeenCalled();
  });

  it('has accessible input field', () => {
    render(<MainCoachChat />);

    const input = screen.getByRole('textbox', { name: /Message Sage AI coach/i });
    expect(input).toBeInTheDocument();
  });

  it('calls loadLatestForLesson when lessonId is provided', () => {
    const mockLoadLatest = vi.fn();
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: null,
      conversationLoaded: false,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: vi.fn(),
      loadLatestForLesson: mockLoadLatest,
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat lessonId="lesson-123" />);

    expect(mockLoadLatest).toHaveBeenCalledWith('lesson-123');
  });

  it('calls initializeChat when no lessonId and no messages', () => {
    const mockInitialize = vi.fn();
    mockUseCoach.mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: null,
      conversationLoaded: false,
      conversationHistory: [],
      historyLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      initializeChat: mockInitialize,
      loadLatestForLesson: vi.fn(),
      loadConversation: vi.fn(),
      startNewConversation: vi.fn(),
      getQuizHelp: vi.fn(),
      getSummary: vi.fn(),
    } as unknown as ReturnType<typeof useCoach>);

    render(<MainCoachChat />);

    expect(mockInitialize).toHaveBeenCalled();
  });
});
