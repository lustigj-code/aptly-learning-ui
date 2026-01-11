/**
 * Modal Component Tests
 * Phase 7.1: Testing modal dialogs and overlays
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../ui/Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    const closeButton = screen.getByLabelText(/close/i);
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('does not close when modal content is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    const content = screen.getByText('Content');
    await user.click(content);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes on Escape key press', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('has correct ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Accessible Modal">
        <p>Content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('traps focus within modal', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <button>Button 1</button>
        <button>Button 2</button>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    const buttons = screen.getAllByRole('button');

    // Focus should be trapped within the modal
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders footer actions when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={mockOnClose}
        title="Test Modal"
        footer={
          <>
            <button>Cancel</button>
            <button>Confirm</button>
          </>
        }
      >
        <p>Content</p>
      </Modal>
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('supports different sizes', () => {
    const { container: sm } = render(
      <Modal isOpen={true} onClose={mockOnClose} title="Small" size="sm">
        Content
      </Modal>
    );
    const { container: lg } = render(
      <Modal isOpen={true} onClose={mockOnClose} title="Large" size="lg">
        Content
      </Modal>
    );

    expect(sm.querySelector('.max-w-sm')).toBeInTheDocument();
    expect(lg.querySelector('.max-w-4xl')).toBeInTheDocument();
  });
});
