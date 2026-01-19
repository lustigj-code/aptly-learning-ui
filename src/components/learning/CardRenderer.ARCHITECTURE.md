# CardRenderer Architecture

Visual guide to the CardRenderer component architecture and data flow.

## Component Hierarchy

```
CardRenderer (Main Container)
├── AnimatePresence (Framer Motion)
│   └── motion.div (Entry/Exit Animations)
│       └── Card (Glassmorphic Wrapper)
│           ├── CardSkeleton (State: skeleton | loading)
│           │   ├── Header Skeleton
│           │   └── Type-Specific Content Skeleton
│           │       ├── VideoSkeleton
│           │       ├── ReadingSkeleton
│           │       ├── QuizSkeleton
│           │       └── PracticeSkeleton
│           ├── LoadingIndicator (Overlay - State: loading)
│           │   └── Animated Dots + Text
│           ├── ErrorState (State: error)
│           │   ├── Error Icon
│           │   ├── Error Message
│           │   └── Retry Button
│           └── AtomContent (State: loaded)
│               ├── Atom Header
│               │   ├── Type Badge
│               │   └── Duration
│               ├── Atom Title
│               └── Content Area (Placeholder for future renderers)
└── Action Buttons (Shown when loaded)
    ├── Skip Button (→ exitDiscard)
    └── Complete Button (→ exitSuccess)
```

## State Machine

```
┌─────────────┐
│  SKELETON   │ ← Initial state (atom = undefined)
└──────┬──────┘
       │
       ├─→ isLoading = true
       │
       ▼
┌─────────────┐
│   LOADING   │ ← Skeleton + Loading Indicator
└──────┬──────┘
       │
       ├─→ error = Error
       │
       ▼
┌─────────────┐
│    ERROR    │ ← Error State + Retry
└──────┬──────┘
       │
       ├─→ atom = Atom
       │
       ▼
┌─────────────┐
│   LOADED    │ ← Full Content + Action Buttons
└──────┬──────┘
       │
       ├─→ User clicks "Complete"
       │   └─→ exitSuccess → onExit('success')
       │
       └─→ User clicks "Skip"
           └─→ exitDiscard → onExit('discard')
```

## Data Flow

```
Parent Component
      │
      │ Provides:
      ├─→ atom?: Atom
      ├─→ isLoading: boolean
      ├─→ error: Error | null
      │
      ▼
┌──────────────────────┐
│   CardRenderer       │
│                      │
│  Internal State:     │
│  - cardState         │
│  - exitDirection     │
└──────────┬───────────┘
           │
           │ Emits:
           ├─→ onComplete()  (when loaded)
           └─→ onExit(direction)  (when exiting)
                 │
                 ▼
           Parent Component
           (handles navigation,
            mastery updates, etc.)
```

## Animation Timeline

```
ENTRY ANIMATION (400ms)
─────────────────────────────────────
  0ms    100ms   200ms   300ms   400ms
   │       │       │       │       │
   ├───────┴───────┴───────┴───────┤
   │                               │
Start                            End
x: 100 ────────────────────────→ x: 0
scale: 0.95 ───────────────────→ scale: 1
opacity: 0 ────────────────────→ opacity: 1


EXIT SUCCESS (flies to Mastery Orb - 400ms)
─────────────────────────────────────
  0ms    100ms   200ms   300ms   400ms
   │       │       │       │       │
   ├───────┴───────┴───────┴───────┤
   │                               │
Start                            End
y: 0 ──────────────────────────→ y: -100
scale: 1 ───────────────────────→ scale: 0.9
opacity: 1 ─────────────────────→ opacity: 0


EXIT DISCARD (snaps left - 300ms)
─────────────────────────────────────
  0ms    100ms   200ms   300ms
   │       │       │       │
   ├───────┴───────┴───────┤
   │                       │
Start                    End
x: 0 ──────────────────→ x: -50
opacity: 1 ─────────────→ opacity: 0
```

## Type-Specific Skeletons

### Video Atom Skeleton
```
┌──────────────────────────────────┐
│ Type Badge        Duration       │ ← Header
│                                  │
│ Title Skeleton (80%)             │ ← Title
│                                  │
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │   Video Player Skeleton      │ │ ← 16:9 Video
│ │        (280px height)        │ │
│ │                              │ │
│ └──────────────────────────────┘ │
│                                  │
│ Text line 1 ───────────────────  │ ← Transcript
│ Text line 2 ───────────────────  │   Preview
│ Text line 3 ──────────────────   │
└──────────────────────────────────┘
```

### Reading Atom Skeleton
```
┌──────────────────────────────────┐
│ Type Badge        Duration       │
│                                  │
│ Title Skeleton (80%)             │
│                                  │
│ Text line 1 ───────────────────  │
│ Text line 2 ───────────────────  │
│ Text line 3 ───────────────────  │
│ Text line 4 ───────────────────  │
│ Text line 5 ───────────────────  │
│ Text line 6 ───────────────────  │
│ Text line 7 ───────────────────  │
│ Text line 8 ──────────────────   │
│                                  │
│ [ Button Skeleton ]              │
└──────────────────────────────────┘
```

