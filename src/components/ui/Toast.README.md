# Toast Component - Apple-Level UI Polish

A polished notification component with smooth animations, progress indicators, and comprehensive accessibility features.

## Features

### 1. Enhanced Animations
- **Entry**: Smooth slide-in from bottom-right with spring physics
  - Subtle scale and rotation effects
  - Staggered animations for icon, title, and description
- **Exit**: Elegant slide-out with fade
  - Optimized easing curves for natural motion
  - Coordinated scale reduction
- **Hover**: Subtle scale-up effect (1.02x) with shadow enhancement
- **Dismiss**: Active state feedback on close button

### 2. Visual Variants

#### Standard Variants
- **Success** (Green): Checkmark icon, subtle green accent
- **Error** (Red): X-circle icon, red accent, longer duration (6s)
- **Warning** (Yellow): Alert icon, yellow accent
- **Info** (Blue/Teal): Info icon, teal accent

#### Gamification Variants
- **Badge**: Trophy icon, purple/yellow gradient, animated star decoration
- **Streak**: Flame icon, orange/yellow gradient, shimmer animation
- **XP**: Zap icon, teal/purple gradient

### 3. Progress Bar
- Optional animated progress bar for timed toasts
- Smoothly animates from 100% to 0% at 60fps
- Color-coded to match toast variant
- Gradient support for gamification toasts
- Can be disabled with `showProgress: false`

### 4. Stacking Behavior
- Multiple toasts stack vertically with 8px gap
- Subtle 2px vertical offset per toast for depth
- Smooth layout animations when toasts appear/disappear
- Automatic cleanup when toasts expire

### 5. Accessibility
- Proper ARIA attributes (`role="alert"`, `aria-live`, `aria-atomic`)
- Error toasts use `aria-live="assertive"` for immediate attention
- Dismiss button has `aria-label="Dismiss notification"`
- Semantic HTML structure
- Keyboard accessible dismiss button

### 6. Dark Mode Support
- All variants include dark mode styles
- Proper contrast ratios maintained
- Subtle backdrop blur for glass-morphism effect
- Enhanced visibility on dark backgrounds

### 7. Responsive Design
- Mobile-optimized with padding adjustments
- Max-width constraint (384px / sm)
- Touch-friendly dismiss button (44px target)
- Proper spacing on small screens

## Usage

### Basic Usage

```tsx
import { useToast } from '@/components/ui/Toast';

function MyComponent() {
  const toast = useToast();

  return (
    <button onClick={() => toast.success('Done!', 'Task completed successfully')}>
      Complete Task
    </button>
  );
}
```

### Convenience Methods

```tsx
// Success (4s duration, green)
toast.success('Success!', 'Optional description');

// Error (6s duration, red)
toast.error('Error!', 'Something went wrong');

// Warning (4s duration, yellow)
toast.warning('Warning!', 'Please review this');

// Info (4s duration, teal)
toast.info('Info', 'Did you know?');

// Badge (5s duration, with star animation)
toast.badge('Achievement Unlocked', 'Master Learner');

// Streak (4s duration, with shimmer effect)
toast.streak(7); // "7 Day Streak!"

// XP (3s duration, gradient)
toast.xp(100); // "+100 XP"
```

### Advanced Usage

```tsx
// Custom toast with all options
toast.addToast({
  type: 'success',
  title: 'Custom Toast',
  description: 'With custom settings',
  duration: 5000,           // 5 seconds
  showProgress: true,       // Show progress bar
  icon: <CustomIcon />,     // Optional custom icon
});

// Permanent toast (must be manually dismissed)
toast.addToast({
  type: 'warning',
  title: 'Important',
  description: 'This stays until dismissed',
  duration: 0,              // No auto-dismiss
  showProgress: false,      // No progress bar for permanent toasts
});

// Quick toast (1 second)
toast.addToast({
  type: 'info',
  title: 'Quick tip',
  duration: 1000,
});
```

### Removing Toasts Programmatically

