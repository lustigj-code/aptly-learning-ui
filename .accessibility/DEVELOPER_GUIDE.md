# Accessibility Developer Guide

## Quick Start for Developers

This guide provides practical examples for implementing accessibility in Aptly Learning components.

## Component Checklist

When creating or modifying a component, ensure:

- ✅ Proper semantic HTML
- ✅ Keyboard navigation support
- ✅ Focus indicators (handled globally)
- ✅ ARIA labels where needed
- ✅ Color contrast meets WCAG AA
- ✅ Touch targets ≥ 44px
- ✅ Screen reader announcements for dynamic content

## Common Patterns

### 1. Interactive Cards

```tsx
import { Card } from '@/components/ui/Card'

// ✅ Good - Keyboard accessible
<Card variant="interactive" onClick={handleClick}>
  <CardTitle>Lesson 1</CardTitle>
  <CardDescription>Introduction to Marketing</CardDescription>
</Card>

// ❌ Avoid - Missing accessibility
<div className="card" onClick={handleClick}>
  <h3>Lesson 1</h3>
</div>
```

**Why?** The `Card` component with `variant="interactive"` automatically adds:
- `tabIndex={0}` for keyboard focus
- `role="button"` for screen readers
- Beautiful focus indicators
- Proper hover/active states

### 2. Buttons with Icons

```tsx
import { Button } from '@/components/ui/Button'
import { Play } from 'lucide-react'

// ✅ Good - Icon with text
<Button leftIcon={<Play />}>
  Play Video
</Button>

// ✅ Good - Icon-only with aria-label
<Button
  leftIcon={<Play />}
  aria-label="Play video"
  title="Play video"
>
  <VisuallyHidden>Play video</VisuallyHidden>
</Button>

// ❌ Avoid - Icon without text or label
<Button leftIcon={<Play />} />
```

### 3. Form Inputs

```tsx
import { Input } from '@/components/ui/Input'

// ✅ Good - With visible label
<Input
  label="Email address"
  type="email"
  error={errors.email}
  hint="We'll never share your email"
/>

// ✅ Good - With visually hidden label
<Input
  label={<VisuallyHidden>Search courses</VisuallyHidden>}
  placeholder="Search..."
  leftIcon={<Search />}
/>

// ❌ Avoid - No label
<input type="text" placeholder="Enter email" />
```

### 4. Dynamic Content Announcements

```tsx
import { Announcer, useAnnouncer } from '@/components/accessibility'

// Component-based
function QuizResult({ isCorrect }) {
  return (
    <>
      {isCorrect && (
        <Announcer
          message="Correct answer! Great job!"
          priority="polite"
        />
      )}
      <div>...</div>
    </>
  )
}

// Hook-based
function QuizSubmit() {
  const announce = useAnnouncer()

  const handleSubmit = async () => {
    setLoading(true)
    announce('Submitting quiz')

    const result = await submitQuiz()

    announce(
      result.isCorrect
        ? 'Correct! Moving to next question'
        : 'Incorrect. Try again',
      'polite'
    )
    setLoading(false)
  }

  return <Button onClick={handleSubmit}>Submit</Button>
}
```

### 5. Loading States

```tsx
import { LoadingAnnouncer } from '@/components/accessibility'

function LessonContent() {
  const { data, isLoading } = useLesson()

  return (
    <>
      <LoadingAnnouncer
        isLoading={isLoading}
        loadingMessage="Loading lesson content"
        completeMessage="Lesson loaded"
      />

      {isLoading ? <SkeletonCard /> : <LessonView data={data} />}
    </>
  )
}
```

### 6. Modals and Dialogs

```tsx
import { Modal } from '@/components/ui/Modal'

// ✅ Good - Proper title and description
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Delete Lesson"
  description="Are you sure you want to delete this lesson? This action cannot be undone."
>
  <div className="space-y-4">
    <p>This will permanently delete the lesson.</p>
    <div className="flex gap-3">
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
      <Button variant="ghost" onClick={handleClose}>
        Cancel
      </Button>
    </div>
  </div>
</Modal>

// ❌ Avoid - Missing title/description
<Modal isOpen={isOpen} onClose={handleClose}>
  <div>Are you sure?</div>
</Modal>
```

### 7. Skip Links

```tsx
// Already included in root layout
import { SkipLink, MainContent } from '@/components/ui/SkipLink'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        <Header />
        <MainContent>{children}</MainContent>
      </body>
    </html>
  )
}
```

### 8. Keyboard Shortcuts

```tsx
import { useGlobalKeyboardShortcuts } from '@/components/accessibility'

function App() {
  // Automatically enables global keyboard shortcuts
  useGlobalKeyboardShortcuts()

  return <div>...</div>
}
```

## ARIA Best Practices

### When to Use ARIA Labels

