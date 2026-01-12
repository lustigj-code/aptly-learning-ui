# Aptly Learning — Project State

## Current Position

**Milestone:** v1.0 Flawless Launch
**Phase:** 4.2 of 5 (Multi-Course & AI Integration)
**Plan:** 3 of 4 in current phase (4.2-03 in progress)
**Status:** Phase 4.2-01 and 4.2-02 complete, 4.2-03 partially complete
**Last activity:** 2026-01-11 - Investigating AI feature integration

Progress: ██████████████░░░░░░ 62.5% (Phase 4.2)

---

## Accumulated Context

### Key Decisions Made
- Session 3 (Adaptive Intelligence) implementation complete
- Skill map currently hardcoded for "AI at Work" course
- Need dynamic skill maps to support multi-course adaptive learning
- Using Gemini API for AI-powered features
- **[4.1-01]** Skill ID pattern: `{courseId}-{moduleNum}-{skillNum}`
- **[4.1-01]** ParsedCourseContent as standard AI input format

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

### 2026-01-11
- Completed Phase 4.1: AI-Powered Dynamic Skill Map Generation (ALL 4 PLANS)
- 4.1-03: Firestore storage, sequencer update with courseId, skill map caching
- 4.1-04: Admin interface - list/detail pages, generate/activate actions
- Started Phase 4.2: Multi-Course & AI Integration
- 4.2-01: Created courseRegistry.ts as single source of truth, updated dashboard
- 4.2-02: Redesigned ReadingAtom with 680px width, time-based progress, Key Takeaways
- 4.2-03: Investigated AI features - components exist (SocraticQuizHint, useCoach) but need integration
- Fixed auth token access using getIdToken() from firebase auth module

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
Stopped at: Completed Phase 4.1 (all 4 plans), ready for Phase 4.2
Resume file: None

---

*Last updated: 2026-01-11*
