/**
 * Header Component Tests
 * Phase 7.1: Testing navigation header
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../layout/Header';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/dashboard',
  }),
  usePathname: () => '/dashboard',
}));

// Mock unified store
vi.mock('@/store/unifiedStore', () => ({
  useUnifiedStore: () => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      avatar: null,
      progress: {
        totalXP: 500,
        currentLevel: 5,
      },
    },
    authUser: { uid: 'test-user' },
    signOut: vi.fn(),
  }),
}));

describe('Header Component', () => {
  it('renders user name', () => {
    render(<Header />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays user XP', () => {
    render(<Header />);

    expect(screen.getByText(/500.*XP/i)).toBeInTheDocument();
  });

  it('shows user level', () => {
    render(<Header />);

    expect(screen.getByText(/Level 5|Lv\. 5/i)).toBeInTheDocument();
  });

  it('has navigation menu button', () => {
    render(<Header />);

    const menuButton = screen.getByLabelText(/menu|navigation/i);
    expect(menuButton).toBeInTheDocument();
  });

  it('opens user menu on click', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const userMenuButton = screen.getByLabelText(/user menu|account/i);
    await user.click(userMenuButton);

    // Should show menu options
    await expect(screen.findByText(/settings|logout|profile/i)).resolves.toBeInTheDocument();
  });

  it('has logout functionality', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const userMenuButton = screen.getByLabelText(/user menu/i);
    await user.click(userMenuButton);

    const logoutButton = await screen.findByText(/logout|sign out/i);
    expect(logoutButton).toBeInTheDocument();
  });

  it('shows notification bell', () => {
    render(<Header />);

    const notificationButton = screen.getByLabelText(/notification/i);
    expect(notificationButton).toBeInTheDocument();
  });

  it('displays current page breadcrumb', () => {
    render(<Header />);

    // Should show current location
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
});