```tsx
// ✅ Good - Icon button with aria-label
<button aria-label="Close modal" onClick={onClose}>
  <X size={20} />
</button>

// ✅ Good - Decorative image
<img src="background.jpg" alt="" role="presentation" />

// ✅ Good - Complex widget
<div
  role="tablist"
  aria-label="Course sections"
>
  {sections.map(section => (
    <button
      key={section.id}
      role="tab"
      aria-selected={section.id === activeSection}
      aria-controls={`panel-${section.id}`}
    >
      {section.title}
    </button>
  ))}
</div>

// ❌ Avoid - Redundant ARIA
<button aria-label="Submit">Submit</button> // Text is visible, no need for aria-label
```

### Live Regions

```tsx
// ✅ Good - Status updates
<div role="status" aria-live="polite" className="sr-only">
  {statusMessage}
</div>

// ✅ Good - Urgent alerts
<div role="alert" aria-live="assertive" className="sr-only">
  {errorMessage}
</div>

// Use our Announcer components instead:
<Announcer message={statusMessage} priority="polite" />
```

## Color Contrast Guidelines

### Text Colors on White Background

```tsx
// ✅ Good - High contrast
<h1 className="text-navy">Heading</h1>          // 17.7:1
<p className="text-rich-black">Body text</p>   // 12.6:1
<a className="text-teal-dark">Link</a>         // 4.7:1

// ⚠️ Large text only
<h2 className="text-teal text-2xl">Heading</h2> // 3.4:1 - OK for ≥18pt

// ❌ Avoid - Insufficient contrast
<p className="text-teal">Regular text</p>       // 3.4:1 - Too low
<p className="text-yellow">Text</p>             // 1.2:1 - Never use
```

### Background Colors

```tsx
// ✅ Good - Navy on yellow
<Badge className="bg-yellow text-navy">New</Badge> // 14.5:1

// ✅ Good - Navy on light teal
<div className="bg-light-teal text-navy">...</div> // 12.8:1

// ✅ Good - Success on light background
<Alert variant="success">
  <span className="text-success">Success!</span> // On success-light bg
</Alert>
```

## Keyboard Navigation

### Required Keyboard Support

All interactive components must support:

- **Tab** - Move forward through interactive elements
- **Shift + Tab** - Move backward
- **Enter** - Activate buttons/links
- **Space** - Activate buttons/checkboxes
- **Escape** - Close modals/dropdowns
- **Arrow keys** - Navigate within component (e.g., radio groups, tabs)

### Example: Custom Interactive Component

```tsx
function CustomToggle({ isOn, onToggle, label }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className="cursor-pointer focus-visible:ring-2 focus-visible:ring-teal"
    >
      {/* Toggle UI */}
    </div>
  )
}
```

## Testing Your Components

### Manual Keyboard Test

1. Can you reach all interactive elements with Tab?
2. Can you activate them with Enter/Space?
3. Is the focus indicator visible?
4. Can you close modals with Escape?
5. Does tabbing loop properly in modals?

### Screen Reader Test (VoiceOver)

```bash
# macOS - Enable VoiceOver
Cmd + F5

# Navigate
Control + Option + Arrow keys

# Interact
Control + Option + Space

# Quick test checklist:
# - Are headings announced correctly?
# - Are button labels clear?
# - Are form errors announced?
# - Are loading states announced?
# - Can you navigate by landmarks?
```

### Chrome DevTools

```javascript
// Check accessibility tree
// DevTools > Elements > Accessibility tab

// Run Lighthouse audit
// DevTools > Lighthouse > Accessibility

// Check color contrast
// DevTools > Elements > Styles > Color picker shows contrast ratio
```

## Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Missing keyboard support
<div onClick={handleClick}>Click me</div>

// Icon without label
<button><X /></button>

// Div instead of button
<div className="button" onClick={onClick}>Submit</div>

// Missing alt text
<img src="lesson.jpg" />

// Low contrast
<p className="text-grey">Important text</p>

// Breaking tab order
<button tabIndex={-1}>Should be focusable</button>

// Redundant ARIA
<button aria-label="Submit" onClick={onSubmit}>Submit</button>
```

### ✅ Do This Instead

```tsx
// Proper keyboard support
<button onClick={handleClick}>Click me</button>

// Icon with label
<button aria-label="Close"><X /></button>

// Semantic button
<button onClick={onClick}>Submit</button>

// Descriptive alt text
<img src="lesson.jpg" alt="Introduction to Social Media Marketing lesson thumbnail" />

// High contrast
<p className="text-navy">Important text</p>

// Natural tab order
<button>Should be focusable</button>

// Just visible text
<button onClick={onSubmit}>Submit</button>
```

## Resources

- **Color Contrast Checker**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Component Examples**: See `/src/components/ui/` for accessible patterns
- **ARIA Reference**: [MDN ARIA Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- **Testing Tools**: axe DevTools, Lighthouse, WAVE

## Questions?

- Check `/.accessibility/README.md` for comprehensive documentation
- Review `/.accessibility/COLOR_CONTRAST_AUDIT.md` for color guidelines
- Open an issue with the `accessibility` label

---

**Remember:** Accessibility is not optional. Every component should be usable by everyone, regardless of how they interact with the platform.
