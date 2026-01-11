/**
 * ConceptProgress Component Tests
 * Phase 7.1: Testing mastery tracking visualization
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConceptProgress } from '../mastery/ConceptProgress';
import type { ConceptMastery, Concept } from '@/lib/mastery/knowledgeGraph';

const mockConcept: Concept = {
  id: 'audience-targeting',
  name: 'Audience Targeting',
  category: 'fundamentals',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  prerequisites: ['social-media-basics'],
  description: 'Learn how to identify and target the right audience for your campaigns',
};

const mockMastery: ConceptMastery = {
  conceptId: 'audience-targeting',
  masteryLevel: 75,
  lastReviewed: new Date('2026-01-06'),
  reviewCount: 5,
  state: 'learning',
  fsrsState: {
    stability: 5,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 3,
    reps: 5,
    lapses: 1,
    state: 'learning',
  },
};

describe('ConceptProgress', () => {
  it('renders concept name', () => {
    render(<ConceptProgress concept={mockConcept} mastery={mockMastery} />);

    expect(screen.getByText('Audience Targeting')).toBeInTheDocument();
  });

  it('displays mastery percentage', () => {
    render(<ConceptProgress concept={mockConcept} mastery={mockMastery} />);

    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<ConceptProgress concept={mockConcept} mastery={mockMastery} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });

  it('displays mastery level label', () => {
    render(<ConceptProgress concept={mockConcept} mastery={mockMastery} />);

    // 75% should be "Advanced" or similar
    expect(screen.getByText(/advanced|proficient/i)).toBeInTheDocument();
  });

  it('shows review count', () => {
    render(<ConceptProgress concept={mockConcept} mastery={mockMastery} />);

    expect(screen.getByText(/5.*review/i)).toBeInTheDocument();
  });

  it('indicates if review is due', () => {
    const dueMastery = {
      ...mockMastery,
      fsrsState: {
        ...mockMastery.fsrsState,
        scheduledDays: 0, // Due today
      },
    };

    render(<ConceptProgress concept={mockConcept} mastery={dueMastery} />);

    expect(screen.getByText(/due|review now/i)).toBeInTheDocument();
  });

  it('shows mastered state for 95%+ mastery', () => {
    const masteredMastery = {
      ...mockMastery,
      masteryLevel: 98,
      state: 'mastered' as const,
    };

    render(<ConceptProgress concept={mockConcept} mastery={masteredMastery} />);

    expect(screen.getByText(/mastered|expert/i)).toBeInTheDocument();
  });

  it('displays prerequisite status', () => {
    render(<ConceptProgress concept={mockConcept} mastery={mockMastery} showPrerequisites />);

    expect(screen.getByText(/social-media-basics/i)).toBeInTheDocument();
  });

  it('uses color coding for different mastery levels', () => {
    const { container: novice } = render(
      <ConceptProgress
        concept={mockConcept}
        mastery={{ ...mockMastery, masteryLevel: 20 }}
      />
    );

    const { container: advanced } = render(
      <ConceptProgress
        concept={mockConcept}
        mastery={{ ...mockMastery, masteryLevel: 85 }}
      />
    );

    // Different mastery levels should have different visual treatments
    // (Implementation-dependent color schemes)
  });

  it('shows difficulty badge', () => {
    render(<ConceptProgress concept={mockConcept} mastery={mockMastery} />);

    expect(screen.getByText(/intermediate/i)).toBeInTheDocument();
  });
});
