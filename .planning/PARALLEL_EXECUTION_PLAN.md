# Aptly Learning: Parallel Agent Execution Plan

## Executive Summary

Transform Aptly from implemented-but-disconnected features into a unified adaptive learning system where ML drives all decisions. This plan maximizes parallelism by identifying independent workstreams that can execute simultaneously.

---

## Dependency Analysis

### Key Insight: Most features EXIST but aren't WIRED

From codebase exploration:
- **COMPLETE**: FSRS, BKT, Hybrid ML model, Session builder, Interleaving algorithm, Socratic coach, RAG system, Notifications (FCM), Offline mode, Mastery map
- **NEEDS WIRING**: These components need to be connected to the learning flow
- **MISSING**: Training data pipeline, content-agnostic architecture

### Dependency Graph

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     WAVE 1 (All Parallel)                    │
                    │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
                    │  │ Training  │ │ Notifica- │ │  Offline  │ │ Interleav │   │
                    │  │ Data      │ │ tions     │ │  Mode     │ │ Activation│   │
                    │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘   │
                    │        │             │             │             │         │
                    │  ┌─────┴─────┐ ┌─────┴─────┐                               │
                    │  │ RAG Auto  │ │ Content   │                               │
                    │  │ Indexing  │ │ Agnostic  │                               │
                    │  └───────────┘ └───────────┘                               │
                    └─────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     WAVE 2 (All Parallel)                    │
                    │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
                    │  │ ML Full   │ │ Struggle  │ │ Adaptive  │ │ Smart     │   │
                    │  │ Integrat. │ │ Detection │ │ Difficulty│ │ Review    │   │
                    │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘   │
                    │        │             │             │             │         │
                    │  ┌─────┴─────┐ ┌─────┴─────┐                               │
                    │  │ Optimal   │ │ Path      │                               │
                    │  │ Timing    │ │ Optimizer │                               │
                    │  └───────────┘ └───────────┘                               │
                    └─────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     WAVE 3 (All Parallel)                    │
                    │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
                    │  │ Dashboard │ │ Learn     │ │ Review    │ │ Progress  │   │
                    │  │ ML UI     │ │ Page ML   │ │ Page      │ │ Visual    │   │
                    │  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
                    └─────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     WAVE 4 (Sequential)                      │
                    │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
                    │  │ Testing   │ │ Perf Opt  │ │ Monitoring│ │ Docs      │   │
                    │  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
                    └─────────────────────────────────────────────────────────────┘
```

---

## WAVE 1: Infrastructure Wiring (6 Parallel Agents)

All Wave 1 agents are **fully independent** and can run simultaneously.

### Agent 1-1: Training Data Pipeline
**Territory**: `src/lib/ml/training/`
**No dependencies on other agents**

```
Files to CREATE:
- src/lib/ml/training/ednetLoader.ts
- src/lib/ml/training/dataTransformer.ts
- src/lib/ml/training/parameterEstimator.ts
- src/app/api/ml/train/route.ts

Files to READ first:
- src/lib/mastery/fsrs.ts (FSRS parameters)
- src/lib/mastery/bkt.ts (BKT parameters)
- src/lib/ml/hybridModel.ts (model structure)
```

### Agent 1-2: Notification Wiring
**Territory**: `src/lib/notifications/`, event triggers
**No dependencies on other agents**

```
Files to MODIFY:
- src/lib/analytics/eventTracker.ts (add triggers)
- src/app/api/review/due/route.ts (wire notification check)
- src/hooks/useStreak.ts (streak at risk trigger)

Files to READ first:
- src/lib/notifications/fcm.ts
- src/lib/notifications/notificationService.ts
```

### Agent 1-3: Offline Mode Completion
**Territory**: `src/lib/pwa/`, learning components
**No dependencies on other agents**

```
Files to MODIFY:
- src/components/learning/CoachLearningView.tsx (wrap API calls)
- src/hooks/usePWA.ts (export useOfflineSync hook)

Files to READ first:
- src/lib/pwa/offline.ts (queueProgress, syncQueuedProgress)
```

### Agent 1-4: Interleaving Activation
**Territory**: `src/lib/adaptive/`, session API
**No dependencies on other agents**

```
Files to MODIFY:
- src/app/api/adaptive/session/route.ts (use buildSessionWithInterleaving)
- src/components/learning/SessionQueueDisplay.tsx (show Review Break)

