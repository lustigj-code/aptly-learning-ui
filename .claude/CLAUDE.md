# Aptly Learning

AI-powered certification platform solving the "90% don't complete" problem through adaptive tutoring, mastery tracking, and gamification.

## Quick Context
- **Stack**: Next.js 16 + TypeScript + Firebase + Gemini AI + Tailwind
- **Core Systems**: BKT mastery tracking, FSRS spaced repetition, Sage AI coach
- **Docs**: `/ARCHITECTURE.md` (system design), `.claude/RESEARCH_HANDOFF.md` (research)

## Working Rules
1. Read code before answering - never speculate
2. Check in before major changes
3. Keep changes minimal and simple
4. Log completed work to `.claude/HISTORY.md`

## Key Patterns

| What | Where |
|------|-------|
| State | `src/store/unifiedStore.ts` (Zustand + Firebase sync) |
| UI Components | `src/components/ui/` (Shadcn + Tailwind) |
| Learning Flow | `src/components/learning/CoachLearningView.tsx` |
| AI Coach | `src/lib/ai/coachPrompts.ts`, `geminiClient.ts` |
| Mastery | `src/lib/mastery/bkt.ts`, `fsrs.ts` |
| API Routes | `src/app/api/` |

## Critical Paths
```
Learning:  app/learn/[lessonId] -> CoachLearningView -> ContentRenderer -> Mastery Update
AI Coach:  ChatOverlay -> /api/chat -> geminiClient -> LearningInsights
Mastery:   Quiz answer -> bkt.ts update -> fsrs.ts scheduling -> Firestore sync
```

## Commands
```bash
npm run dev       # Development server
npm run build     # Production build (required before stopping)
npm run test      # Vitest unit tests
npm run test:e2e  # Playwright E2E
npm run lint      # ESLint
```

## Current Focus
Production readiness: 12/24 tasks complete. Phases 1-3 done (stability, observability, security). Next: Phase 4 (content), Phase 5 (UX polish).

See `.claude/production-checklist.json` for details.

## Research
Active NotebookLM notebook with 166 docs on adaptive learning, knowledge tracing, gamification.
Use `/learning-platform` skill or see `.claude/RESEARCH_HANDOFF.md`.

## Hooks (Automatic)
- **SessionStart**: Shows production progress
- **PreToolUse**: Blocks edits to .env, firebase keys
- **PostToolUse**: Auto-lints TypeScript/JS files
- **Stop**: Quality gate (build + lint must pass)