### Quiz Atom Skeleton
```
┌──────────────────────────────────┐
│ Type Badge        Duration       │
│                                  │
│ Title Skeleton (80%)             │
│                                  │
│ Question line 1 ──────────────── │
│ Question line 2 ───────────────  │
│                                  │
│ ┌──────────────────────────────┐ │
│ │     Option 1 Skeleton        │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │     Option 2 Skeleton        │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │     Option 3 Skeleton        │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │     Option 4 Skeleton        │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### Practice Atom Skeleton
```
┌──────────────────────────────────┐
│ Type Badge        Duration       │
│                                  │
│ Title Skeleton (80%)             │
│                                  │
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │ Interactive Area Skeleton    │ │
│ │      (200px height)          │ │
│ │                              │ │
│ └──────────────────────────────┘ │
│                                  │
│ Instruction line 1 ────────────  │
│ Instruction line 2 ────────────  │
│ Instruction line 3 ───────────   │
│                                  │
│ ┌──────────────────────────────┐ │
│ │   Input Area Skeleton        │ │
│ │      (96px height)           │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

## Integration Pattern

### Recommended Usage in Learning Flow
```typescript
// Parent: CoachLearningView or similar

function LearningFlow() {
  const { currentAtom, isLoading, error, loadNextAtom } = useAtomQueue();
  const { updateMastery } = useMastery();

  return (
    <div className="learning-container">
      <CardRenderer
        atom={currentAtom}
        isLoading={isLoading}
        error={error}
        onComplete={() => {
          // Track analytics
          trackEvent('atom_viewed', {
            atomId: currentAtom.id,
            type: currentAtom.type,
          });
        }}
        onExit={(direction) => {
          if (direction === 'success') {
            // Update mastery
            updateMastery(currentAtom.id, 1.0);
            // Move to next
            loadNextAtom();
            // Celebrate
            celebrateCompletion();
          } else {
            // Just skip to next
            loadNextAtom();
          }
        }}
      />
    </div>
  );
}
```

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Time to Skeleton | 0ms | Immediate render |
| Animation Duration | 400ms | SPRING.gentle |
| Bundle Size | ~3KB | With tree-shaking |
| Re-render Triggers | Props only | Optimized |
| Memory Footprint | Minimal | No heavy state |

## Accessibility Features

```
┌─────────────────────────────────────┐
│ CardRenderer Accessibility          │
├─────────────────────────────────────┤
│                                     │
│ ✓ Keyboard Navigation               │
│   - Tab to focus card               │
│   - Enter/Space to activate buttons │
│                                     │
│ ✓ Screen Reader Support             │
│   - Skeleton: role="status"         │
│   - Skeleton: aria-busy="true"      │
│   - Skeleton: aria-live="polite"    │
│   - Error: Clear error messages     │
│                                     │
│ ✓ Reduced Motion                    │
│   - Detects prefers-reduced-motion  │
│   - Disables all animations         │
│   - Instant transitions (0ms)       │
│                                     │
│ ✓ Focus Management                  │
│   - Visible focus indicators        │
│   - Focus trap in error state       │
│   - Logical tab order               │
│                                     │
└─────────────────────────────────────┘
```

## Future Architecture

```
CardRenderer (Current)
      │
      ├─→ VideoAtomRenderer (Phase 1D)
      │   ├── VideoPlayer
      │   ├── ChapterNavigation
      │   └── TranscriptView
      │
      ├─→ ReadingAtomRenderer (Phase 1D)
      │   ├── RichTextContent
      │   ├── HighlightSystem
      │   └── RelatedResources
      │
      ├─→ QuizAtomRenderer (Phase 1D)
      │   ├── QuestionDisplay
      │   ├── OptionSelector
      │   └── FeedbackPanel
      │
      └─→ PracticeAtomRenderer (Phase 1D)
          ├── AIConversation
          ├── ScenarioInterface
          └── RubricEvaluation
```

## File Structure

```
src/components/learning/
├── CardRenderer.tsx              ← Main component (442 lines)
├── CardRenderer.README.md        ← API documentation
├── CardRenderer.ARCHITECTURE.md  ← This file
│
├── content/                      ← Future: Content renderers
│   ├── VideoAtomRenderer.tsx
│   ├── ReadingAtomRenderer.tsx
│   ├── QuizAtomRenderer.tsx
│   └── PracticeAtomRenderer.tsx
│
└── animations/                   ← Future: Shared animations
    ├── cardTransitions.ts
    └── celebrationEffects.ts
```

## Dependencies Graph

```
CardRenderer
    │
    ├─→ framer-motion (AnimatePresence, motion)
    │
    ├─→ @/components/ui/Card (Card wrapper)
    │   └─→ @/lib/utils (cn helper)
    │
    ├─→ @/components/ui/Skeleton (Skeleton components)
    │   └─→ globals.css (shimmer animation)
    │
    ├─→ @/lib/motion/springs (SPRING.gentle)
    │
    └─→ @/types (Atom, AtomType)
```

## Testing Strategy

### Unit Tests
```typescript
describe('CardRenderer', () => {
  it('shows skeleton when atom is undefined')
  it('shows loading state when isLoading is true')
  it('shows error state when error is provided')
  it('shows loaded state when atom is provided')
  it('calls onComplete when content loads')
  it('calls onExit with correct direction')
  it('respects prefers-reduced-motion')
  it('renders correct skeleton for each atom type')
});
```

### Integration Tests
```typescript
describe('CardRenderer Integration', () => {
  it('handles full loading lifecycle')
  it('handles error and retry flow')
  it('handles success exit animation')
  it('handles discard exit animation')
  it('works with different atom types')
});
```

### E2E Tests
```typescript
describe('CardRenderer E2E', () => {
  it('user sees skeleton immediately')
  it('user sees content after loading')
  it('user can complete and see exit animation')
  it('user can skip and see exit animation')
  it('user can retry after error')
});
```

---

**Last Updated**: 2026-01-16
**Version**: 1.0.0
**Status**: Production Ready
