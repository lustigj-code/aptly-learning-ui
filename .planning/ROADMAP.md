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

## Phase 4.1: AI-Powered Dynamic Skill Map Generation (INSERTED)

**Priority:** High (enables multi-course adaptive learning)
**Status:** In progress (1/4 plans complete)

**Goal:** Use AI to automatically generate skill maps for any course, enabling the adaptive system to work across all content

**Depends on:** Phase 4

### 4.1-01 Types & Course Parser - COMPLETE
- [x] Define DynamicSkillMap TypeScript types
- [x] Build course content parser service
- Summary: `.planning/phases/4.1-ai-powered-dynamic-skill-map-generation/4.1-01-SUMMARY.md`

### 4.1.1 Build Skill Map Generator
- Create AI service that analyzes course content (lessons, atoms, quizzes)
- Use Gemini to extract skills/concepts from content
- Generate prerequisite relationships automatically
- Output skill map in standard format

### 4.1.2 Course Analysis Pipeline
- Parse course structure (modules, lessons, atoms)
- Extract learning objectives from content
- Identify quiz questions and map to skills
- Estimate BKT parameters based on content difficulty

### 4.1.3 Dynamic Skill Map Storage
- Store generated skill maps in Firestore per course
- Update sequencer to load skill maps dynamically (not hardcoded)
- Cache skill maps for performance
- Support skill map versioning

### 4.1.4 Admin Interface for Skill Maps
- View generated skill maps in admin panel
- Allow manual adjustments to AI-generated maps
- Trigger re-generation when content changes
- Preview adaptive recommendations before publishing

**Success Criteria:**
- Any course can have skill map generated via AI
- Sequencer uses dynamic skill maps from Firestore
- Adaptive learning works for Social Media Marketing course
- Admin can review and adjust generated skill maps

---

## Phase 4.2: Multi-Course & AI Integration (INSERTED)

**Priority:** High (fixes critical UX issues)
**Status:** Not started

**Goal:** Transform platform to support multiple courses dynamically, redesign reading experience, and make AI features prominent throughout learning.

**Depends on:** Phase 4.1

### 4.2.1 Course Registry & Infrastructure
- Create `/src/data/courseRegistry.ts` as single source of truth
- Replace hard-coded if/else course selection with dynamic lookups
- Update dashboard to show correct course title (AI at Work)
- Update learn page breadcrumbs with actual course/module/lesson names
- Update user defaults to start with AI at Work course

### 4.2.2 Reading UI Redesign
- Remove broken scroll-based progress bar
- Narrow prose width to 680px (optimal reading)
- Add time-based progress indicator ("5 min read", "2:30 elapsed")
- Add "Key Takeaways" section from highlights
- Simple "Mark as Complete" button
- Mobile-friendly sticky footer

### 4.2.3 Prominent AI Features
- Verify/fix coach chat functionality
- Add "Get AI Summary" button during reading
- Add "Get a Hint" (Socratic) during quizzes
- Add "Explain Why" after wrong answers
- Create reusable AI components (AISummary, AIHintPanel, AIContextButton)

### 4.2.4 Integration Testing
- Verify course switching works
- Test reading experience on mobile
- Test AI features respond correctly
- End-to-end learning flow with new components

**Success Criteria:**
- Dashboard shows "AI at Work" course correctly
- Breadcrumb shows correct course/module/lesson names
- Reading UI is clean with working time-based progress
- AI features visible and functional during learning
- Coach chat responds correctly

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
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 4.1 → Phase 4.2 → Phase 5
   ↓         ↓         ↓         ↓          ↓          ↓          ↓