Files to READ first:
- src/lib/adaptive/interleavingAlgorithm.ts
- src/lib/adaptive/sessionBuilder.ts
```

### Agent 1-5: RAG Auto-Indexing
**Territory**: `src/lib/rag/`, admin endpoints
**No dependencies on other agents**

```
Files to CREATE:
- src/lib/rag/autoIndexer.ts

Files to MODIFY:
- Course/lesson/atom creation API routes (call indexer after create)

Files to READ first:
- src/lib/rag/pedagogicalChunker.ts
- src/lib/rag/vectorStore.ts
```

### Agent 1-6: Content-Agnostic Architecture
**Territory**: `src/lib/content/`, types
**No dependencies on other agents**

```
Files to CREATE:
- src/lib/content/domainConfig.ts

Files to MODIFY:
- src/lib/content/courseRegistry.ts
- src/app/onboarding/page.tsx
- src/types/curriculum.ts

Files to READ first:
- src/lib/content/courseRegistry.ts
- src/types/curriculum.ts
```

---

## WAVE 2: Intelligence Layer (6 Parallel Agents)

Depends on: Wave 1 complete (for full infrastructure)
All Wave 2 agents are **independent of each other**.

### Agent 2-1: ML Model Full Integration
**Territory**: `src/lib/ml/`, mastery predictions
**Depends on**: 1-1 (Training Data) for parameters

```
Files to MODIFY:
- src/app/api/skills/ready/route.ts (use hybrid model)
- src/app/api/mastery/map/route.ts (use hybrid model)
- src/components/dashboard/ExamReadinessWidget.tsx (show confidence)
- src/app/api/review/due/route.ts (enhance with ML)

Files to READ first:
- src/lib/ml/hybridModel.ts
- src/lib/ml/modelSwitching.ts
```

### Agent 2-2: Proactive Coach - Struggle Detection
**Territory**: `src/lib/coach/`, struggle signals
**Depends on**: None in Wave 2

```
Files to CREATE:
- src/lib/coach/struggleDetector.ts

Files to MODIFY:
- src/components/coach/ProactivePrompt.tsx
- src/components/learning/CoachLearningView.tsx

Files to READ first:
- src/hooks/useProactiveCoach.ts
- src/components/coach/ProactivePrompt.tsx
```

### Agent 2-3: Proactive Coach - Optimal Timing
**Territory**: `src/lib/coach/`, timing
**Depends on**: None in Wave 2

```
Files to CREATE:
- src/lib/coach/optimalTiming.ts

Files to MODIFY:
- src/components/learning/CoachLearningView.tsx

Files to READ first:
- src/lib/adaptive/sessionBuilder.ts
```

### Agent 2-4: Adaptive Difficulty System
**Territory**: `src/lib/adaptive/difficulty/`
**Depends on**: 2-1 (ML Integration) for predictions

```
Files to CREATE:
- src/lib/adaptive/difficulty/difficultySelector.ts

Files to MODIFY:
- src/components/learning/quiz/QuizAtom.tsx

Files to READ first:
- src/lib/ml/hybridModel.ts
```

### Agent 2-5: Smart Review Scheduling
**Territory**: `src/lib/mastery/`, review optimization
**Depends on**: 2-1 (ML Integration) for predictions

```
Files to MODIFY:
- src/lib/mastery/fsrs.ts (enhance with ML)
- src/lib/adaptive/reviewDueQuery.ts
- src/app/api/review/due/route.ts

Files to READ first:
- src/lib/mastery/fsrs.ts
```

### Agent 2-6: Learning Path Optimization
**Territory**: `src/lib/adaptive/`, path planning
**Depends on**: None in Wave 2

```
Files to CREATE:
- src/lib/adaptive/pathOptimizer.ts

Files to MODIFY:
- src/lib/adaptive/sequencer.ts
- src/lib/mastery/prerequisites.ts

