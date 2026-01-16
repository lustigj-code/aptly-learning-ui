# Aptly Learning - System Architecture

> **Last Updated:** 2026-01-16 22:18 UTC
> **Codebase:** 563 files | 45114 lines of TypeScript/TSX
> **Test Coverage:** ~40%+

---

## Quick Reference

| Layer | Location | Files | Purpose |
|-------|----------|-------|---------|
| **Core Library** | `/src/lib/` | 223 | Business logic, algorithms, services |
| **Components** | `/src/components/` | 160+ | React UI components |
| **API Routes** | `/src/app/api/` | 60+ | REST API endpoints |
| **State** | `/src/store/` | 6 | Zustand state management |
| **Hooks** | `/src/hooks/` | 23 | Custom React hooks |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APTLY LEARNING                              │
│                   Adaptive Learning Platform                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │   Next.js    │   │   Zustand    │   │   Firebase/Firestore │    │
│  │   App Router │   │   Stores     │   │   + Vector DB (RAG)  │    │
│  └──────────────┘   └──────────────┘   └──────────────────────┘    │
│         │                  │                      │                 │
│         ▼                  ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CORE SYSTEMS                              │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐     │   │
│  │  │  MASTERY   │  │   COACH    │  │     ADAPTIVE       │     │   │
│  │  │  ENGINE    │  │   SYSTEM   │  │     ENGINE         │     │   │
│  │  ├────────────┤  ├────────────┤  ├────────────────────┤     │   │
│  │  │ • BKT      │  │ • Socratic │  │ • Session Builder  │     │   │
│  │  │ • FSRS     │  │ • RAG      │  │ • Difficulty       │     │   │
│  │  │ • Hybrid   │  │ • Interven │  │ • Interleaving     │     │   │
│  │  │ • K-Graph  │  │   tions    │  │ • Path Optimizer   │     │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘     │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Core Library (`/src/lib/`)

The heart of Aptly Learning - 223 TypeScript files organized by domain.

### 1.1 Mastery Engine (`/src/lib/mastery/`)

**Purpose:** Track and predict student knowledge state.

| Algorithm | File | Description |
|-----------|------|-------------|
| **BKT** | `bkt.ts` | Bayesian Knowledge Tracing - 4-parameter skill model |
| **FSRS** | `fsrs.ts` | Free Spaced Repetition Scheduler - 17-weight retention |
| **Hybrid** | `hybrid/index.ts` | ML model combining transformer + BKT pathways |
| **Knowledge Graph** | `knowledgeGraph.ts` | Prerequisite relationships between concepts |

**Key Exports:**
```typescript
// From /src/lib/mastery/
export { updateMastery, predictCorrect, isMastered } from './bkt';
export { calculateNextState, getExamModeReviews } from './fsrs';
export { routePrediction, calculateBlendWeight } from './hybridTypes';
export { getAllPrerequisites, isConceptUnlocked } from './knowledgeGraph';
```

**How They Connect:**
- BKT provides P(mastery) for each skill
- FSRS schedules when to review based on stability
- Hybrid model predicts mastery using both + neural patterns
- Knowledge Graph determines prerequisite unlocking

### 1.2 Coach System (`/src/lib/coach/`)

**Purpose:** AI-powered Socratic tutoring with three-tier intervention.

```
INTERVENTION HIERARCHY
━━━━━━━━━━━━━━━━━━━━━━
Tier 1: Socratic Questions (hint → student finds answer)
    ↓ (if struggle continues)
Tier 2: Scaffolding (worked examples, broken steps)
    ↓ (if still struggling)
Tier 3: Direct Explanation (full answer provided)
```

**Key Files:**
| File | Purpose |
|------|---------|
| `coachRouter.ts` | Model selection (Gemini/Sage/Socratic) |
| `socraticHandler.ts` | Generates Socratic responses |
| `interventionStateManager.ts` | **Firestore-backed** escalation state |
| `ragCoordinator.ts` | Unified RAG operations |
| `responseValidation.ts` | Grounding score validation |

**Critical:** `interventionStateManager.ts` persists to Firestore, not in-memory.

### 1.3 Adaptive Engine (`/src/lib/adaptive/`)

**Purpose:** Real-time learning path optimization.

| Component | File | Function |
|-----------|------|----------|
| Session Builder | `sessionBuilder.ts` | Creates personalized daily session |
| Sequencer | `sequencer.ts` | Orders questions optimally |
| Difficulty | `difficultySelector.ts` | Zone of Proximal Development targeting |
| Interleaving | `interleavingAlgorithm.ts` | Mixes topics for deeper learning |
| Struggle Detection | `struggleDetection.ts` | Identifies when student needs help |

### 1.4 RAG System (`/src/lib/rag/`)

**Purpose:** Retrieval-Augmented Generation for grounded responses.

```
RAG PIPELINE
━━━━━━━━━━━━
Content → Pedagogical Chunker → Vector Store → Retriever → Context Builder
                │
                ├── Misconception chunks (per distractor)
                ├── Hint chunks (Tier 1 → 2 → 3)
                ├── Content chunks (explanations)
                └── Example chunks (worked solutions)
```

