# Aptly Learning - Architectural Decisions Log

> **Last Updated:** 2026-01-15 19:38 UTC

This document records key architectural decisions, the reasoning behind them, and their implications for future development.

---

## Decision Index

| ID | Decision | Status | Date |
|----|----------|--------|------|
| [ADR-001](#adr-001-dual-pathway-ml-model) | Dual-Pathway ML Model | Implemented | Phase 15 |
| [ADR-002](#adr-002-three-tier-intervention-hierarchy) | Three-Tier Intervention Hierarchy | Implemented | Phase 12 |
| [ADR-003](#adr-003-fsrs-for-spaced-repetition) | FSRS for Spaced Repetition | Implemented | Phase 8 |
| [ADR-004](#adr-004-pedagogical-rag-chunking) | Pedagogical RAG Chunking | Implemented | Phase 12.5 |
| [ADR-005](#adr-005-firestore-as-primary-database) | Firestore as Primary Database | Implemented | Initial |
| [ADR-006](#adr-006-zustand-over-redux) | Zustand over Redux | Implemented | Refactor |
| [ADR-007](#adr-007-focused-store-architecture) | Focused Store Architecture | Implemented | Refactor |
| [ADR-008](#adr-008-unified-error-handling) | Unified Error Handling | Implemented | Refactor |
| [ADR-009](#adr-009-lru-cache-for-performance) | LRU Cache for Performance | Implemented | Phase 5 |
| [ADR-010](#adr-010-intervention-state-persistence) | Intervention State Persistence | Implemented | Refactor |

---

## ADR-001: Dual-Pathway ML Model

### Context
We needed a mastery prediction system that works well for both new users (cold start) and experienced users with interaction history.

### Decision
Implement a hybrid model combining:
1. **Transformer Pathway** - Captures sequential interaction patterns
2. **BKT Pathway** - Handles prerequisite relationships and skill states
3. **Cross-Attention Fusion** - Learns optimal weighting between pathways

### Rationale
- **Transformers** excel at: Sequential patterns, temporal dependencies
- **BKT** excels at: Prerequisite relationships, interpretable skill states
- **Combined**: Best of both worlds with cross-attention fusion

### Cold-Start Strategy
```
< 20 interactions  → BKT only (stable, interpretable)
20-50 interactions → Blended (weight increases linearly)
> 50 interactions  → Full hybrid (transformer contributes fully)
```

### Implications
- Need to collect interaction data for training
- Must maintain both pathways in inference
- Fallback to BKT if hybrid fails

### Code Location
- `/src/lib/ml/hybridModel.ts`
- `/src/lib/ml/transformerPathway.ts`
- `/src/lib/ml/crossAttention.ts`

---

## ADR-002: Three-Tier Intervention Hierarchy

### Context
Research shows that immediate direct explanations lead to learned helplessness. Students learn better when they discover answers themselves with appropriate scaffolding.

### Decision
Implement escalating intervention tiers:

| Tier | Name | Approach | When |
|------|------|----------|------|
| 1 | Socratic Questions | Guide student to find answer | First struggle |
| 2 | Scaffolding | Worked examples, broken steps | Continued struggle |
| 3 | Direct Explanation | Full answer provided | All else fails |

### Rationale
- **Educational research**: Productive struggle improves retention
- **Cognitive load theory**: Gradual scaffolding prevents overload
- **Self-determination theory**: Student agency improves motivation

### State Tracking
```typescript
// Stored in Firestore, NOT in-memory
interventionStates/{uid}_{skillId}
├── currentTier (1-3)
├── escalationHistory[]
└── lastEscalated
```

### Escalation Criteria
- 3+ consecutive wrong answers on same skill
- Student explicitly requests more help
- Time-on-task exceeds 2x expected

### Code Location
- `/src/lib/coach/interventionStateManager.ts`
- `/src/lib/coach/socraticHandler.ts`
- `/src/lib/rag/interventionManager.ts`

---

## ADR-003: FSRS for Spaced Repetition

### Context
Traditional SRS algorithms (SM-2, Anki) use fixed schedules. We needed an adaptive algorithm that accounts for individual learning patterns.

### Decision
Implement FSRS (Free Spaced Repetition Scheduler) - a 17-weight neural-optimized algorithm.

### Rationale
- **Adaptive**: Adjusts to individual forgetting curves
- **Research-backed**: Developed from large-scale data analysis
- **Performant**: Single forward pass for scheduling

### Key Concepts
```typescript
interface FSRSState {
  stability: number;    // Days until 90% retention
  difficulty: number;   // Item difficulty (0-1)
  state: 'new' | 'learning' | 'review' | 'relearning';
}
```

### Enhancements
- **Exam Mode**: Front-loads reviews before exam date
- **Workload Flattening**: Spreads reviews after absences
- **Cold-Start Intervals**: Shorter initial intervals for new concepts

### Code Location
- `/src/lib/mastery/fsrs.ts`
- `/src/lib/adaptive/reviewDueQuery.ts`

---

## ADR-004: Pedagogical RAG Chunking

### Context
Generic semantic chunking misses learning-specific nuances. We needed chunks that align with how students learn and struggle.

### Decision
Implement pedagogical chunking strategy:

| Chunk Type | Content | Use Case |
|------------|---------|----------|
| Misconception | Per distractor | Student selects wrong answer |
| Hint | Per tier (1-3) | Progressive scaffolding |
| Content | Explanations | General understanding |
| Example | Worked solutions | Showing process |

### Rationale
- **Precision**: Retrieve exactly what's needed for the error
- **Grounding**: Coach responses cite specific chunks
- **Tiered**: Different chunks for different intervention levels

### Implementation
```typescript
// Chunking strategy
async function chunkContent(lesson: Lesson) {
  const chunks = [];

  // Misconception chunks - one per quiz distractor
  for (const quiz of lesson.quizzes) {
    for (const distractor of quiz.distractors) {
      chunks.push({
        type: 'misconception',
        content: distractor.explanation,
        metadata: { questionId: quiz.id, distractorId: distractor.id }
      });
    }
  }

  // Hint chunks - tiered
  for (const concept of lesson.concepts) {
    chunks.push({ type: 'hint_tier1', ... });
    chunks.push({ type: 'hint_tier2', ... });
    chunks.push({ type: 'hint_tier3', ... });
  }

  return chunks;
}
```

### Code Location
- `/src/lib/rag/pedagogicalChunker.ts`
- `/src/lib/rag/pedagogicalRetriever.ts`

---

## ADR-005: Firestore as Primary Database

### Context
We needed a database that supports real-time sync, offline-first capability, and scales without operational overhead.

### Decision
Use Firebase Firestore as the primary database.

### Rationale
- **Real-time**: Built-in listener support for live updates
- **Offline**: SDK handles offline queue and sync
- **Scaling**: Automatic horizontal scaling
- **Security**: Rule-based security at document level

### Collection Structure
```
users/{uid}
├── profile, progress, preferences, streak, badges

skillStates/{uid}_{skillId}
├── BKT parameters per skill

reviewQueue/{uid}_{conceptId}
├── FSRS scheduling data

interactions/{interactionId}
├── ML training data

courses/{courseId}/modules/lessons/atoms
├── Content hierarchy
```

### Implications
- Denormalize for read performance
- Use batch writes for related updates
- Cache static data (courses) aggressively

### Code Location
- `/src/lib/firebase/firestore.ts`
- `/src/lib/data/userProgressLayer.ts`

---

## ADR-006: Zustand over Redux

### Context
Redux requires significant boilerplate and has a steep learning curve. We needed simpler state management.

### Decision
Use Zustand for client-side state management.

### Rationale
- **Simplicity**: Minimal boilerplate, hooks-based API
- **Performance**: Fine-grained subscriptions
- **DevEx**: Easy to understand and debug
- **Size**: ~2KB vs Redux's larger footprint

### Pattern
```typescript
// Zustand store pattern
const useStore = create<State>()((set, get) => ({
  value: initialValue,
  setValue: (newValue) => set({ value: newValue }),
  asyncAction: async () => {
    const result = await api.call();
    set({ value: result });
  },
}));
```

### Code Location
- `/src/store/*.ts`

---

## ADR-007: Focused Store Architecture

### Context
The original `unifiedStore.ts` had 44+ actions and became difficult to maintain and reason about.

### Decision
Split into focused, single-responsibility stores:

| Store | Responsibility |
|-------|----------------|
| `authStore` | Firebase authentication |
| `userProfileStore` | User data, progress, sync |
| `uiStore` | UI state (sidebar, theme) |
| `syncStore` | Offline sync status |
| `celebrationStore` | Celebration queue |

### Rationale
- **Single Responsibility**: Each store has one job
- **Testability**: Easier to test in isolation
- **Code Splitting**: Could lazy-load stores
- **Debugging**: Clearer which store owns what

### Migration Strategy
- Keep `unifiedStore.ts` for backwards compatibility
- Mark as `@deprecated`
- Gradually migrate components to focused stores

### Code Location
- `/src/store/authStore.ts`
- `/src/store/userProfileStore.ts`
- `/src/store/uiStore.ts`
- `/src/store/syncStore.ts`

---

## ADR-008: Unified Error Handling

### Context
60+ try-catch patterns across services with inconsistent error formatting and logging.

### Decision
Create unified error handling utility:

```typescript
// Pattern: withErrorHandling
export async function withErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${operation}] Error:`, error);
    throw wrapServiceError(operation, error);
  }
}

// Usage
return withErrorHandling('get user data', async () => {
  const user = await fetchUser(uid);
  return user;
});
```

### Rationale
- **Consistency**: All errors formatted the same way
- **Logging**: Automatic logging with operation context
- **DRY**: Eliminates 60+ duplicate patterns

### Error Structure
```typescript
interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}
```

### Code Location
- `/src/lib/errors/handlers.ts`

---

## ADR-009: LRU Cache for Performance

### Context
Firestore reads for course metadata were causing N+1 query patterns. Some in-memory caches were growing unbounded.

### Decision
Implement LRU (Least Recently Used) cache with:
- TTL (Time To Live) for automatic expiration
- Max size limit to prevent memory issues
- Typed interface for type safety

### Implementation
```typescript
const courseCache = new LRUCache<string, Course>({
  maxSize: 100,
  ttlMs: 5 * 60 * 1000, // 5 minutes
});
```

### Rationale
- **Performance**: O(1) cache hits for common reads
- **Memory bounded**: Won't grow indefinitely
- **Fresh data**: TTL ensures stale data expires

### Code Location
- `/src/lib/cache/LRUCache.ts`

---

## ADR-010: Intervention State Persistence

### Context
**CRITICAL BUG**: Intervention state was stored in an in-memory `Map<>`, causing state loss on every server restart.

### Decision
Move intervention state to Firestore with dedicated collection.

### Before (Broken)
```typescript
// BAD: Lost on server restart
const interventionCache = new Map<string, InterventionState>();
```

### After (Fixed)
```typescript
// GOOD: Persisted to Firestore
const ref = adminDb.collection('interventionStates').doc(`${uid}_${skillId}`);
await ref.set(state);
```

### Rationale
- **Persistence**: State survives restarts
- **Multi-instance**: Works across server instances
- **User experience**: No lost progress in pedagogy

### Code Location
- `/src/lib/coach/interventionStateManager.ts`

---

## Future Decisions (Pending)

| Topic | Status | Notes |
|-------|--------|-------|
| GraphQL vs REST | Under consideration | May help with N+1 queries |
| Edge functions | Under consideration | Could reduce latency |
| Redis caching | Under consideration | For session data |
| Streaming responses | Partial | Coach uses streaming |

---

## Decision Template

```markdown
## ADR-XXX: [Title]

### Context
[What is the issue that we're seeing that is motivating this decision?]

### Decision
[What is the change that we're proposing?]

### Rationale
[Why is this the best choice among alternatives?]

### Implications
[What becomes easier or more difficult as a result?]

### Code Location
[Where is this implemented?]
```

---

*This document is auto-updated on each commit via GitHub Action.*
