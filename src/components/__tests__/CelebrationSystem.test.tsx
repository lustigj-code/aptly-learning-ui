/**
 * CelebrationSystem Component Tests
 * Phase 7.1: Gamification testing
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CelebrationSystem } from '../celebration/CelebrationSystem';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(() => Promise.resolve()),
}));

describe('CelebrationSystem', () => {
  it('shows XP earned message', async () => {
    const celebration = {
      xpEarned: 25,
      message: 'You earned 25 XP!',
    };

    render(<CelebrationSystem celebration={celebration} onComplete={() => {}} />);

    expect(screen.getByText(/25 XP/i)).toBeInTheDocument();
  });

  it('displays level up celebration', async () => {
    const celebration = {
      xpEarned: 50,
      newLevel: 5,
      message: "You earned 50 XP! You've reached level 5!",
    };

    render(<CelebrationSystem celebration={celebration} onComplete={() => {}} />);

    expect(screen.getByText(/level 5/i)).toBeInTheDocument();
  });

  it('shows streak milestone celebration', async () => {
    const celebration = {
      xpEarned: 15,
      streakMilestone: 7,
      message: 'You earned 15 XP! 7 day streak!',
    };

    render(<CelebrationSystem celebration={celebration} onComplete={() => {}} />);

    expect(screen.getByText(/7 day streak/i)).toBeInTheDocument();
  });

  it('displays badge earned notification', async () => {
    const celebration = {
      xpEarned: 10,
      badge: {
        id: 'week-warrior',
        title: 'Week Warrior',
      },
      message: 'You earned 10 XP! New badge: Week Warrior!',
    };

    render(<CelebrationSystem celebration={celebration} onComplete={() => {}} />);

    expect(screen.getByText(/Week Warrior/i)).toBeInTheDocument();
    expect(screen.getByText(/badge/i)).toBeInTheDocument();
  });

  it('calls onComplete after celebration finishes', async () => {
    const onComplete = vi.fn();
    const celebration = {
      xpEarned: 10,
      message: 'You earned 10 XP!',
    };

    render(<CelebrationSystem celebration={celebration} onComplete={onComplete} duration={100} />);

    // Wait for celebration duration + buffer
    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalled();
      },
      { timeout: 500 }
    );
  });

  it('triggers confetti for celebrations', async () => {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default;

    const celebration = {
      xpEarned: 50,
      newLevel: 10,
      message: 'Level up!',
    };

    render(<CelebrationSystem celebration={celebration} onComplete={() => {}} />);

    expect(confetti).toHaveBeenCalled();
  });
});
