# Aptly Learning - Claude Instructions

> AI-powered learning platform. Next.js 16, TypeScript, Tailwind 4, Framer Motion, Firebase, Zustand.

---

## ALWAYS (Every Response)

1. **Read before responding.** Never claim anything about code without opening the file first.

2. **Minimal changes only.** Impact as little code as possible. No over-engineering.

3. **No speculation.** If unsure, investigate. Don't guess.

4. **Check in before major changes.** Ask before: architectural changes, deleting files, new dependencies, config changes.

5. **Never repeat failing commands.** After 2-3 failed attempts, STOP and explain what you tried.

---

## USUALLY (Most Tasks)

6. **Use existing patterns.** Match the style already in the file you're editing.

7. **Use design tokens.** Colors from `@/lib/design-tokens`, springs from `@/lib/motion/springs`.

8. **Prefer Edit over Write.** Read files first. Use Grep/Glob for searching.

9. **Run build after changes.** `npm run build` must pass before finishing.

10. **Log to HISTORY.md.** After completing tasks, append what you changed.

---

## WHEN NEEDED (Specific Work)

### For UI/Component Work
- Consult `.claude/PRD.md` for animation specs, glassmorphism, layout patterns
- Use Framer Motion with `SPRING.card` (320/32/1) for premium feel
- Respect `useReducedMotion` for accessibility
- Glassmorphic: `backdrop-blur-xl bg-white/75 border border-white/15`

### For Learning Logic (BKT/FSRS)
- BKT: probability 0-1, mastery threshold 0.95
- FSRS: ratings 1-4, retention target 0.90
- Calculations run in Web Worker (`masteryWorker.ts`)

### For AI Coach Work
- Never give direct answers to quiz questions
- Use Socratic questioning with scaffolded hints
- Struggle detection triggers at confidence > 0.6

---

## Project Structure (Quick Reference)

```
src/
├── app/           # Next.js App Router, API routes
├── components/    # ui/, learning/, coach/, gamification/
├── hooks/         # useAuth, useCoach, useCognitiveLoad, etc.
├── store/         # Zustand stores (auth, userProfile, ui)
├── lib/           # design-tokens, motion/springs, mastery/bkt, firebase/
└── workers/       # masteryWorker.ts (off main thread)
```

---

## Key Files

| Need | File |
|------|------|
| Colors, z-index | `src/lib/design-tokens.ts` |
| Animation springs | `src/lib/motion/springs.ts` |
| BKT algorithm | `src/lib/mastery/bkt.ts` |
| FSRS algorithm | `src/lib/mastery/fsrs.ts` |
| Firebase config | `src/lib/firebase/config.ts` |
| Main learning view | `src/components/learning/CoachLearningView.tsx` |
| AI coach chat | `src/components/coach/MainCoachChat.tsx` |

---

## Commands

```bash
npm run dev      # Development (localhost:3000)
npm run build    # Production build (REQUIRED)
npm run lint     # ESLint check
npm run test     # Vitest unit tests
```

---

## Reference Files

| File | When to Consult |
|------|-----------------|
| `.claude/PRD.md` | Building new UI components, animation work |
| `.claude/REFERENCE.md` | Schema details, API specs, full tech stack |
| `.claude/HISTORY.md` | See recent changes |

---

## Don't

- Don't add features beyond what was asked
- Don't over-engineer with abstractions for one-time operations
- Don't use emojis (use Lucide icons)
- Don't use generic fonts (Inter, Roboto, Arial)
- Don't give direct answers to quiz questions (Socratic only)
- Don't commit secrets or API keys

---

**Version:** 4.0 (Lean Edition)
**Last Updated:** 2026-01-19
