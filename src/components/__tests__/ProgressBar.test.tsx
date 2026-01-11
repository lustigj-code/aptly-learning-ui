/**
 * ProgressBar Component Tests
 * Phase 7.1: UI component testing
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ui/ProgressBar';

describe('ProgressBar Component', () => {
  it('renders progress bar with correct percentage', () => {
    render(<ProgressBar value={50} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays percentage text when showLabel is true', () => {
    render(<ProgressBar value={75} max={100} showLabel />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('hides percentage text when showLabel is false', () => {
    render(<ProgressBar value={75} max={100} showLabel={false} />);

    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });

  it('handles 0% progress', () => {
    render(<ProgressBar value={0} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles 100% progress', () => {
    render(<ProgressBar value={100} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('includes accessible label', () => {
    render(<ProgressBar value={60} max={100} label="Lesson progress" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAccessibleName(/Lesson progress/);
  });

  it('applies custom className', () => {
    const { container } = render(<ProgressBar value={50} max={100} className="custom-progress" />);

    expect(container.firstChild).toHaveClass('custom-progress');
  });

  it('uses different color variants', () => {
    const { container: teal } = render(<ProgressBar value={50} max={100} color="teal" />);
    const { container: success } = render(<ProgressBar value={50} max={100} color="success" />);
    const { container: yellow } = render(<ProgressBar value={50} max={100} color="yellow" />);

    expect(teal.querySelector('.bg-teal')).toBeInTheDocument();
    expect(success.querySelector('.bg-success')).toBeInTheDocument();
    expect(yellow.querySelector('.bg-yellow')).toBeInTheDocument();
  });

  it('calculates percentage from custom max value', () => {
    render(<ProgressBar value={3} max={5} showLabel />);

    expect(screen.getByText('60%')).toBeInTheDocument(); // 3/5 = 60%
  });
});
