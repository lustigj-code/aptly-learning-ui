/**
 * CelebrationSystem Component Tests
 * Phase 7.1: Gamification testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CelebrationProvider,
  useCelebration,
  QuickCelebration,
  StreakCelebration,
} from '../celebration/CelebrationSystem';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(() => Promise.resolve()),
}));

describe('CelebrationSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useCelebration hook', () => {
    it('throws error when used outside provider', () => {
      const TestComponent = () => {
        const celebration = useCelebration();
        return <div>{celebration ? 'has context' : 'no context'}</div>;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useCelebration must be used within a CelebrationProvider');
    });

    it('provides celebration methods', () => {
      // Test that the hook provides the expected methods by rendering
      // a component that displays which methods are defined
      const TestComponent = () => {
        const methods = useCelebration();
        return (
          <div>
            <span data-testid="celebrate">{methods.celebrate ? 'yes' : 'no'}</span>
            <span data-testid="celebrateBadge">{methods.celebrateBadge ? 'yes' : 'no'}</span>
            <span data-testid="celebrateStreak">{methods.celebrateStreak ? 'yes' : 'no'}</span>
            <span data-testid="celebrateXP">{methods.celebrateXP ? 'yes' : 'no'}</span>
          </div>
        );
      };

      render(
        <CelebrationProvider>
          <TestComponent />
        </CelebrationProvider>
      );

      expect(screen.getByTestId('celebrate')).toHaveTextContent('yes');
      expect(screen.getByTestId('celebrateBadge')).toHaveTextContent('yes');
      expect(screen.getByTestId('celebrateStreak')).toHaveTextContent('yes');
      expect(screen.getByTestId('celebrateXP')).toHaveTextContent('yes');
    });

    it('triggers XP celebration', async () => {
      const TestComponent = () => {
        const { celebrateXP } = useCelebration();
        return (
          <button onClick={() => celebrateXP(50)}>
            Celebrate XP
          </button>
        );
      };

      render(
        <CelebrationProvider>
          <TestComponent />
        </CelebrationProvider>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      // XP celebration adds floating XP indicator
      await waitFor(() => {
        expect(screen.getByText(/\+50 XP/)).toBeInTheDocument();
      });
    });

    it('triggers tier celebration with overlay', async () => {
      const TestComponent = () => {
        const { celebrate } = useCelebration();
        return (
          <button onClick={() => celebrate(3, 'Lesson Complete!')}>
            Celebrate
          </button>
        );
      };

      render(
        <CelebrationProvider>
          <TestComponent />
        </CelebrationProvider>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      // Tier 3 celebrations show an overlay - use getByRole to find the heading
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Lesson Complete/i })).toBeInTheDocument();
      });
    });

    it('triggers badge celebration', async () => {
      const mockBadge = {
        id: 'first-lesson',
        type: 'milestone' as const,
        title: 'First Steps',
        description: 'Completed your first lesson',
        icon: 'check',
        rarity: 'common' as const,
        criteria: { type: 'completion' as const, threshold: 1 },
      };

      const TestComponent = () => {
        const { celebrateBadge } = useCelebration();
        return (
          <button onClick={() => celebrateBadge(mockBadge, 75)}>
            Badge Earned
          </button>
        );
      };

      render(
        <CelebrationProvider>
          <TestComponent />
        </CelebrationProvider>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      // Badge celebration shows badge earned message - use getByRole to find heading
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Badge Earned/i })).toBeInTheDocument();
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });
    });
  });

  describe('QuickCelebration', () => {
    it('shows correct answer message', () => {
      render(<QuickCelebration show={true} isCorrect={true} xp={10} />);

      expect(screen.getByText(/Correct/i)).toBeInTheDocument();
      expect(screen.getByText(/\+10 XP/)).toBeInTheDocument();
    });

    it('shows incorrect answer message', () => {
      render(<QuickCelebration show={true} isCorrect={false} />);

      expect(screen.getByText(/Not quite|try again/i)).toBeInTheDocument();
    });

    it('hides when show is false', () => {
      render(<QuickCelebration show={false} isCorrect={true} xp={10} />);

      expect(screen.queryByText(/Correct/i)).not.toBeInTheDocument();
    });
  });

  describe('StreakCelebration', () => {
    it('shows streak days', async () => {
      render(<StreakCelebration show={true} days={7} onDismiss={() => {}} />);

      expect(screen.getByText(/7 Day Streak/i)).toBeInTheDocument();
    });

    it('shows week message for 7-day streak', () => {
      render(<StreakCelebration show={true} days={7} onDismiss={() => {}} />);

      expect(screen.getByText(/week/i)).toBeInTheDocument();
    });

    it('calls onDismiss when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onDismiss = vi.fn();

      render(<StreakCelebration show={true} days={5} onDismiss={onDismiss} />);

      const keepGoingButton = screen.getByText(/Keep Going/i);
      await user.click(keepGoingButton);

      expect(onDismiss).toHaveBeenCalled();
    });

    it('hides when show is false', () => {
      render(<StreakCelebration show={false} days={5} onDismiss={() => {}} />);

      expect(screen.queryByText(/Day Streak/i)).not.toBeInTheDocument();
    });
  });
});
