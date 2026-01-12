/**
 * Toast Component Tests
 * Phase 7.1: Testing notification system
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useToast, ToastProvider } from '../ui/Toast';

describe('Toast System', () => {
  describe('useToast Hook', () => {
    it('shows success toast', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.success('Success!')}>
            Show Toast
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('shows error toast', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.error('Error!')}>
            Show Error
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('shows info toast', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.info('Info message')}>
            Show Info
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('shows warning toast', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.warning('Warning!')}>
            Show Warning
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('shows badge earned toast', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.badge('First Steps')}>
            Show Badge
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Badge Earned!')).toBeInTheDocument();
      expect(screen.getByText('First Steps')).toBeInTheDocument();
    });

    it('shows streak toast', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.streak(7)}>
            Show Streak
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('7 Day Streak!')).toBeInTheDocument();
    });

    it('shows XP toast', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.xp(50)}>
            Show XP
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('+50 XP')).toBeInTheDocument();
    });

    it('shows description when provided', () => {
      const TestComponent = () => {
        const toast = useToast();
        return (
          <button onClick={() => toast.success('Title', 'Description text')}>
            Show Toast
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });
  });

  describe('useToast outside provider', () => {
    it('throws error when used outside provider', () => {
      const TestComponent = () => {
        const toast = useToast();
        return <div>{toast ? 'has toast' : 'no toast'}</div>;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');
    });
  });
});
