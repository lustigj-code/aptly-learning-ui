/**
 * MasteryGate Component Tests
 * Phase 7.1: Test Suite Creation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MasteryGate } from '../mastery/MasteryGate';

const mockConceptMastery = [
  { conceptId: 'social-media-basics', masteryLevel: 85, lastReviewed: new Date(), state: 'mastered' as const },
  { conceptId: 'audience-targeting', masteryLevel: 92, lastReviewed: new Date(), state: 'mastered' as const },
  { conceptId: 'ad-formats', masteryLevel: 45, lastReviewed: new Date(), state: 'learning' as const },
];

describe('MasteryGate', () => {
  it('renders children when prerequisites are met', () => {
    render(
      <MasteryGate
        prerequisites={['social-media-basics']}
        userMastery={mockConceptMastery}
        threshold={70}
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows locked message when prerequisites not met', () => {
    render(
      <MasteryGate
        prerequisites={['ad-formats']} // User only has 45% mastery, needs 70%
        userMastery={mockConceptMastery}
        threshold={70}
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText(/unlock this content/i)).toBeInTheDocument();
  });

  it('shows which prerequisites are missing', () => {
    render(
      <MasteryGate
        prerequisites={['ad-formats', 'non-existent-concept']}
        userMastery={mockConceptMastery}
        threshold={70}
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    expect(screen.getByText(/master these concepts first/i)).toBeInTheDocument();
    expect(screen.getByText(/ad-formats/i)).toBeInTheDocument();
  });

  it('passes when all prerequisites meet threshold', () => {
    render(
      <MasteryGate
        prerequisites={['social-media-basics', 'audience-targeting']}
        userMastery={mockConceptMastery}
        threshold={80}
      >
        <div>Advanced Content</div>
      </MasteryGate>
    );

    expect(screen.getByText('Advanced Content')).toBeInTheDocument();
  });

  it('shows progress toward each prerequisite', () => {
    render(
      <MasteryGate
        prerequisites={['ad-formats']}
        userMastery={mockConceptMastery}
        threshold={70}
        showProgress
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    // Should show current mastery level
    expect(screen.getByText(/45%/)).toBeInTheDocument();
    expect(screen.getByText(/70% required/i)).toBeInTheDocument();
  });

  it('uses default threshold of 80% if not specified', () => {
    render(
      <MasteryGate
        prerequisites={['social-media-basics']} // User has 85%, meets default 80%
        userMastery={mockConceptMastery}
      >
        <div>Content</div>
      </MasteryGate>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
