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

---

## Milestone: v2.0 Adaptive Learning Evolution

**Objective:** Transform platform from "courses + chatbot" into research-backed adaptive learning system that solves the "90% don't complete" problem through intelligent personalization.

**Source:** NotebookLM deep research (40 sources) + academic literature review

**Depends on:** v1.0 Flawless Launch complete (Phase 5)

---

## Phase 10: Data Collection + A/B Enhancement

**Priority:** Critical (enables all subsequent ML features)

**Goal:** Build interaction logging infrastructure for hybrid model training + complete A/B testing UI

### 10.1 Interaction Logging Infrastructure
- Create InteractionLog type with full context
- Build logging service for all learning events
- Store to Firestore `interactionLogs` collection
- Include: questionId, skillId, isCorrect, responseTimeMs, attemptNumber

### 10.2 A/B Testing Dashboard UI
- Build admin UI for experiment management
- Show live experiment results with statistical significance
- Create experiment variant configuration interface
- First experiment: Socratic Sage vs current coach

**Success Criteria:**
- All quiz/practice interactions logged with full context
- Admin can create/monitor experiments via UI
- Data pipeline ready for hybrid model training

---

## Phase 11: FSRS Wiring + Exam Mode

**Priority:** High (certification focus is core value)

**Goal:** Wire existing FSRS to learning flow, add Exam Mode scheduling

### 11.1 FSRS Integration
- After atom completion → schedule review via FSRS
- Create review queue widget on dashboard
- Insert review items into learning sessions

### 11.2 Exam Mode
- User inputs certification exam date
- System calculates workload for 95% retention by date
- Daily review schedule adjusts automatically
- Show exam readiness projection

**Success Criteria:**
- Completed atoms automatically scheduled for FSRS review
- Review tab shows due items sorted by priority
- Exam Mode drives personalized study schedule

---

## Phase 12: Socratic RAG Coach

**Priority:** High (93.8% remediation vs 64.5% for static hints)

**Goal:** Evolve Sage into Socratic tutor with RAG-grounded responses

### 12.1 Content Indexing Pipeline
- Set up Pinecone vector database
- Create embedding pipeline for course content
- Index: video transcripts, readings, quiz questions, misconceptions

### 12.2 Socratic Prompt Architecture
- Implement LearnLM-based prompting
- Hierarchical intervention: question → hint → worked example
- Never give direct answers until Tier 3

### 12.3 RAG Retrieval Integration
- Query Pinecone on each student question/error
- Include BKT state + struggle level in context
- Ground all responses in course content

**Success Criteria:**
- Coach answers grounded in course content (no hallucination)
- Socratic method applied consistently
- Measurable improvement in quiz remediation rates

---

## Phase 13: Adaptive Interleaving

**Priority:** Medium-High (50% improvement in discrimination ability)

**Goal:** Dynamic content sequencing that interleaves review with new learning

### 13.1 Interleaving Algorithm
- Query FSRS for due items (Retrievability < 0.90)
- Filter by semantic similarity to current lesson
- Construct dynamic queue mixing new + review

### 13.2 Dynamic Queue Assembly
- Keep instruction atoms blocked (new material)
- Interleave practice atoms with reviews
- Add "Review Challenge" badge to interleaved items

**Success Criteria:**
- Review items appear naturally during sessions
- Interleaving based on semantic relevance
- Clear UI distinction for review items

---

## Phase 14: Mastery Map UX

**Priority:** Medium (prevents disorientation in adaptive system)

**Goal:** Visual skill prerequisite graph showing progress

### 14.1 Mastery Map Component
- Build node-link diagram of skills
- Nodes light up as P(mastery) increases
- Show: current position, completed, locked

### 14.2 Integration
- Always visible during learning (sidebar/overlay)
- Click node to see skill details
- Navigation to related content

**Success Criteria:**
- Visual progress across skill graph
- Clear indication of prerequisites
- Navigation aid for learners

---

## Phase 15: Hybrid Learner Model (DKT2 + BKT)

**Priority:** High (8.7% AUC improvement over BKT alone)

**Goal:** Dual-pathway neural network for superior mastery prediction

### 15.1 Model Architecture
- Transformer pathway (4 layers, h=8) for sequential patterns
- Bayesian pathway (DAG) for prior knowledge
- Cross-attention between pathways
- Train on collected interaction data

### 15.2 Integration
- Cold-start: BKT for first 10-20 interactions
- Hybrid: after sufficient data per user
- Gradual rollout with A/B testing

