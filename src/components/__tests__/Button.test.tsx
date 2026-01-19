/**
 * Button Component Tests
 * Phase 7.1: Core UI component testing
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../ui/Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('is disabled when isDisabled prop is true', () => {
    render(<Button isDisabled>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button onClick={handleClick} isDisabled>
        Click
      </Button>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies variant classes correctly', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    // Primary variant uses bg-teal
    expect(container.firstChild).toHaveClass('bg-teal');
  });

  it('applies size classes correctly', () => {
    const { container: small } = render(<Button size="sm">Small</Button>);
    const { container: large } = render(<Button size="lg">Large</Button>);

    // sm uses h-10 (44px WCAG touch target)
    expect(small.firstChild).toHaveClass('h-10');
    // lg uses h-12
    expect(large.firstChild).toHaveClass('h-12');
  });

  it('supports custom className', () => {
    const { container } = render(<Button className="custom-class">Button</Button>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders as button element', () => {
    const { container } = render(<Button>Button</Button>);
    expect(container.querySelector('button')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('supports different button types', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