Files to READ first:
- src/lib/adaptive/sequencer.ts
```

---

## WAVE 3: Experience Integration (4 Parallel Agents)

Depends on: Wave 2 complete
All Wave 3 agents are **independent of each other**.

### Agent 3-1: Unified Learning Dashboard
**Territory**: `src/app/dashboard/`, widgets

```
Files to MODIFY:
- src/app/dashboard/page.tsx
- src/components/dashboard/*Widget.tsx

Files to CREATE:
- src/components/dashboard/AIInsightsWidget.tsx
```

### Agent 3-2: Intelligent Learn Page
**Territory**: `src/app/learn/`, learning components

```
Files to MODIFY:
- src/app/learn/page.tsx
- src/components/learning/CoachLearningView.tsx
```

### Agent 3-3: Enhanced Review Experience
**Territory**: `src/app/review/`, review components

```
Files to MODIFY:
- src/app/review/page.tsx
- src/components/mastery/ReviewQueue.tsx
```

### Agent 3-4: Progress & Mastery Visualization
**Territory**: `src/app/progress/`, mastery pages

```
Files to MODIFY:
- src/app/progress/page.tsx
- src/app/mastery/page.tsx
- src/components/mastery/EnhancedMasteryMap.tsx
```

---

## WAVE 4: Validation & Polish (Sequential)

Depends on: Wave 3 complete
These run sequentially to ensure quality.

### Agent 4-1: Integration Testing
### Agent 4-2: Performance Optimization
### Agent 4-3: Monitoring & Observability
### Agent 4-4: Documentation & Architecture

---

## Execution Strategy

### Option A: Run ALL Wave 1 Agents in Parallel (Recommended)

```bash
# Single command launches 6 agents simultaneously
parallel-agents --wave 1 --agents all

# Each agent runs in isolated worktree
# Merges automatically when complete
```

**Estimated time**: 15-20 minutes (vs 90 minutes sequential)

### Option B: Run Waves Sequentially with Parallel Agents Per Wave

```
Wave 1: Launch 6 agents → Wait for all → Merge
Wave 2: Launch 6 agents → Wait for all → Merge
Wave 3: Launch 4 agents → Wait for all → Merge
Wave 4: Run sequentially (testing needs final codebase)
```

**Estimated time**: 45-60 minutes total

### Option C: Maximum Parallelism (Advanced)

Since Wave 1 agents are fully independent, and many Wave 2 agents only depend on specific Wave 1 outputs:

```
T+0:   Start all Wave 1 agents
T+15:  Start Wave 2 agents 2-2, 2-3, 2-6 (no dependencies)
T+20:  Start Wave 2 agents 2-1, 2-4, 2-5 (after 1-1 completes)
T+35:  Start all Wave 3 agents
T+50:  Start Wave 4 sequentially
```

**Estimated time**: 35-45 minutes total

---

## Verification Checkpoints

### After Wave 1
```bash
npm run build  # Must pass
npm run lint   # Must pass
# Manual: Check notifications fire, offline queues work
```

### After Wave 2
```bash
npm run build
# Manual: Start session → Verify ML confidence shows
# Manual: Answer 3 wrong → Verify coach surfaces
```

### After Wave 3
```bash
npm run build
# Manual: Full learning session with ML insights visible
# Manual: Dashboard shows AI recommendations
```

### After Wave 4
```bash
npm run build
npm run test   # All tests pass
# Performance: <100ms prediction times
# Monitoring: Alerts configured
```

---

## Agent Prompt Templates

Each agent will receive a self-contained prompt with:
1. Specific files to read first
2. Exact changes to make
3. Verification steps
4. No overlap with other agents

See: `.planning/agent-prompts/` for full prompts

---

## Risk Mitigation

1. **Merge conflicts**: Each agent has exclusive file ownership
2. **Build failures**: Verify build after each wave
3. **Feature regressions**: Integration tests in Wave 4
4. **Performance issues**: Performance optimization in Wave 4

---

## Success Criteria

After all waves complete:

1. **ML drives ALL recommendations** (not just logging)
2. **Coach surfaces proactively** on struggle patterns
3. **Notifications trigger** on optimal learning moments
4. **Offline mode works** with sync on reconnect
5. **Interleaving active** with visual indicators
6. **RAG auto-indexes** on content changes
7. **Works across any certification domain**
8. **< 100ms prediction latency**
9. **All tests pass**
10. **Documentation complete**
