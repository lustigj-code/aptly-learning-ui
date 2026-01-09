# Aptly Learning Platform — Completion Plan

## What This Is

A Next.js 16 learning platform with AI tutoring, Bayesian Knowledge Tracing, adaptive sequencing, and spaced repetition. The core algorithms are built; the platform needs integration work to connect everything into a cohesive, flawless experience.

## Core Value

**Adaptive learning that actually works** — users should never see content they already know, always see reviews before they forget, and get help the moment they struggle.

## Requirements

### Validated (Existing & Working)

- ✓ FSRS spaced repetition algorithm — integrated in complete-atom API
- ✓ BKT (Bayesian Knowledge Tracing) algorithm — full implementation with tests
- ✓ 41-skill map with prerequisites — complete with Q-matrix
- ✓ Review system — API endpoints, ReviewTab component, badge count
- ✓ Time tracking — useTimeTracking hook in all atom components
- ✓ Mastery gates — MasteryGate component blocks locked content
- ✓ Skill visualization — SkillMap in progress page
- ✓ Quiz skill updates — QuizAtom shows mastery changes per question
- ✓ Proactive coach hook — useProactiveCoach with struggle detection
- ✓ Efficacy metrics framework — complete with A/B testing
- ✓ Admin analytics dashboard — exists at /admin/analytics

### Active (Must Complete)

#### Phase 1: Wire Adaptive Learning Flow (Critical)

- [ ] **Integrate AdaptiveSessionView into learn page** — Replace linear navigation with session-based flow
- [ ] **Connect buildSession() to learn page** — Generate personalized sessions on page load
- [ ] **Enable pre-test UI** — Show "Test out of this?" before lessons
- [ ] **Wire session items** — Display session overview, track completion
- [ ] **Interleave reviews** — Insert reviews between learning items per session plan

#### Phase 2: Complete Missing Components

- [ ] **Build ProactiveCoach.tsx** — Full coach intervention component (currently only ProactivePrompt.tsx exists)
- [ ] **Build CoachIntervention.tsx** — UI for accepting/dismissing interventions
- [ ] **Complete content variant selection** — Wire contentVariants.ts into atom rendering

#### Phase 3: Fix Test Suite

- [ ] **Fix Firestore mock setup** — 136 tests failing due to mock issues
- [ ] **Fix progressService tests** — Functions not exported correctly
- [ ] **Fix badgeService tests** — User not found errors
- [ ] **Achieve 95%+ test pass rate** — All critical paths tested

#### Phase 4: Wire Event Tracking

- [ ] **Add trackEvent() calls throughout learning flow** — atom_start, atom_complete, session_start, session_end
- [ ] **Track struggle signals** — struggle_detected, intervention_shown/accepted/dismissed
- [ ] **Track adaptive features** — pretest_start/complete, content_skipped, path_modified
- [ ] **Verify events in Firestore** — analyticsEvents collection populated

#### Phase 5: Content & Data Migration

- [ ] **Switch learn page to Firestore content** — Remove mockData dependency
- [ ] **Run migrateContent.ts** — Seed Firestore with course data
- [ ] **Seed initial experiments** — Create 3 A/B experiments in Firestore
- [ ] **Verify experiment assignment** — New users get variants

### Out of Scope

- Mobile app (iOS/Android) — web-first, PWA later
- Multi-language support — English only for v1
- Course authoring CMS — content hardcoded/seeded for now
- Payment/subscription — free during beta

## Context

### Current State

The codebase has extensive infrastructure:
- 22+ API routes
- 14 hooks
- Complete adaptive algorithms (sequencer, session builder, pretest, struggle detection)
- Full analytics/experimentation framework

The gap is integration. Algorithms exist in isolation. The learn page still uses linear "next/prev" navigation from an earlier version.

### Technical Debt

1. **Learn page complexity** — 649 lines, does too much, should delegate to AdaptiveSessionView
2. **Test mocks broken** — Firestore mocking pattern inconsistent across test files
3. **mockData dependency** — Learn page imports mockData directly instead of fetching

### Key Files to Modify

| File | Change Needed |
|------|---------------|
| `src/app/learn/page.tsx` | Major refactor to use AdaptiveSessionView |
| `src/components/learning/AdaptiveSessionView.tsx` | Wire into learn page as primary view |
| `src/components/coach/ProactiveCoach.tsx` | Create new component |
| `src/components/coach/CoachIntervention.tsx` | Create new component |
| `src/lib/services/__tests__/*.test.ts` | Fix mock setup |

## Constraints

- **Tech stack**: Next.js 16, React 19, Firebase, Gemini AI — locked in
- **Testing**: Vitest (not Jest) — must use existing setup
- **Deployment**: Vercel + Firebase — production config exists
- **Performance**: Keep learn page under 3s initial load

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AdaptiveSessionView as primary | Keeps adaptive logic encapsulated | — Pending |
| Fix tests before features | Broken tests hide regressions | — Pending |
| Event tracking per component | Distributed is more maintainable | — Pending |

---
*Last updated: 2026-01-08 after completion audit*
