# Aptly Learning — Project State

## Current Position

**Milestone:** v2.0 Adaptive Learning Evolution
**Phase:** 13 COMPLETE, ready for Phase 14 (Mastery Map UX)
**Plan:** Phase 13.2 Complete - Dynamic Queue + UI Badge
**Status:** Phase 13 COMPLETE - Moving to Phase 14
**Last activity:** 2026-01-11 - Implemented FSRS-based Adaptive Interleaving

Progress: ██████████████░░░░░░ 60% (v2.0 Phase 13 of 15 complete)

**Previous Milestone:** v1.0 Flawless Launch - Phase 4.2 Complete

---

## Accumulated Context

### Key Decisions Made
- Session 3 (Adaptive Intelligence) implementation complete
- Skill map currently hardcoded for "AI at Work" course
- Need dynamic skill maps to support multi-course adaptive learning
- Using Gemini API for AI-powered features
- **[4.1-01]** Skill ID pattern: `{courseId}-{moduleNum}-{skillNum}`
- **[4.1-01]** ParsedCourseContent as standard AI input format
- **[v2.0]** NotebookLM research: 40 sources on adaptive learning best practices
- **[v2.0]** Hybrid model: DKT2 + BKT dual-pathway architecture
- **[v2.0]** Vector DB: Using existing Firestore vectors (Pinecone not needed)
- **[v2.0]** Data collection started: Firestore `interactionLogs` for ML training
- **[10.1]** Interaction logging captures 20+ fields per quiz/practice interaction
- **[12.1]** Pedagogical chunking: misconception per distractor, tiered hints
- **[12.2]** LearnLM Socratic prompts: 93.8% remediation vs 64.5% for static hints
- **[13.1]** FSRS interleaving: inject reviews when Retrievability < 90%
- **[13.2]** Adaptive ratio: 3:1 → 1:1 based on review backlog size

### Roadmap Evolution
- Phase 4.1 inserted after Phase 4: AI-powered dynamic skill map generation (URGENT)
  - Reason: Adaptive system only works for hardcoded "AI at Work" course
  - User testing revealed Social Media Marketing course has no skill map
  - This blocks the core adaptive learning feature
- Phase 4.2 inserted after Phase 4.1: Multi-Course & AI Integration (URGENT)
  - Reason: Course name shows "Social Media Marketing" instead of "AI at Work"
  - Reading UI has broken 0% progress bar and confusing layout
  - AI features only in coach chat, not visible during learning
  - User requested full multi-course system, reading redesign, and prominent AI

### Technical Context
- Gemini API key configured in `.env.local`
- Existing skill map: `/src/data/skillMap.ts` (41 skills for AI at Work)
- Sequencer: `/src/lib/adaptive/sequencer.ts` (dynamically loads skill maps per course)
- Course content: `/src/data/mockData.ts` (Social Media Marketing courses)
- **NEW:** Dynamic skill map types: `/src/lib/skillmap/types.ts`
- **NEW:** Course parser: `/src/lib/skillmap/courseParser.ts`
- **NEW:** Skill map generator: `/src/lib/skillmap/skillMapGenerator.ts` (Gemini AI)
- **NEW:** Firestore storage: `/src/lib/skillmap/skillMapStorage.ts` (CRUD ops + caching)
- **NEW:** Admin API: `/src/app/api/admin/skill-maps/` (list, generate, update status)
- **NEW:** Admin UI: `/src/app/admin/skill-maps/` (list + detail pages)

---

## Open Issues

### Blockers
- [ ] Adaptive learning only works for courses with matching skill maps
- [ ] No skill map exists for Social Media Marketing courses

### Deferred
- Content variants only cover 3 lessons (atoms 1.1, 2.1, 3.1)
- Limited pre-test question bank

---

## Session Notes

### 2026-01-11 (v2.0 Work - Phase 13)
- **Phase 13.1 COMPLETE:** Adaptive Interleaving Algorithm
  - Exported calculateRetrievability from fsrs.ts
  - Added getItemsBelowRetrievability for FSRS-based review selection
  - Created src/lib/sequencing/ directory with interleaver module
  - Semantic similarity scoring (same lesson: 0.9, same module: 0.7)
  - Adaptive ratio: 3:1 for small backlog, 1:1 for large backlog
  - Commit: 3b29c88
- **Phase 13.2 COMPLETE:** Dynamic Queue Assembly + UI
  - Updated session API with FSRS-based interleaving
  - Added isReviewChallenge flag to SessionItem type
  - Created ReviewChallengeBadge component (purple badge with icon)
  - Fallback to simple interleaving on error
  - Commit: 652772b
- Based on NotebookLM research: 50% improvement in discrimination ability

### 2026-01-11 (v2.0 Work - Continued)
- **Phase 12.1 COMPLETE:** RAG Pedagogical Infrastructure
  - Created src/lib/rag/ directory with 6 modules
  - PedagogicalChunk type with misconception/hint/example types
  - extractMisconceptionChunks: one chunk per distractor (wrong answer)
  - extractHintChunks: tiered hints (Tier 1, 2, 3)
  - pedagogicalRetriever with misconception priority
  - contentIndexer for batch embedding with Firestore
  - Admin API: /api/admin/rag/index
  - Commit: 6a101ae