### 1.5 Services Layer (`/src/lib/services/`)

**Purpose:** Business logic orchestration.

| Service | Purpose |
|---------|---------|
| `progressService.ts` | Atom/lesson/module/course completion |
| `userService.ts` | User profiles, preferences |
| `badgeService.ts` | Badge criteria and unlocking |
| `coachService.ts` | Coach conversation management |
| `skillService.ts` | Skill graph operations |
| `interactionLogService.ts` | ML training data collection |

### 1.6 Machine Learning (`/src/lib/ml/`)

**Purpose:** Dual-pathway neural architecture for mastery prediction.

```
HYBRID LEARNER MODEL
━━━━━━━━━━━━━━━━━━━━
           Input: Interaction sequence
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│  TRANSFORMER  │        │     BKT       │
│   PATHWAY     │        │   PATHWAY     │
├───────────────┤        ├───────────────┤
│ Sequential    │        │ Prerequisite  │
│ patterns      │        │ relationships │
│ Multi-head    │        │ Skill state   │
│ attention     │        │ tracking      │
└───────────────┘        └───────────────┘
        │                         │
        └────────────┬────────────┘
                     ▼
            ┌───────────────┐
            │ CROSS-ATTENTION│
            │    FUSION      │
            ├───────────────┤
            │ Gated fusion  │
            │ Attention wts │
            │ Cold-start    │
            │ blending      │
            └───────────────┘
                     │
                     ▼
              P(mastery)
```

**Cold Start Strategy:**
- <20 interactions: BKT only
- 20-50 interactions: Blended (weight increases with interactions)
- >50 interactions: Full hybrid model

---

## 2. Data Storage

### 2.1 Firestore Collections

```
FIRESTORE STRUCTURE
━━━━━━━━━━━━━━━━━━━
users/{uid}
├── profile (name, email, avatar)
├── progress
│   ├── completedAtoms[]
│   ├── completedLessons[]
│   ├── completedModules[]
│   ├── completedCourses[]
│   ├── xp, level
│   └── currentPosition
├── preferences (notifications, pace, theme)
├── streak (current, longest, freezes)
└── badges[]

skillStates/{uid}_{skillId}
├── pMastery (0-1)
├── pLearn, pGuess, pSlip
└── lastUpdated

reviewQueue/{uid}_{conceptId}
├── stability, difficulty (FSRS)
├── nextReviewAt
└── reviewCount

interactions/{interactionId}
├── userId, skillId, correct
├── responseTime, timestamp
└── features (for ML)

interventionStates/{uid}_{skillId}
├── currentTier (1-3)
├── escalationHistory[]
└── lastEscalated

courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/atoms/{atomId}
```

### 2.2 Caching Strategy

| Cache | Location | TTL | Purpose |
|-------|----------|-----|---------|
| Course metadata | `LRUCache` in memory | 5 min | Reduce Firestore reads |
| User progress | LocalStorage | Persisted | Offline support |
| RAG embeddings | Vector DB | Permanent | Semantic search |

---

## 3. Key Integration Points

### 3.1 Learning Flow

```
USER STARTS LEARNING SESSION
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Session Builder creates personalized session             │
│    - Fetches due reviews (FSRS)                             │
│    - Gets ready-to-learn skills (Knowledge Graph)           │
│    - Calculates difficulty (Zone of Proximal Dev)           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Content Delivered (VideoAtom / QuizAtom / PracticeAtom)  │
│    - Time tracking via useTimeTracking hook                 │
│    - Interaction logging for ML training                    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. On Quiz Answer:                                          │
│    - BKT updates skill state                                │
│    - FSRS schedules next review                             │
│    - Struggle detection checks                              │
│    - If struggling → Coach intervention triggered           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Coach Intervention (if needed):                          │
│    - RAG retrieves relevant context                         │
│    - Socratic handler generates response                    │
│    - Tier escalates if student still stuck                  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Completion:                                              │
│    - XP awarded                                             │
│    - Badge criteria checked                                 │
│    - Progress synced to Firestore                           │
│    - Celebration triggered                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Authentication Flow

```
Firebase Auth → Session Cookie → API Auth Middleware → Protected Routes
      │
      └── IDOR Protection: uid in token must match requested resource
```

### 3.3 Offline Sync

```
User offline → Actions queued in syncStore
      │
      ▼
User online → syncStore flushes to /api/progress/sync
      │
      ▼
Firestore updated → Real-time listener updates local store
```

---

## 4. Module Dependencies

```
DEPENDENCY GRAPH (simplified)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    ┌──────────────┐
                    │   CONFIG     │
                    │ constants.ts │
                    │ featureFlags │
                    └──────────────┘
                          │
                          ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   FIREBASE   │◄──│   SERVICES   │──►│    CACHE     │
