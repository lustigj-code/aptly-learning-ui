/**
 * MasteryGate Component Tests
 * Phase 7.1: Test Suite Creation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MasteryGate } from '../mastery/MasteryGate';

// Mock the mastery module
vi.mock('@/lib/mastery', () => ({
  SOCIAL_MEDIA_MARKETING_GRAPH: {
    concepts: {
      'smm-fundamentals': {
        id: 'smm-fundamentals',
        name: 'Social Media Marketing Fundamentals',
        description: 'Core understanding of social media',
        category: 'fundamentals',
        difficulty: 1,
        prerequisites: [],
        relatedConcepts: [],
        masteryThreshold: 70,
        decayRate: 60,
        atomIds: [],
        keyTerms: [],
      },
      'platform-overview': {
        id: 'platform-overview',
        name: 'Platform Overview',
        description: 'Understanding of major social platforms',
        category: 'fundamentals',
        difficulty: 1,
        prerequisites: ['smm-fundamentals'],
        relatedConcepts: [],
        masteryThreshold: 70,
        decayRate: 45,
        atomIds: [],
        keyTerms: [],
      },
      'advanced-targeting': {
        id: 'advanced-targeting',
        name: 'Advanced Targeting',
        description: 'Advanced audience targeting techniques',
        category: 'targeting',
        difficulty: 3,
        prerequisites: ['smm-fundamentals', 'platform-overview'],
        relatedConcepts: [],
        masteryThreshold: 80,
        decayRate: 30,
        atomIds: [],
        keyTerms: [],
      },
    },
    edges: [],
    categories: [],
  },
  isConceptUnlocked: vi.fn((graph, conceptId, masteryLevels) => {
    const concept = graph.concepts[conceptId];
    if (!concept) return false;
    return concept.prerequisites.every(
      (prereqId: string) => (masteryLevels[prereqId] || 0) >= (graph.concepts[prereqId]?.masteryThreshold || 70)
    );
  }),
  getAllPrerequisites: vi.fn(),
  getLearningPath: vi.fn(),
}));

describe('MasteryGate', () => {
  const mockOnReviewPrerequisite = vi.fn();
  const mockOnProceed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when no prerequisites needed', () => {
    render(
      <MasteryGate
        conceptId="smm-fundamentals"
        masteryLevels={{}}
        onReviewPrerequisite={mockOnReviewPrerequisite}
        onProceed={mockOnProceed}
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when all prerequisites are mastered', () => {
    render(
      <MasteryGate
        conceptId="platform-overview"
        masteryLevels={{ 'smm-fundamentals': 85 }}
        onReviewPrerequisite={mockOnReviewPrerequisite}
        onProceed={mockOnProceed}
      >
        <div>Platform Content</div>
      </MasteryGate>
    );

    expect(screen.getByText('Platform Content')).toBeInTheDocument();
  });

  it('shows locked state when prerequisites not met', () => {
    render(
      <MasteryGate
        conceptId="platform-overview"
        masteryLevels={{ 'smm-fundamentals': 50 }}
        onReviewPrerequisite={mockOnReviewPrerequisite}
        onProceed={mockOnProceed}
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText(/Master the prerequisite concepts/i)).toBeInTheDocument();
  });

  it('shows prerequisite progress', () => {
    render(
      <MasteryGate
        conceptId="platform-overview"
        masteryLevels={{ 'smm-fundamentals': 50 }}
        onReviewPrerequisite={mockOnReviewPrerequisite}
        onProceed={mockOnProceed}
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    expect(screen.getByText('Prerequisites Progress')).toBeInTheDocument();
  });

  it('calls onReviewPrerequisite when clicking on unmastered prerequisite', async () => {
    const user = userEvent.setup();

    render(
      <MasteryGate
        conceptId="platform-overview"
        masteryLevels={{ 'smm-fundamentals': 50 }}
        onReviewPrerequisite={mockOnReviewPrerequisite}
        onProceed={mockOnProceed}
      >
        <div>Protected Content</div>
      </MasteryGate>
    );

    // Click on the Continue Learning button
    const continueButton = screen.getByRole('button', { name: /Continue Learning/i });
    await user.click(continueButton);

    expect(mockOnReviewPrerequisite).toHaveBeenCalledWith('smm-fundamentals');
  });
});
