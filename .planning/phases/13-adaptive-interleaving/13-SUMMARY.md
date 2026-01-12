# Phase 13 Summary: Adaptive Interleaving

**Status:** COMPLETE
**Date:** 2026-01-11
**Commits:**
- `3b29c88` feat(13-01): Add adaptive interleaving algorithm
- `652772b` feat(13-02): Wire FSRS interleaving to session API + UI badge

---

## Research Foundation

Based on NotebookLM research (cognitive science):
- **50% improvement** in discrimination ability with interleaving
- **Block** instruction for initial encoding (keep sequential)
- **Interleave** practice with reviews (high-similarity categories)
- **FSRS injection** when Retrievability < 90%
- **Adaptive ratio** based on backlog (large backlog = more reviews)

---

## What Was Built

### Phase 13.1: Interleaving Algorithm

**Modified:** `src/lib/mastery/fsrs.ts`
- Exported `calculateRetrievability()` function
- Added `ConceptMasteryWithRetrievability` type
- Added `getItemsBelowRetrievability()` - Get items with R < threshold
- Added `getReviewBacklogSize()` - Count items needing review

**New Directory:** `src/lib/sequencing/`

**Files Created:**

1. **`interleaver.ts`** - Core interleaving algorithm
   - `InterleavedItem` type with isReviewChallenge flag
   - `InterleavingConfig` type with thresholds
   - `getReviewItemsForInterleaving()` - FSRS + semantic similarity
   - `calculateAdaptiveRatio()` - Backlog-based new:review ratio
   - `interleaveItems()` - "Sandwich" pattern interleaving
   - `calculateSkillSimilarity()` - Structural proximity scoring
   - `shouldApplyInterleaving()` - Check if interleaving needed

2. **`index.ts`** - Module exports

---

### Phase 13.2: Dynamic Queue Assembly + UI

**Modified:** `src/app/api/adaptive/session/route.ts`
- Added imports from `@/lib/sequencing`
- Added `isReviewChallenge` and `metadata` to SessionItem
- Added `interleaveItemsWithFSRS()` async function
- Renamed old function to `interleaveItemsSimple()`
- Session now uses FSRS-based interleaving with fallback

**New Component:** `src/components/learning/ReviewChallengeBadge.tsx`
- Purple badge with refresh icon
- Animated entrance with Framer Motion
- Supports sm/md sizes
- Optional tooltip

---

## Interleaving Algorithm

```
User starts learning session
        │
        ▼
Fetch FSRS mastery data
        │
        ▼
┌───────────────────────────────┐
│ getItemsBelowRetrievability() │
│   R < 90% → urgent items      │
└─────────────┬─────────────────┘
              │
              ▼
┌───────────────────────────────┐
│ calculateSkillSimilarity()    │
│   Same lesson: 0.9            │
│   Same module: 0.7            │
│   Prerequisites: 0.6          │
│   Different: 0.3              │
└─────────────┬─────────────────┘
              │
              ▼
┌───────────────────────────────┐
│ Score: urgency*0.6 + sim*0.4  │
│ Select top N review items     │
└─────────────┬─────────────────┘
              │
              ▼
┌───────────────────────────────┐
│ calculateAdaptiveRatio()      │
│   Backlog ≤3: 3:1 (new:rev)   │
│   Backlog ≥10: 1:1            │
│   Between: interpolate        │
└─────────────┬─────────────────┘
              │
              ▼
┌───────────────────────────────┐
│ interleaveItems()             │
│   New → New → Review → New    │
│   (Sandwich pattern)          │
└─────────────┬─────────────────┘
              │
              ▼
Return session with isReviewChallenge flags
```

---

## Configuration

```typescript
DEFAULT_INTERLEAVING_CONFIG = {
  retrievabilityThreshold: 0.90,  // Inject when R < 90%
  maxReviewItems: 5,              // Max reviews per session
  minNewToReviewRatio: 2,         // Default 2:1
  adaptiveRatio: true,            // Adjust based on backlog
  semanticFiltering: true,        // Filter by similarity
}
```

---

## Adaptive Ratio

| Backlog Size | New:Review Ratio |
|--------------|------------------|
| ≤ 3 items | 3:1 (favor new) |
| 4-9 items | Linear interpolation |
| ≥ 10 items | 1:1 (balance) |

---

## Testing

1. Create test user with existing FSRS data
2. Ensure some concepts have R < 90%
3. Call session API:
   ```
   POST /api/adaptive/session
   { userId, courseId, availableMinutes: 30, preferences: {...} }
   ```
4. Verify response includes items with `isReviewChallenge: true`
5. Verify ratio adjusts based on backlog size

---

## Success Criteria

- [x] `calculateRetrievability` exported from fsrs.ts
- [x] `getItemsBelowRetrievability` function created
- [x] Interleaver module with semantic similarity
- [x] Adaptive ratio based on backlog
- [x] Session API uses FSRS interleaving
- [x] ReviewChallengeBadge component created
- [x] Build passes

---

## What's Next

- **Phase 14:** Mastery Map UX (visual skill prerequisite graph)
- **Phase 15:** Hybrid Learner Model (DKT2 + BKT)

---

## Notes

- Badge display in CoachLearningView requires session-based flow integration
- Current learning view iterates atoms directly; session API is separate
- Fallback to simple interleaving on any FSRS fetch errors
- Semantic similarity uses structural proximity (lesson/module/prereqs)

---

*Phase 13 Complete - 2026-01-11*
