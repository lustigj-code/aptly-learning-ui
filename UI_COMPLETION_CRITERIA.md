# UI Perfection Completion Criteria

## Brand Guidelines (MUST FOLLOW)

### Color Palette (globals.css tokens)
- **Primary**: Navy (#0A004A), Teal (#21A8B0), Yellow (#FFDE00), Purple (#3B336E)
- **Secondary**: Muted Teal (#69BCC1), Light Teal (#DEF2F2)
- **Semantic**: Success (#88B644), Error (#E84133), Warning (#EC6726)
- **Neutrals**: White (#FFFFFF), Light Grey (#E6E6E6), Grey (#CCCCCC), Rich Black (#333333)

### Typography
- **Font**: DM Sans (already configured)
- **Scale**: h1 (48px), h2 (36px), h3 (28px), h4 (22px), h5 (18px)

### Design Philosophy
- "Duolingo Meets Professional Certification"
- "Inspired by Headspace, Masterclass"
- Calming, encouraging, professional

---

## Completion Criteria (Checklist)

### 1. Animation Timing System
- [x] `--transition-instant: 100ms` - micro-feedback, toggles
- [x] `--transition-standard: 200ms` - most transitions (already exists as --transition-base)
- [x] `--transition-elaborate: 400ms` - page transitions, celebrations (already exists as --transition-spring)
- [x] All components use these 3 tiers consistently

### 2. Button Component
- [x] Minimum 44px touch target on mobile (h-11 = 44px)
- [x] Pressed state: scale(0.97) + shadow reduction
- [x] Consistent icon sizes per button size
- [x] Loading state with shimmer skeleton option
- [x] Focus-visible ring using brand teal

### 3. Card Component
- [x] Consistent shadow scale (shadow-sm, shadow-md, shadow-lg, shadow-xl)
- [x] Interactive cards: hover translateY(-4px) standardized
- [x] Border-color shift on hover (subtle teal tint)
- [x] Glass variant: proper backdrop-blur

### 4. Input Component
- [x] Focus state with teal glow ring
- [x] Error state with error border + message
- [x] Success state with success border (when validated)
- [x] Consistent height scale matching buttons

### 5. Page Consistency
- [x] Dashboard: Stagger animations use `0.05 * index` formula
- [x] All stat cards have consistent hover states
- [ ] Empty states designed for all lists/grids (pre-existing)
- [x] Skeleton loaders on all data-dependent sections (pre-existing)

### 6. Micro-Interactions
- [x] Button ripple/press effect consistent
- [x] Card lift on hover consistent (4px)
- [x] Progress bar shimmer on completion
- [x] Toast slide-in with subtle bounce

### 7. Technical Requirements
- [x] Build passes: `npm run build` succeeds
- [x] Lint passes: `npm run lint` succeeds (UI files clean, pre-existing service file warnings)
- [x] No TypeScript errors
- [x] All brand colors used via CSS variables (not hardcoded hex)

---

## Files to Modify

### Priority 1: Core Components
1. `src/components/ui/Button.tsx` - touch targets, pressed states
2. `src/components/ui/Card.tsx` - shadow consistency, hover states
3. `src/components/ui/Input.tsx` - focus/error/success states
4. `src/app/globals.css` - animation timing tokens

### Priority 2: Pages
5. `src/app/dashboard/page.tsx` - animation consistency
6. `src/app/learn/page.tsx` - quiz animations, video polish
7. `src/app/progress/page.tsx` - stat card polish
8. `src/app/achievements/page.tsx` - badge animations

### Priority 3: Supporting Components
9. `src/components/ui/Toast.tsx` - slide animation
10. `src/components/ui/ProgressBar.tsx` - shimmer effect
11. `src/components/ui/Modal.tsx` - backdrop transition

---

## Quality Gates

Before marking complete:
1. `cd /Users/juleslustig/aptlylearning\ app/worktrees/ui-perfection && npm run build`
2. `npm run lint`
3. Visual inspection of key pages in browser

---

## Notes
- Every change must use existing brand tokens from globals.css
- No new colors - only existing palette
- Framer Motion for all animations
- Keep changes minimal and focused