**Success Criteria:**
- Hybrid model trained on 100k+ interactions
- A/B test shows improved mastery prediction
- Seamless BKT → Hybrid transition

---

## v2.0 Execution Order

```
Phase 10 → Phase 11 → Phase 12 → Phase 13 → Phase 14 → Phase 15
    ↓          ↓          ↓          ↓          ↓          ↓
Critical    High       High      Med-High   Medium      High
 Week 1-2   Week 2-4   Week 4-6   Week 6-8   Week 8-10  Week 10-14
```

**Data Collection Note:** Phase 10 must start immediately to collect training data for Phase 15 hybrid model.

---

## v2.0 Estimated Scope

| Phase | Plans | Complexity |
|-------|-------|------------|
| Phase 10 | 2 | Medium |
| Phase 11 | 2 | Medium |
| Phase 12 | 3 | High (RAG pipeline) |
| Phase 13 | 2 | Medium |
| Phase 14 | 2 | Medium |
| Phase 15 | 2 | High (ML model) |
| **Total** | **13 plans** | |

---

---

## Milestone: v2.1 UI/UX Perfection

**Objective:** Transform platform UI to match research-backed best practices for online learning. "Duolingo Meets Professional Certification" - calming, encouraging, professional.

**Source:** NotebookLM research (166 sources) + Aptly brand guidelines

**Depends on:** v2.0 Adaptive Learning Evolution complete (Phase 15)

---

## Phase 16: Design Tokens Foundation

**Priority:** Critical (enables all subsequent UI work)

**Goal:** Create single source of truth for colors, animations, spacing, and touch targets

### 16.1 Create Design Tokens Module
- Create `src/lib/design-tokens.ts`
- Define COLORS (navy, teal, yellow, purple, success, error)
- Define TIMING (instant: 100ms, standard: 200ms, elaborate: 400ms)
- Define SPRING configs for Framer Motion
- Define TOUCH_TARGET minimums (44px, 48px)
- Define Z_INDEX layers

### 16.2 Replace Hardcoded Colors
- Audit all components for hardcoded hex values
- Replace with CSS variables from design tokens
- Files: ProgressBar.tsx, MiniMap.tsx, MasteryMapNode.tsx, Card.tsx

**Success Criteria:**
- Zero hardcoded hex colors in components
- All animations use standard timing constants
- Touch targets meet 44px minimum

---

## Phase 17: Core Component Polish

**Priority:** High

**Goal:** Standardize Button, Card, Input, ProgressBar components

### 17.1 Button Component
- Ensure all sizes meet 44px minimum touch target
- Standardize pressed state: scale(0.97)
- Add shimmer loading skeleton option
- Use SPRING.snappy consistently
- Add aria-busy for loading state

### 17.2 Card Component
- Standardize hover: translateY(-4px) + teal border tint
- Use SPRING.gentle for animations
- Add dark mode support (dark: variants)
- Remove hardcoded rgba, use CSS variables

### 17.3 Input Component
- Add teal focus glow ring
- Add success state (green border when validated)
- Ensure height matches button sizes
- Add aria-invalid support

### 17.4 ProgressBar Component
- Replace hardcoded hex colors
- Add shimmer effect on 100% completion
- Use CSS variables for all colors

**Success Criteria:**
- All core components use design tokens
- Consistent animation behavior
- Accessibility attributes present

---

## Phase 18: Quiz Interface Enhancement

**Priority:** High (core learning experience)

**Goal:** Research-backed quiz UI with immediate feedback and Socratic hints

### 18.1 Answer Options
- 48px touch targets on all options
- Keyboard navigation (Tab, Enter, Spacebar)
- Color + icon for feedback (never color alone)

### 18.2 Feedback Timing
- Correct: Green checkmark + 200ms animation
- Incorrect: Red indicator + shake animation
- Streak celebration: "3 in a row!" toast

### 18.3 Hint Presentation (Socratic Layering)
- Level 1: Metacognitive prompt
- Level 2: Guided hint
- Level 3: Sentence frame
- < 150ms delivery latency

**Success Criteria:**
- Quiz feedback feels instant (< 200ms)
- Never convey meaning by color alone
- Hint progression follows Socratic method

---

## Phase 19: Gamification UI Polish

**Priority:** Medium-High

**Goal:** Streak, XP, and badge UI following Duolingo patterns

### 19.1 Streak Display
- Flame icon with animation
- Calendar view showing streak history
- Streak freeze UI (safety net visualization)
- Loss aversion notification

### 19.2 XP System
- Immediate +XP animation (200ms)
- Variable reward amounts
- Speed bonus for fast correct answers
- Progress bar to next level