```tsx
const toast = useToast();

// Add a toast and get its ID
const toastId = Date.now().toString();
toast.addToast({
  id: toastId,
  type: 'info',
  title: 'Processing...',
  duration: 0,
});

// Later, remove it manually
toast.removeToast(toastId);
```

## Animation Details

### Spring Physics
- **Stiffness**: 400 (responsive, snappy)
- **Damping**: 30 (smooth, no excessive bounce)
- **Mass**: 0.8 (lightweight feel)

### Progress Bar
- Updates at 60fps (every 16ms)
- Linear easing for consistent countdown
- Synchronized with auto-dismiss timing

### Special Effects
- **Badge**: Star rotates 180° on entry with spring animation
- **Streak**: Continuous shimmer gradient animation (2s loop)

## Design Principles

Following Apple's Human Interface Guidelines:

1. **Non-intrusive**: Appears in corner, doesn't block content
2. **Beautiful**: Smooth animations, subtle shadows, refined spacing
3. **Clear**: Icon + title + description hierarchy
4. **Dismissible**: Always provides a way to close manually
5. **Responsive**: Adapts to user actions with feedback
6. **Accessible**: Screen reader friendly, keyboard navigable

## Technical Implementation

### Performance Optimizations
- `useCallback` for stable function references
- `AnimatePresence` for exit animations
- Layout animations with Framer Motion
- Efficient progress bar updates (RAF-based)
- Minimal re-renders through proper state management

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Framer Motion and Lucide React
- Tailwind CSS for styling
- Falls back gracefully without animations if needed

## Customization

### Extending Variants

Add new toast types by extending the `toastStyles` object:

```tsx
const toastStyles = {
  // ... existing variants
  custom: {
    bg: 'bg-custom-color',
    border: 'border-custom-border',
    icon: <CustomIcon />,
    iconBg: 'bg-custom-icon-bg',
    progressBg: 'bg-custom-progress',
  },
};
```

### Adjusting Animations

Modify spring physics in the `ToastItem` component:

```tsx
transition={{
  type: 'spring',
  stiffness: 400,    // Higher = faster
  damping: 30,       // Higher = less bounce
  mass: 0.8,         // Higher = heavier feel
}}
```

### Changing Position

Update the `ToastContainer` className:

```tsx
// Bottom-left
className="fixed bottom-4 left-4 ..."

// Top-right
className="fixed top-4 right-4 ..."

// Top-center
className="fixed top-4 left-1/2 -translate-x-1/2 ..."
```

## Dependencies

- `react` (^18.0.0)
- `framer-motion` (^11.0.0)
- `lucide-react` (^0.400.0)
- `tailwindcss` (^3.4.0)

## Files

- `/src/components/ui/Toast.tsx` - Main component
- `/src/components/ui/Toast.demo.tsx` - Interactive demo
- `/src/components/ui/Toast.README.md` - This documentation

## Example Integration

Wrap your app with the `ToastProvider`:

```tsx
// app/layout.tsx or _app.tsx
import { ToastProvider } from '@/components/ui/Toast';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
```

Then use the `useToast` hook anywhere in your app:

```tsx
'use client';

import { useToast } from '@/components/ui/Toast';

export function FeatureComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await performAction();
      toast.success('Success!', 'Action completed');
    } catch (error) {
      toast.error('Error', error.message);
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

## Best Practices

1. **Keep messages concise**: Title should be 2-4 words, description 1-2 sentences
2. **Use appropriate types**: Match the toast type to the message severity
3. **Adjust duration**: Longer messages need longer durations
4. **Don't overuse**: Too many toasts can be annoying
5. **Provide context**: Description should explain what happened and why
6. **Error handling**: Always show errors with the error variant
7. **Success confirmation**: Confirm successful actions for user confidence
8. **Progress indication**: Use progress bar for timed operations
9. **Permanent toasts**: Only for critical messages requiring user action
10. **Accessibility**: Test with screen readers and keyboard navigation
