# Aptly Learning — Completion Roadmap

## Milestone: v1.0 Flawless Launch

**Objective:** Transform partially-integrated platform into cohesive adaptive learning experience.

---

## Phase 1: Wire Adaptive Learning Flow

**Priority:** Critical (this is the flagship feature)

**Goal:** Replace linear learn page with session-based adaptive experience

### 1.1 Refactor Learn Page Structure
- Extract linear navigation logic
- Import and render AdaptiveSessionView as primary content
- Pass user ID, preferences, and callbacks

### 1.2 Connect Session Builder
- Call `buildSession()` on page load with available time estimate
- Display session overview before learning starts
- Store active session in component state

### 1.3 Enable Pre-Test Flow
- Show PretestOffer component before each lesson
- Call pretest API to generate questions
- Handle skip vs learn outcomes
- Show SkipSuccessMessage when user tests out

### 1.4 Wire Session Items
- Render session items in sequence
- Track completion per item
- Show adaptive reasoning ("Learning this because...")
- Update session progress visually

### 1.5 Interleave Reviews
- Insert review cards between learning items per session structure
- Connect to existing ReviewTab functionality
- Seamless transition between learn and review

**Success Criteria:**
- User sees "Start Session" instead of direct content
- Session shows item count and estimated time
- Pre-test option visible before lessons
- Reviews appear naturally during session
- Adaptive reasoning shown for each item

---

## Phase 2: Complete Missing Components

**Priority:** High

**Goal:** Build the remaining UI pieces for full adaptive experience

### 2.1 Build ProactiveCoach Component
- Full-screen or slide-in coach intervention UI
- Shows when useProactiveCoach triggers intervention
- Accepts intervention types: alternative_explanation, prerequisite_review, simpler_practice, coach_session, break_suggestion
- Animated entrance/exit

### 2.2 Build CoachIntervention Component
- Modal/card for showing specific intervention
- "I notice you're struggling with X..."
- Accept/Dismiss buttons
- Tracks intervention response

### 2.3 Wire Content Variants
- In atom components, check user's struggle history
- Call selectVariant() to get appropriate content
- Render simpler/standard/advanced variants based on learner state
- Log which variant was shown

**Success Criteria:**
- Coach proactively appears when user struggles
- Intervention UI is polished and non-intrusive
- Simpler content shown to struggling users
- All interactions logged for analytics

---

## Phase 3: Fix Test Suite

**Priority:** High

**Goal:** Achieve 95%+ test pass rate

### 3.1 Fix Firestore Mock Pattern
- Audit all test files for mock inconsistencies
- Create shared mock setup in test utils
- Ensure adminDb and adminAuth properly mocked

### 3.2 Fix progressService Tests
- Export missing functions (initializeUserProgress, updateProgressData)
- Update test imports
- Verify all functions tested

### 3.3 Fix badgeService Tests
- Mock user document existence
- Handle "User not found" scenarios in tests
- Add positive and negative test cases

### 3.4 Fix Remaining Failures
- Audit all 136 failures
- Group by root cause
- Fix systematically

**Success Criteria:**
- `npm run test` shows 95%+ pass rate
- No test file with 100% failures
- CI-ready test suite

---

## Phase 4: Wire Event Tracking

**Priority:** Medium-High

**Goal:** Complete analytics instrumentation

### 4.1 Add Learning Flow Events
- session_start when session begins
- atom_start when atom renders
- atom_complete when atom finished
- session_end when session concludes

### 4.2 Add Struggle Events
- struggle_detected when useProactiveCoach triggers
- intervention_shown when coach appears
- intervention_accepted / intervention_dismissed based on user action

### 4.3 Add Adaptive Feature Events
- pretest_start / pretest_complete
- content_skipped when user tests out
- path_modified when coach changes path

### 4.4 Verify Analytics Pipeline
- Check analyticsEvents collection in Firestore
- Verify experiment variant in events
- Test event querying

**Success Criteria:**
- All key user actions generate events
- Events include userId, sessionId, experiment variant
- Analytics dashboard shows real data

---

## Phase 5: Content & Data Migration

**Priority:** Medium

**Goal:** Production-ready data layer

### 5.1 Switch to Firestore Content
- Remove direct mockData imports from learn page
- Use useCourseContent hook as primary source
- Keep mockData as dev-only fallback

### 5.2 Run Content Migration
- Execute migrateContent.ts script
- Verify courses/modules/lessons/atoms in Firestore
- Check IDs match existing progress data

### 5.3 Seed Experiments
- Create 3 initial experiments in Firestore
- Set status to 'running'
- Verify assignVariant() works for new users

### 5.4 End-to-End Verification
- Clear browser, load learn page
- Verify Firestore requests (not mockData)
- Complete full learning session
- Check all data persisted correctly

**Success Criteria:**
- Zero mockData imports in production code paths
- Firestore has complete course content
- Experiments active and assigning variants
- Full flow works end-to-end

---

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   ↓         ↓         ↓         ↓         ↓
Critical  High      High      Med-High  Medium
```

**Recommended approach:**
1. Phase 1 first — this is the core value proposition
2. Phase 2 after — completes the adaptive UX
3. Phase 3 in parallel — can run tests while building
4. Phase 4 once flows work — instrument after logic stable
5. Phase 5 last — production data after features complete

---

## Estimated Scope

| Phase | Plans | Complexity |
|-------|-------|------------|
| Phase 1 | 5 | High (major refactor) |
| Phase 2 | 3 | Medium |
| Phase 3 | 4 | Medium |
| Phase 4 | 4 | Low-Medium |
| Phase 5 | 4 | Low-Medium |
| **Total** | **20 plans** | |

---

*Last updated: 2026-01-08*