### 19.3 Badge Display
- Rarity hierarchy visual (common/rare/legendary glow)
- Unlock celebration (confetti + modal)
- Portfolio/showcase view
- Progress to next badge indicator

**Success Criteria:**
- Streak visible and animated
- XP rewards feel immediate
- Badges have visual hierarchy

---

## Phase 20: Mastery Visualization

**Priority:** Medium

**Goal:** Visual skill map with "light up" effect on mastery

### 20.1 Mastery Map Enhancement
- Nodes light up with yellow (#FFDE00) on mastery
- Color-coded probability (blue = improving, red = declining)
- Prerequisites shown as directed edges
- Locked nodes for unmet prerequisites

### 20.2 Progress Indicators
- Skill-by-skill progress (not just aggregate %)
- Mastery threshold visualization (P ≥ 0.95)
- FSRS retrievability decay visualization

**Success Criteria:**
- Visual progress across skill graph
- Clear mastery state per node
- FSRS decay visible

---

## Phase 21: Accessibility Hardening

**Priority:** High (WCAG 2.1 AA compliance)

**Goal:** Full keyboard navigation, screen reader support, reduced motion

### 21.1 Contrast & Color
- Verify 4.5:1 for all text
- Verify 3:1 for UI components
- Never convey meaning by color alone

### 21.2 Keyboard Navigation
- All interactive elements focusable
- Visible focus indicators (teal ring)
- Skip links on every page
- Focus trap in modals

### 21.3 Screen Readers
- Alt text on all images
- Semantic HTML (h1-h6 hierarchy)
- ARIA labels on custom components

### 21.4 Reduced Motion
- prefers-reduced-motion media query
- Disable animations for users who prefer it

**Success Criteria:**
- Lighthouse accessibility > 90
- Full keyboard operability
- Screen reader compatible

---

## Phase 22: Performance Optimization

**Priority:** Medium

**Goal:** Memoization, code splitting, debouncing

### 22.1 Memoization
- Add React.memo() to expensive components
- CoachLearningView: ProgressSidebar, SmartCoachBar, ChatOverlay
- Dashboard: LessonPreviewCard, StatCard, CourseCard
- EnhancedMasteryMap: individual MapNode components

### 22.2 useMemo for Expensive Computations
- dashboard/page.tsx: getUpcomingLessons()
- Other computed values in render

### 22.3 Code Splitting
- dynamic() imports for admin pages
- dynamic() for Recharts (heavy library)
- dynamic() for mastery page

### 22.4 Debounce ResizeObserver
- EnhancedMasteryMap: 100ms debounce

**Success Criteria:**
- No unnecessary re-renders
- Admin pages lazy loaded
- Smooth resize behavior

---

## Phase 23: Hook Extraction

**Priority:** Medium (code quality)

**Goal:** Extract reusable hooks from duplicated patterns

### 23.1 useAtomCompletion Hook
- Shared completion logic for all atom types
- Extract from: QuizAtom, PracticeAtom, ReadingAtom, VideoAtom

### 23.2 useContentViewLogging Hook
- View duration tracking
- Extract duplicated ref + useEffect pattern

### 23.3 useProgressHeader Hook
- Time + question progress display
- Shared across learning views

**Success Criteria:**
- No duplicated completion logic
- Consistent view logging
- Reusable progress display

---

## v2.1 Execution Order

```
Phase 16 → Phase 17 → Phase 18 → Phase 19 → Phase 20 → Phase 21 → Phase 22 → Phase 23
    ↓          ↓          ↓          ↓          ↓          ↓          ↓          ↓
Critical    High       High      Med-High   Medium      High      Medium     Medium
```

**Thread Strategy:**
- Phase 16-17: P-Thread (parallel - independent file territories)
- Phase 18: Base-Thread (sequential - dependent changes)
- Phase 19-20: P-Thread (parallel)
- Phase 21: P-Thread (parallel across all components)
- Phase 22: P-Thread (parallel)
- Phase 23: Base-Thread (sequential)

---

## v2.1 Estimated Scope

| Phase | Plans | Complexity |
|-------|-------|------------|
| Phase 16 | 2 | Medium |
| Phase 17 | 4 | Medium |
| Phase 18 | 3 | Medium-High |
| Phase 19 | 3 | Medium |
| Phase 20 | 2 | Medium |
| Phase 21 | 4 | Medium |
| Phase 22 | 4 | Low-Medium |
| Phase 23 | 3 | Low-Medium |
| **Total** | **25 plans** | |

---

*Last updated: 2026-01-12*
