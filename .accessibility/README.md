# Accessibility Documentation

## Overview
Aptly Learning is committed to providing an accessible, inclusive learning experience for all users. We follow WCAG 2.1 Level AA guidelines and Apple's accessibility principles.

## Core Principles
1. **Accessibility is not an afterthought** - Built into every component
2. **Beautiful AND accessible** - Apple-level UI quality with full accessibility
3. **Clear focus indicators** - Always visible, beautifully designed
4. **Screen reader friendly** - Proper semantic HTML and ARIA labels
5. **Keyboard navigable** - Full keyboard support for all interactions

## Accessibility Features

### 1. Focus Management
**Location:** `/src/app/globals.css`

- **Beautiful focus indicators** with dual-ring design (3px + 5px)
- Enhanced visibility without compromising aesthetics
- High contrast mode support
- Keyboard navigation indicators
- Smart focus trap in modals and dialogs

**Components:**
- `/src/components/ui/FocusTrap.tsx` - Focus management for modals
- All interactive components have proper focus states

### 2. Skip Navigation
**Location:** `/src/components/ui/SkipLink.tsx`

- Skip to main content link for keyboard users
- Visible only on focus
- WCAG 2.1 Level A requirement
- Integrated into root layout

### 3. Screen Reader Support
**Locations:**
- `/src/components/ui/VisuallyHidden.tsx` - Hide content visually while keeping it accessible
- `/src/components/accessibility/Announcer.tsx` - Dynamic content announcements

**Features:**
- Live regions for dynamic content
- Accessible descriptions for complex UI
- Loading state announcements
- Route change announcements
- Proper ARIA labels and roles

**Usage Examples:**
```tsx
import { Announcer, useAnnouncer, LoadingAnnouncer } from '@/components/accessibility/Announcer'

// Component-based announcement
<Announcer message="Quiz submitted successfully" priority="polite" />

// Hook-based announcement
const announce = useAnnouncer()
announce('Form submitted successfully')

// Loading state announcement
<LoadingAnnouncer isLoading={isSubmitting} />
```

### 4. Keyboard Shortcuts
**Location:** `/src/components/accessibility/KeyboardShortcuts.tsx`

**Available Shortcuts:**
- `?` - Show keyboard shortcuts modal
- `Esc` - Close modal or cancel action
- `/` - Focus search
- `g + d` - Go to Dashboard
- `g + l` - Go to Learn page
- `g + p` - Go to Progress
- `n` - Next atom/question
- `p` - Previous atom/question
- `Space` - Play/Pause video
- `Enter` - Submit answer
- `h` - Show hint
- `c` - Open coach panel

**Features:**
- Beautiful keyboard shortcuts modal
- Visual indicators for key combinations
- Context-aware shortcuts
- Global keyboard navigation

### 5. Color Contrast
**Location:** `/.accessibility/COLOR_CONTRAST_AUDIT.md`

All color combinations meet WCAG AA standards:
- **Navy on White:** 17.7:1 (AAA) - Primary text
- **Rich Black on White:** 12.6:1 (AAA) - Body text
- **Teal Dark on White:** 4.7:1 (AA) - Links, interactive elements
- **Error on White:** 4.6:1 (AA) - Error messages

See full audit document for complete color matrix.

### 6. Touch Targets
**Location:** `/src/app/globals.css`

- Minimum 44px × 44px touch targets (WCAG 2.5.5)
- Larger 48px targets for primary actions
- Mobile-first responsive design
- Safe area insets for iOS devices

### 7. Form Accessibility
**Components:**
- `/src/components/ui/Input.tsx` - Fully accessible input fields
- `/src/components/ui/Button.tsx` - Accessible buttons with loading states

**Features:**
- Proper label associations
- Error message announcements
- Validation state indicators
- Password visibility toggle
- Keyboard navigation
- Touch-friendly sizing

### 8. Modal Accessibility
**Location:** `/src/components/ui/Modal.tsx`

**Features:**
- Focus trap - keeps focus within modal
- Return focus on close
- Escape key to close
- Click overlay to close (optional)
- Proper ARIA attributes
- Body scroll lock
- Prevents layout shift

### 9. Interactive Cards
**Location:** `/src/components/ui/Card.tsx`

**Features:**
- Keyboard focusable when interactive
- Proper role attributes
- Beautiful focus indicators
- Hover and active states
- Motion respects user preferences

## Testing Checklist

### Manual Testing
- [ ] Navigate entire site using only keyboard
- [ ] Test with screen reader (VoiceOver, NVDA, JAWS)
- [ ] Verify focus indicators are visible
- [ ] Test skip links
- [ ] Verify form error announcements
- [ ] Test keyboard shortcuts
- [ ] Check color contrast in all states
- [ ] Test with browser zoom (200%, 400%)
- [ ] Verify touch target sizes on mobile

### Automated Testing
- [ ] Run axe DevTools
- [ ] Run Lighthouse accessibility audit
- [ ] Check WAVE browser extension
- [ ] Verify HTML validation

### Screen Reader Testing Scenarios
1. **Navigation** - Use skip links, navigate by headings
2. **Forms** - Complete a form, trigger validation
3. **Modals** - Open/close modals, verify focus trap
4. **Dynamic Content** - Verify announcements for loading states
5. **Keyboard Shortcuts** - Open shortcuts modal, test navigation

## Browser Support
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile Safari (iOS 15+)
- Mobile Chrome (Android 12+)

## Assistive Technology Support
- VoiceOver (macOS, iOS)
- NVDA (Windows)
- JAWS (Windows)
- TalkBack (Android)
- Dragon NaturallySpeaking
- Switch Control

## Motion & Animation
All animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Known Issues & Future Improvements
Track accessibility issues in GitHub with label: `accessibility`

### Roadmap
- [ ] Add more comprehensive keyboard shortcuts
- [ ] Implement custom focus indicators for complex components
- [ ] Add high contrast theme toggle
- [ ] Improve mobile screen reader experience
- [ ] Add accessibility preferences panel

## Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Apple Accessibility Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [WebAIM Resources](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

## Contact
For accessibility concerns or improvements, please:
1. Open an issue with the `accessibility` label
2. Include specific use case and assistive technology used
3. Provide steps to reproduce

---

**Last Updated:** 2026-01-16
**Compliance Level:** WCAG 2.1 Level AA
**Audit Status:** ✅ Passing