Critical  High      High      Med-High    High       High      Medium
```

**Recommended approach:**
1. Phase 1 first — this is the core value proposition
2. Phase 2 after — completes the adaptive UX
3. Phase 3 in parallel — can run tests while building
4. Phase 4 once flows work — instrument after logic stable
5. Phase 4.1 after tracking — enables multi-course adaptive learning (URGENT INSERT)
6. Phase 4.2 after skill maps — course infrastructure, reading UI, AI features (URGENT INSERT)
7. Phase 5 last — production data after features complete

---

## Estimated Scope

| Phase | Plans | Complexity |
|-------|-------|------------|
| Phase 1 | 5 | High (major refactor) |
| Phase 2 | 3 | Medium |
| Phase 3 | 4 | Medium |
| Phase 4 | 4 | Low-Medium |
| Phase 4.1 | 4 | Medium-High (AI integration) |
| Phase 4.2 | 4 | Medium-High (infrastructure + UI + AI) |
| Phase 5 | 4 | Low-Medium |
| **Total** | **28 plans** | |

---

---

## Milestone: v1.1 Feature Expansion

**Objective:** Extend platform with certification prep, portfolio, enhanced gamification, and mobile optimization.

**Depends on:** v1.0 Flawless Launch complete

---

## Phase 6: Certification Readiness

**Priority:** High (core value for professional certification)

**Goal:** Enable users to prepare for and pass certification exams

### 6.1 Exam Tracker Dashboard
- Create certification progress dashboard
- Show readiness score based on mastery levels
- Display exam date countdown and study schedule
- Recommend focus areas based on weak skills

### 6.2 Practice Exams
- Build full-length practice exam mode
- Timer with exam-like conditions
- Random question selection from question bank
- Detailed score breakdown by topic
- Compare to passing threshold

### 6.3 Exam Simulation Mode
- Replicate actual exam experience (time limits, no hints)
- Track confidence levels per question
- Post-exam analysis with improvement suggestions
- Retake functionality with different questions

### 6.4 Certification Tracking
- Record exam attempts and scores
- Display digital badges for passed certifications
- Integration with certification providers (if available)
- Shareable certificates

**Success Criteria:**
- Users can track certification readiness
- Practice exams available with realistic conditions
- Score predictions correlate with actual exam performance
- Certification badges displayed on profile

---

## Phase 7: Portfolio & Projects

**Priority:** Medium-High (differentiator for job seekers)

**Goal:** Enable users to build and showcase project work

### 7.1 Project Submission System
- Project submission interface (text, files, links)
- Rubric-based evaluation framework
- AI-powered feedback on submissions
- Revision and resubmission workflow

### 7.2 Portfolio Builder
- User portfolio page with completed projects
- Project thumbnails and descriptions
- Skills demonstrated per project
- Public/private visibility settings

### 7.3 Project Showcase
- Community gallery of best projects
- Peer review system
- Instructor feedback integration
- Featured projects section

### 7.4 LinkedIn/Resume Integration
- Export portfolio as PDF
- Generate project descriptions for LinkedIn
- Skills badges for completed projects
- Shareable project links

**Success Criteria:**
- Users can submit and receive feedback on projects
- Portfolio pages showcase completed work
- Projects can be shared externally
- Skills from projects reflected in mastery tracking

---

## Phase 8: Gamification Enhancements

**Priority:** Medium (engagement boost)

**Goal:** Deepen engagement through enhanced gamification

### 8.1 Leaderboards
- Weekly/monthly leaderboards by XP
- Course-specific leaderboards
- Opt-in competitive mode
- Team/cohort competitions

### 8.2 Challenges & Quests
- Daily/weekly learning challenges
- Multi-step quests with narrative
- Time-limited events
- Challenge rewards (special badges, XP multipliers)

### 8.3 Social Learning
- Study groups/cohorts
- Discussion forums per lesson
- Peer Q&A with upvoting
- Mentor matching for advanced users

### 8.4 Rewards Shop
- Virtual currency (in addition to XP)
- Cosmetic rewards (profile themes, avatars)
- Feature unlocks (priority support, early access)
- Charity donations option

**Success Criteria:**
- Leaderboards drive healthy competition
- Challenges increase daily active users
- Social features increase retention
- Rewards feel meaningful and earned

---

## Phase 9: Mobile & Polish

**Priority:** Medium (accessibility)

**Goal:** Optimize for mobile and achieve app-like experience

### 9.1 PWA Enhancement
- Offline mode for downloaded content
- Push notifications for streaks and reviews
- Add to home screen optimization
- App-like transitions and gestures

### 9.2 Mobile UI Optimization
- Swipe navigation between atoms
- Touch-optimized quiz interactions
- Mobile-first reading experience
- Thumb-friendly bottom navigation

### 9.3 Mobile-Specific Features
- Voice input for practice responses
- Camera for project submissions
- Biometric authentication
- Mobile-optimized video player

### 9.4 Performance Optimization
- Sub-second page transitions
- Aggressive caching strategy
- Image optimization pipeline
- Bundle size reduction

**Success Criteria:**
- Lighthouse PWA score > 90
- Mobile session duration equals desktop
- Offline mode works reliably
- App store rating > 4.5 (if native wrapper)

---

## v1.1 Execution Order

```
Phase 6 → Phase 7 → Phase 8 → Phase 9
   ↓         ↓         ↓         ↓
 High    Med-High   Medium    Medium
```

**Recommended approach:**
1. Phase 6 first — certification is core value proposition
2. Phase 7 second — portfolio adds career value
3. Phase 8 third — gamification boosts engagement
4. Phase 9 last — polish after features stable

---

## v1.1 Estimated Scope

| Phase | Plans | Complexity |
|-------|-------|------------|
| Phase 6 | 4 | High (exam simulation) |
| Phase 7 | 4 | Medium-High |
| Phase 8 | 4 | Medium |
| Phase 9 | 4 | Medium |
| **Total** | **16 plans** | |

---

*Last updated: 2026-01-11*