- **Phase 12.2 COMPLETE:** LearnLM Socratic Prompts
  - socraticPrompts.ts: LearnLM-style system prompt builder
  - StudentContext: ability, struggle level, emotional state
  - ActivityContext: lesson, question, misconception
  - Three-tier intervention hierarchy (93.8% vs 64.5% remediation)
  - interventionManager.ts: state tracking and tier advancement
  - Coach API integration with useSocraticMode experiment flag
  - Low temperature (0.3) generation for focused responses
  - Commit: e919e07
- Decision: Use existing Firestore vectors (Pinecone not needed)

### 2026-01-11 (v2.0 Work - Earlier)
- Started v2.0 Adaptive Learning Evolution milestone
- Source: Deep research via NotebookLM (40 academic sources)
- Created Phase 10-15 roadmap for research-backed adaptive learning
- **Phase 10.1 COMPLETE:** Interaction Logging Infrastructure
  - Added InteractionLog types with 20+ ML-relevant fields
  - Created interactionLogService.ts for Firestore batch operations
  - Built useInteractionLogger hook with client-side batching
  - Added /api/interactions/log endpoint
  - Integrated logging into QuizAtom component
  - Commits: 3fbe388, e613285
- **Phase 10.2 COMPLETE:** A/B Testing Dashboard Enhancements
  - Added useSocraticMode field to ExperimentConfig
  - Created "Socratic Coach vs Direct Coach" experiment definition
  - Added interaction count monitoring to admin panel
  - Data collection progress bar (target: 100k for hybrid model)
  - Commits: a7889a9, 95e6097
- **Phase 11.1 COMPLETE:** FSRS Dashboard Integration
  - Dashboard already had review nudge banner + quick stats (verified)
  - Added review due badge to learning header (CoachLearningView)
  - Badge shows "N due" with Brain icon, links to /review
  - Commit: 523f1ac
- **Phase 11.2 COMPLETE:** Exam Mode
  - Added exam date fields to UserPreferences type and API
  - Created examReadiness.ts with FSRS-based calculations
  - Built ExamModeSettings component with date picker, retention slider
  - Created ExamReadinessWidget for dashboard with countdown and status
  - Commits: c76e920, 3048e31, 88b740d, dbf2cf6
- Data collection now active for hybrid model training
- Target: 100k+ interactions before Phase 15

### 2026-01-11 (v1.0 Work)
- Completed Phase 4.1: AI-Powered Dynamic Skill Map Generation (ALL 4 PLANS)
- 4.1-03: Firestore storage, sequencer update with courseId, skill map caching
- 4.1-04: Admin interface - list/detail pages, generate/activate actions
- Started Phase 4.2: Multi-Course & AI Integration
- 4.2-01: Created courseRegistry.ts as single source of truth, updated dashboard
- 4.2-02: Redesigned ReadingAtom with 680px width, time-based progress, Key Takeaways
- 4.2-03: Integrated AI features into learning UI:
  - Added SocraticQuizHint to QuizAtom (progressive hints before submit)
  - Added "Explain Why" button after wrong answers (AI coach explanation)
  - Added AI Summary button to ReadingAtom header
  - Created animated summary panel with loading states
- Fixed auth token access using getIdToken() from firebase auth module
- Verified Critical Integrations Plan:
  - useReviewQueue hook already exists and working
  - useMasteryLevels hook already exists and working
  - Dashboard already has review nudge banner and stats
  - Review page already exists with full FSRS flow
  - MasteryGate integration commented out in CoachLearningView (TODO: API stability)

### 2026-01-10 (Evening)
- Coach-first architecture: Unified /learn page with coach as primary UI
- Fixed CoachLearningView sequencing issues:
  - Added SessionState tracking (currentAtomIndex, completedAtomIds)
  - localStorage persistence for resume capability
  - Auto-advances after content/quiz completion
  - Uses real lesson data from COURSE_1_MODULE_1
  - Progress bar in header shows completion status
- Build passes, commit: a4e7b8e
- Remaining: Video interrupts, navigation cleanup

### 2026-01-10 (Morning)
- Executed 4.1-02-PLAN.md: Gemini Skill Extraction
- Created skillMapGenerator.ts with AI-powered skill extraction
- Built prerequisite generator and validation (cycle detection)
- Tested successfully: 4 skills extracted from course-1
- Ready for 4.1-03-PLAN.md (Firestore Storage & Sequencer Update)

### 2026-01-09
- Executed 4.1-01-PLAN.md: Types & Course Parser
- Created DynamicSkillMap interface with versioning and AI metadata
- Built course parser extracting content from mockData
- Fixed: Added 'project' atom type to match existing AtomType
- Ready for 4.1-02-PLAN.md (Gemini Skill Extraction)

### 2026-01-08
- Verified Session 3 implementation complete (all 9 tasks)
- Build passes with no TypeScript errors
- User tested adaptive flow - saw "No learning items available"
- Root cause: skill map mismatch between AI at Work and Social Media Marketing
- Decision: Build AI-powered skill map generator (Phase 4.1)

---

## Session Continuity

Last session: 2026-01-11
Stopped at: Completed Phase 13 (Adaptive Interleaving), ready for Phase 14 (Mastery Map UX)
Resume file: None

---

*Last updated: 2026-01-11*