│  firestore   │   │ progress     │   │   LRUCache   │
│  auth        │   │ user         │   │              │
└──────────────┘   │ badge        │   └──────────────┘
                   └──────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │   MASTERY    │ │    COACH     │ │   ADAPTIVE   │
   │ bkt, fsrs    │ │ socratic     │ │ sequencer    │
   │ hybrid       │ │ intervention │ │ difficulty   │
   └──────────────┘ └──────────────┘ └──────────────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                   ┌──────────────┐
                   │     RAG      │
                   │ retrieval    │
                   │ chunking     │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │      AI      │
                   │ providers    │
                   │ embeddings   │
                   └──────────────┘
```

---

## 5. Configuration

### 5.1 Environment Variables

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
FIREBASE_SERVICE_ACCOUNT_KEY=

# AI Providers
GOOGLE_GENERATIVE_AI_API_KEY=  # Gemini
OPENAI_API_KEY=                 # Embeddings

# Features (see /src/config/featureFlags.ts)
FEATURE_SOCRATIC=true
FEATURE_HYBRID_MODEL=true
FEATURE_RAG_GROUNDING=true

# Security
UPSTASH_REDIS_REST_URL=        # Rate limiting
UPSTASH_REDIS_REST_TOKEN=
```

### 5.2 Feature Flags

```typescript
// /src/config/featureFlags.ts
export const FEATURES = {
  SOCRATIC_MODE: process.env.FEATURE_SOCRATIC !== 'false',
  HYBRID_MODEL: process.env.FEATURE_HYBRID === 'true',
  RAG_GROUNDING: process.env.FEATURE_RAG !== 'false',
  SAGE_PERSONALITY: process.env.FEATURE_SAGE === 'true',
};
```

---

## 6. Adding New Features

### 6.1 Adding a New Skill Domain

1. **Define in Knowledge Graph:**
   ```typescript
   // /src/lib/mastery/knowledgeGraph.ts
   export const MY_DOMAIN_GRAPH = {
     concepts: [...],
     prerequisites: [...],
   };
   ```

2. **Index for RAG:**
   ```typescript
   // Call /api/admin/content/upload or use contentIndexer
   await indexCourseContent(courseId, MY_DOMAIN_GRAPH);
   ```

3. **Configure BKT Parameters:**
   ```typescript
   // /src/lib/mastery/bkt.ts
   const DOMAIN_PARAMS = { pL0: 0.3, pT: 0.09, pG: 0.25, pS: 0.1 };
   ```

### 6.2 Adding a New API Endpoint

1. Create route file in `/src/app/api/[path]/route.ts`
2. Use `withErrorHandling` from `/src/lib/errors/handlers.ts`
3. Add authentication if needed via `verifyAuth` from `/src/lib/auth/apiAuth.ts`
4. Document in `/docs/API_MAP.md`

### 6.3 Adding a New Component

1. Create in appropriate `/src/components/[domain]/` folder
2. Follow existing patterns (TypeScript, Framer Motion)
3. Use hooks from `/src/hooks/` for state
4. Add to component index if barrel exported

---

## 7. Performance Considerations

| Concern | Solution | Location |
|---------|----------|----------|
| N+1 Firestore reads | LRU cache + batch reads | `/src/lib/cache/LRUCache.ts` |
| Slow mastery predictions | Hybrid model with fallback | `/src/lib/ml/predictionFallback.ts` |
| Large bundle | Dynamic imports | `/src/components/providers/Providers.tsx` |
| Offline support | Service worker + sync queue | `/src/lib/pwa/`, `/src/store/syncStore.ts` |

---

## 8. Security Model

| Layer | Protection | Implementation |
|-------|------------|----------------|
| Authentication | Firebase Auth + Session Cookies | `/src/lib/auth/` |
| Authorization | IDOR protection on all user routes | `verifyAuth` middleware |
| Rate Limiting | Upstash Redis | `/src/lib/security/rateLimiter.ts` |
| Input Validation | Zod schemas | Per-route validation |
| CSRF | Token-based | `/src/lib/security/csrf.ts` |

---

## 9. Monitoring & Debugging

| Tool | Purpose | Setup |
|------|---------|-------|
| Sentry | Error tracking | `/src/lib/monitoring/sentry.ts` |
| PostHog | Analytics | `/src/lib/monitoring/posthog.ts` |
| Console logs | Development | `[module] prefix` pattern |

**Log Patterns:**
```typescript
console.log('[Coach] Generating response:', { userId, tier });
console.error('[BKT] Update failed:', error);
```

---

## 10. Testing Strategy

| Type | Location | Coverage |
|------|----------|----------|
| Unit | `__tests__/` alongside files | Core algorithms |
| Integration | `/src/lib/**/__tests__/` | Service layer |
| E2E | `/e2e/` (Playwright) | Critical paths |

**Run Tests:**
```bash
npm test                    # All tests
npm run test:coverage       # With coverage
npm run test:e2e           # Playwright E2E
```

---

## Quick Links

- [API Documentation](./API_MAP.md)
- [Data Flow](./DATA_FLOW.md)
- [Component Tree](./COMPONENT_TREE.md)
- [Architectural Decisions](./DECISION_LOG.md)

---

*This document is auto-updated on each commit via GitHub Action.*
