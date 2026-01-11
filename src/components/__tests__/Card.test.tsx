/**
 * Card Component Tests
 * Phase 7.1: UI component testing
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../ui/Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('supports different variants', () => {
    const { container: elevated } = render(<Card variant="elevated">Content</Card>);
    const { container: outlined } = render(<Card variant="outlined">Content</Card>);

    // Elevated uses shadow-warm-lg class
    expect(elevated.firstChild).toHaveClass('shadow-warm-lg');
    // Outlined has border class
    expect(outlined.firstChild).toHaveClass('border');
  });

  it('applies padding variants', () => {
    const { container: none } = render(<Card padding="none">Content</Card>);
    const { container: lg } = render(<Card padding="lg">Content</Card>);

    // none padding doesn't have p- classes (empty string)
    expect(none.firstChild).not.toHaveClass('p-6');
    expect(lg.firstChild).toHaveClass('p-6');
  });

  it('supports interactive variant with hover effects', () => {
    const { container } = render(<Card variant="interactive">Content</Card>);
    // Interactive variant has hover classes and cursor-pointer
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('renders as div element', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('supports clickable cards with onClick', () => {
    const handleClick = vi.fn();
    render(
      <Card variant="interactive" onClick={handleClick}>
        Clickable Card
      </Card>
    );

    const card = screen.getByText('Clickable Card');
    card.click();

    expect(handleClick).toHaveBeenCalled();
  });
});
