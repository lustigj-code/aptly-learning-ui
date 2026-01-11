/**
 * Toast Component Tests
 * Phase 7.1: Testing notification system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Toast, useToast, ToastProvider } from '../ui/Toast';

describe('Toast Component', () => {
  it('renders toast message', () => {
    render(
      <Toast
        message="Test notification"
        type="success"
        isVisible={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(
      <Toast
        message="Hidden toast"
        type="info"
        isVisible={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Hidden toast')).not.toBeInTheDocument();
  });

  it('shows different icons for different types', () => {
    const { rerender } = render(
      <Toast message="Success" type="success" isVisible={true} onClose={() => {}} />
    );

    const successIcon = screen.getByRole('img', { hidden: true });
    expect(successIcon).toBeInTheDocument();

    rerender(<Toast message="Error" type="error" isVisible={true} onClose={() => {}} />);

    const errorIcon = screen.getByRole('img', { hidden: true });
    expect(errorIcon).toBeInTheDocument();
  });

  it('calls onClose after duration expires', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <Toast
        message="Auto-close toast"
        type="info"
        isVisible={true}
        onClose={onClose}
        duration={3000}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it('can be manually closed before duration', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Toast
        message="Closeable toast"
        type="info"
        isVisible={true}
        onClose={onClose}
        duration={5000}
      />
    );

    const closeButton = screen.getByLabelText(/close/i);
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('has correct ARIA attributes', () => {
    render(
      <Toast
        message="ARIA toast"
        type="success"
        isVisible={true}
        onClose={() => {}}
      />
    );

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('uses assertive aria-live for errors', () => {
    render(
      <Toast
        message="Error message"
        type="error"
        isVisible={true}
        onClose={() => {}}
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

    const button = screen.getByRole('button');
    button.click();

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

    const button = screen.getByRole('button');
    button.click();

    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', async () => {
    const TestComponent = () => {
      const toast = useToast();
      return (
        <button onClick={() => toast.info('Info', 2000)}>
          Show Info
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByRole('button');
    button.click();

    expect(screen.getByText('Info')).toBeInTheDocument();

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.queryByText('Info')).not.toBeInTheDocument();
    });
  });
});
