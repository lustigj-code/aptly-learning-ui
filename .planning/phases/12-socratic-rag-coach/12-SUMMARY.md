# Phase 12 Summary: Socratic RAG Coach

**Status:** COMPLETE
**Date:** 2026-01-11
**Commits:**
- `6a101ae` feat(12-01): Add RAG pedagogical chunker and retriever
- `e919e07` feat(12-02): Add LearnLM Socratic prompt architecture

---

## Research Foundation

Based on LearnLM/Google DeepMind research (40 sources via NotebookLM):
- **93.8% remediation** with Socratic tutoring vs **64.5%** with static hints
- Index "pedagogical logic" not just content
- Three-tier scaffolding model
- Low temperature for focused responses

---

## What Was Built

### Phase 12.1: RAG Pedagogical Infrastructure

**New Directory:** `src/lib/rag/`

**Files Created:**

1. **`types.ts`** - Pedagogical chunk and retrieval types
   - `ChunkType`: content | misconception | hint | example
   - `PedagogicalChunk`: Extended chunk with questionId, distractorId, studentFriendly
   - `RetrievalQuery`: Context for personalized retrieval

2. **`pedagogicalChunker.ts`** - LearnLM-style content chunking
   - `extractMisconceptionChunks()`: Creates chunk per distractor (wrong answer)
   - `extractHintChunks()`: Tiered hints (Tier 1, 2, 3)
   - `chunkAtomPedagogically()`: Full atom extraction with pedagogical metadata

3. **`pedagogicalRetriever.ts`** - Distractor-aware retrieval
   - `retrievePedagogicalContext()`: Prioritizes misconceptions
   - `retrieveMisconceptionDirect()`: Direct lookup by questionId + distractorId
   - `retrieveHintsForQuestion()`: Returns hints in tier order

4. **`contextFormatter.ts`** - RAG context for prompts
   - `formatRAGContext()`: Allocates character budget (misconceptions prioritized)
   - `formatContextForPrompt()`: Structured sections for prompt injection

5. **`contentIndexer.ts`** - Course content indexing
   - `indexCourse()`: Indexes all atoms with pedagogical metadata
   - Batch embedding with rate limiting

6. **`/api/admin/rag/index/route.ts`** - Admin API
   - POST: Trigger course indexing
   - GET: Get indexing statistics

---

### Phase 12.2: Socratic Prompt Architecture

**Files Created:**

1. **`socraticPrompts.ts`** - LearnLM-style prompts
   - `StudentContext`: name, ability, consecutiveWrong, struggleLevel, emotionalState
   - `ActivityContext`: lesson, atomType, question, studentAnswer, misconception
   - `buildSocraticSystemPrompt()`: Complete LearnLM-style system prompt with:
     - Role definition (Sage, clipped Socratic style)
     - Critical directives (NEVER give answer)
     - Student context injection
     - RAG context injection
     - Intervention hierarchy
     - Few-shot examples
   - `detectStruggleLevel()`: none | mild | moderate | severe
   - `detectEmotionalState()`: frustrated | confused | engaged | neutral
   - `getSocraticGenerationConfig()`: temperature=0.3, maxOutputTokens=200

2. **`interventionManager.ts`** - Three-tier hierarchy
   - `InterventionTier`: 1 | 2 | 3
   - `InterventionState`: currentTier, tier1Attempts, tier2Attempts, tier3Used
   - `getInterventionDirective()`: Returns tier-appropriate instructions
   - `advanceTier()`: Escalates after 2 attempts per tier
   - `isStillStruggling()`: Detects continued struggle from response

**Coach API Integration (`/api/coach/route.ts`):**
- Added `useSocraticMode` experiment check
- New `handleSocraticMode()` function:
  - Retrieves RAG context with misconception priority
  - Builds LearnLM-style system prompt
  - Injects intervention directive
  - Uses low temperature generation
  - Advances intervention tier if struggling
- Response includes `socraticMode: true` and `interventionTier`

---

## Data Flow

```
Student asks question or selects wrong answer
        │
        ▼
Check useSocraticMode experiment flag
        │
        ▼ (if enabled)
Retrieve RAG context:
  - Direct misconception lookup (if distractorId known)
  - Semantic search for related content/hints
        │
        ▼
Build Socratic system prompt:
  - Student context (ability, struggle, emotion)
  - Activity context (lesson, question)
  - RAG context (misconceptions prioritized)
        │
        ▼
Get intervention directive:
  - Tier 1: Metacognitive question
  - Tier 2: Specific hint
  - Tier 3: Worked example (different problem)
        │
        ▼
Generate with low temperature (0.3)
        │
        ▼
Check if still struggling → advance tier
        │
        ▼
Return response with interventionTier
```

---

## Intervention Hierarchy

| Tier | Name | Purpose | Max Attempts |
|------|------|---------|--------------|
| 1 | Metacognitive | "What made you think that?" | 2 |
| 2 | Specific Hint | "Look at what happens when..." | 2 |
| 3 | Worked Example | Similar problem, NOT the answer | 1 |

---

## Testing

1. Enable Socratic Mode experiment for test user:
   - Add user to `useSocraticMode` experiment in admin panel

2. Navigate to a quiz in learning flow

3. Intentionally select wrong answer

4. Verify coach:
   - Asks clarifying question (Tier 1)
   - Does NOT reveal answer
   - Uses misconception context if available

5. Continue struggling:
   - Verify escalation to Tier 2 (specific hint)
   - Then Tier 3 (worked example)

6. Check response includes:
   - `socraticMode: true`
   - `interventionTier: 1|2|3`

---

## Success Criteria

- [x] Socratic prompt template matches LearnLM structure
- [x] Intervention hierarchy enforced (3 tiers)
- [x] RAG context injected into prompts
- [x] Misconception context prioritized for wrong answers
- [x] Student ability/emotion affects prompt
- [x] Coach never gives direct answers in Socratic mode
- [x] Build passes

---

## What's Next

- **Phase 13:** Adaptive Interleaving (inject review items into learning flow)
- **Phase 14:** Mastery Map UX (visual skill prerequisite graph)
- **Phase 15:** Hybrid Learner Model (DKT2 + BKT)

---

## Notes

- Using existing Firestore vector store instead of Pinecone (already implemented)
- Misconception explanations generated from question/answer data (production should author these)
- Intervention state cached in memory (production should persist to Firestore)
- A/B test via `useSocraticMode` experiment flag

---

*Phase 12 Complete - 2026-01-11*
