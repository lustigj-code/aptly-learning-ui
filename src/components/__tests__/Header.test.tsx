/**
 * Header Component Tests
 * Phase 7.1: Testing navigation header
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../layout/Header';

// Mock hooks and stores
vi.mock('@/store/unifiedStore', () => ({
  useUser: () => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      avatar: null,
      streak: {
        currentStreak: 5,
      },
    },
  }),
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: (selector: (state: { toggleMobileMenu: () => void }) => unknown) =>
    selector({ toggleMobileMenu: vi.fn() }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('@/components/pwa/ConnectivityStatus', () => ({
  ConnectivityStatus: () => <div data-testid="connectivity-status" />,
}));

vi.mock('@/components/progress/StreakCounter', () => ({
  InlineStreak: ({ count }: { count: number }) => <div data-testid="streak">{count} day streak</div>,
}));

vi.mock('@/components/navigation/UserMenu', () => ({
  UserMenu: () => <button aria-label="User menu">User Menu</button>,
}));

describe('Header Component', () => {
  it('renders greeting with user name', () => {
    render(<Header />);

    // Should show greeting with user name
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
  });

  it('displays streak counter', () => {
    render(<Header />);

    expect(screen.getByTestId('streak')).toBeInTheDocument();
  });

  it('has mobile menu toggle button', () => {
    render(<Header />);

    const menuButton = screen.getByLabelText(/Toggle navigation menu/i);
    expect(menuButton).toBeInTheDocument();
  });

  it('shows custom title when provided', () => {
    render(<Header showGreeting={false} title="Settings" />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows subtitle when provided', () => {
    render(<Header showGreeting={false} title="Settings" subtitle="Manage your account" />);

    expect(screen.getByText('Manage your account')).toBeInTheDocument();
  });

  it('renders user menu', () => {
    render(<Header />);

    expect(screen.getByLabelText(/User menu/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Header className="custom-header" />);

    expect(container.firstChild).toHaveClass('custom-header');
  });
});
