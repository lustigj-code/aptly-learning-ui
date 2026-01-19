# CardRenderer

Skeleton-first learning card component implementing optimistic rendering for the Aptly Cognitive OS.

## Overview

The `CardRenderer` component provides a seamless learning experience by showing content skeletons immediately (0ms) and filling in actual content when loaded. This creates a perception of instant responsiveness while maintaining smooth transitions and graceful error handling.

## Features

- **Instant Skeleton (0ms)** - Shows placeholder immediately for perceived performance
- **Type-Specific Skeletons** - Different layouts for video, reading, quiz, and practice atoms
- **Smooth Transitions** - Gentle spring animations using Framer Motion
- **Graceful Error Handling** - Friendly error state with retry option
- **Accessibility First** - Respects `prefers-reduced-motion` settings
- **Directional Exits** - Different animations for success (flies to Mastery Orb) vs. discard (snaps left)

## Usage

### Basic Example

```tsx
import { CardRenderer } from '@/components/learning/CardRenderer';
import type { Atom } from '@/types';

function LearningView() {
  const [atom, setAtom] = useState<Atom>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return (
    <CardRenderer
      atom={atom}
      isLoading={isLoading}
      error={error}
      onComplete={() => console.log('Content loaded!')}
      onExit={(direction) => {
        console.log(`Card exited: ${direction}`);
        // direction is 'success' or 'discard'
      }}
    />
  );
}
```

### With Data Fetching

```tsx
import { CardRenderer } from '@/components/learning/CardRenderer';
import { useEffect, useState } from 'react';

function AtomView({ atomId }: { atomId: string }) {
  const [atom, setAtom] = useState<Atom>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAtom() {
      try {
        setIsLoading(true);
        const data = await fetch(`/api/atoms/${atomId}`).then(r => r.json());
        setAtom(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAtom();
  }, [atomId]);

  return (
    <CardRenderer
      atom={atom}
      isLoading={isLoading}
      error={error}
      onComplete={() => {
        // Track analytics
        trackEvent('atom_loaded', { atomId, type: atom?.type });
      }}
      onExit={(direction) => {
        if (direction === 'success') {
          // Update mastery, move to next atom
          updateMastery(atomId);
          navigateToNext();
        } else {
          // User skipped - mark as viewed but not completed
          trackSkip(atomId);
        }
      }}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `atom` | `Atom \| undefined` | `undefined` | The atom to render. If undefined, shows skeleton. |
| `isLoading` | `boolean` | `false` | Shows skeleton with loading indicator overlay. |
| `error` | `Error \| null` | `null` | Error state. Shows error UI with retry option. |
| `onComplete` | `() => void` | - | Called when content is fully loaded and rendered. |
| `onExit` | `(direction: CardExitDirection) => void` | - | Called when card exits. Direction is 'success' or 'discard'. |
| `className` | `string` | - | Additional CSS classes for the container. |

## Card States

The component manages four states:

### 1. Skeleton
Shows immediately when `atom` is undefined. Provides instant feedback.

```tsx
<CardRenderer />
```

### 2. Loading
Shows skeleton with a loading indicator overlay when `isLoading={true}`.

```tsx
<CardRenderer isLoading={true} />
```

### 3. Loaded
Shows actual content when `atom` is provided and `isLoading={false}`.

```tsx
<CardRenderer atom={myAtom} />
```

### 4. Error
Shows error state with retry option when `error` is provided.

```tsx
<CardRenderer error={new Error('Failed to load')} />
```

## Animation Choreography

### Entry Animation
```typescript
initial: { opacity: 0, x: 100, scale: 0.95 }
animate: { opacity: 1, x: 0, scale: 1 }
```
Card slides in from the right with a subtle scale effect.

### Exit Animation (Success)
```typescript
exit: { opacity: 0, y: -100, scale: 0.9 }
```
Card flies upward (toward the Mastery Orb) when completed successfully.

### Exit Animation (Discard)
```typescript
exit: { opacity: 0, x: -50 }
```
Card snaps to the left when user skips or discards.

All animations use `SPRING.gentle` for smooth, natural motion and respect `prefers-reduced-motion` settings.

## Skeleton Variants

Different atom types show different skeleton layouts:

### Video Atom
- Header (type + title)
- Video placeholder (16:9 aspect ratio)
- 3 lines of text (transcript preview)

### Reading Atom
- Header
- 8 lines of text
- Action button placeholder

### Quiz Atom
- Header
- 2 lines of question text
- 4 option button placeholders

### Practice Atom
- Header
- Large interactive area placeholder
- 3 lines of instruction text
- Input area placeholder

## Accessibility

### Keyboard Navigation
- Card is focusable when interactive
- Action buttons are keyboard accessible
- Focus indicators follow design system

### Screen Readers
- Skeleton uses `role="status"` and `aria-busy="true"`
- Loading state announces to screen readers via `aria-live="polite"`
- Error state provides clear error messages

### Reduced Motion
Automatically detects `prefers-reduced-motion` and disables animations:

```tsx
const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

## Integration with Existing Components

The CardRenderer uses existing design system components:

- `Card` - Glassmorphic card primitive with variants
- `Skeleton` - Shimmer effect skeleton components
- `SPRING` - Standardized spring configurations

## Performance

- **0ms to skeleton** - Immediate visual feedback
- **Optimized re-renders** - Only updates when props change
- **Lazy content loading** - Content components can be code-split
- **Smooth 60fps animations** - Hardware-accelerated transforms

## Type Safety

Full TypeScript support with strict typing:

```typescript
export type CardState = 'skeleton' | 'loading' | 'loaded' | 'error';
export type CardExitDirection = 'success' | 'discard';

export interface CardRendererProps {
  atom?: Atom;
  isLoading?: boolean;
  error?: Error | null;
  onComplete?: () => void;
  onExit?: (direction: CardExitDirection) => void;
  className?: string;
}
```

## Demo

Visit `/demo/card-renderer` to see the component in action with interactive controls for all states and atom types.

## Future Enhancements

- [ ] Add swipe gestures for mobile (swipe right = success, swipe left = discard)
- [ ] Implement actual content renderers for each atom type
- [ ] Add celebration animations on success exit
- [ ] Support custom exit animations per atom type
- [ ] Add progress indicator for multi-step atoms
- [ ] Implement card queue/deck for smooth transitions between atoms

## Related Components

- `ContentRenderer` - Actual content rendering for each atom type
- `MasteryOrb` - Visual destination for successful card exits
- `CoachLearningView` - Main learning interface using CardRenderer

## File Location

```
/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning/src/components/learning/CardRenderer.tsx
```
