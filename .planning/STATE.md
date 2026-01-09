# Aptly Learning — Project State

## Current Position

**Milestone:** v1.0 Flawless Launch
**Phase:** 4.1 of 5 (AI-Powered Dynamic Skill Map Generation)
**Plan:** 1 of 4 in current phase
**Status:** In progress
**Last activity:** 2026-01-09 - Completed 4.1-01-PLAN.md

Progress: ██████████░░░░░░░░░░ 25% (Phase 4.1)

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

### Technical Context
- Gemini API key configured in `.env.local`
- Existing skill map: `/src/data/skillMap.ts` (41 skills for AI at Work)
- Sequencer: `/src/lib/adaptive/sequencer.ts` (uses hardcoded skill map)
- Course content: `/src/data/mockData.ts` (Social Media Marketing courses)
- **NEW:** Dynamic skill map types: `/src/lib/skillmap/types.ts`
- **NEW:** Course parser: `/src/lib/skillmap/courseParser.ts`

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

Last session: 2026-01-09T05:57:38Z
Stopped at: Completed 4.1-01-PLAN.md
Resume file: None

---

*Last updated: 2026-01-09*
