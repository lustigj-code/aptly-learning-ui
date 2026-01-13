# Aptly Learning: Parallel Execution Guide

## Quick Start

### Option 1: Use the `parallel-agents` Skill (Recommended)

Run in Claude Code:
```
/parallel-agents
```

When prompted, specify:
- **Task**: "Execute Wave 1 of the Aptly integration plan"
- **Agent count**: 6 (one per Wave 1 task)
- **Prompts**: Point to `.planning/agent-prompts/wave1-*.md`

### Option 2: Manual Parallel Execution

Open 6 terminal windows and run in each:

```bash
# Terminal 1 - Training Data
cd "/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning"
claude --prompt "$(cat .planning/agent-prompts/wave1-agent1-training-data.md)"

# Terminal 2 - Notifications
claude --prompt "$(cat .planning/agent-prompts/wave1-agent2-notifications.md)"

# Terminal 3 - Offline Mode
claude --prompt "$(cat .planning/agent-prompts/wave1-agent3-offline-mode.md)"

# Terminal 4 - Interleaving
claude --prompt "$(cat .planning/agent-prompts/wave1-agent4-interleaving.md)"

# Terminal 5 - RAG Indexing
claude --prompt "$(cat .planning/agent-prompts/wave1-agent5-rag-indexing.md)"

# Terminal 6 - Content Agnostic
claude --prompt "$(cat .planning/agent-prompts/wave1-agent6-content-agnostic.md)"
```

---

## Full Execution Timeline

### Wave 1: Infrastructure Wiring (6 Parallel Agents)

**Duration**: ~15-20 minutes if parallel, ~90 minutes if sequential

| Agent | Task | Files | Independent |
|-------|------|-------|-------------|
| 1-1 | Training Data Pipeline | `src/lib/ml/training/*` | ✅ |
| 1-2 | Notification Wiring | `src/lib/notifications/*` | ✅ |
| 1-3 | Offline Mode | `src/lib/pwa/*`, `CoachLearningView` | ✅ |
| 1-4 | Interleaving | `src/app/api/adaptive/*` | ✅ |
| 1-5 | RAG Auto-Indexing | `src/lib/rag/*` | ✅ |
| 1-6 | Content Agnostic | `src/lib/content/*` | ✅ |

**After Wave 1**:
```bash
cd "/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning"
npm run build
npm run lint
```

### Wave 2: Intelligence Layer (6 Parallel Agents)

**Duration**: ~20-25 minutes if parallel

| Agent | Task | Depends On |
|-------|------|------------|
| 2-1 | ML Full Integration | 1-1 (Training Data) |
| 2-2 | Struggle Detection | None |
| 2-3 | Optimal Timing | None |
| 2-4 | Adaptive Difficulty | 2-1 (ML Integration) |
| 2-5 | Smart Review | 2-1 (ML Integration) |
| 2-6 | Path Optimizer | None |

**Strategy**: Start 2-2, 2-3, 2-6 immediately. Start 2-1 after 1-1 completes. Start 2-4, 2-5 after 2-1 completes.

```bash
# Start these 3 immediately (no dependencies)
claude --prompt "$(cat .planning/agent-prompts/wave2-agent2-struggle-detection.md)" &
claude --prompt "$(cat .planning/agent-prompts/wave2-agent3-optimal-timing.md)" &
claude --prompt "$(cat .planning/agent-prompts/wave2-agent6-path-optimizer.md)" &

# Wait for Wave 1-1, then start 2-1
claude --prompt "$(cat .planning/agent-prompts/wave2-agent1-ml-integration.md)"

# Wait for 2-1, then start 2-4 and 2-5
claude --prompt "$(cat .planning/agent-prompts/wave2-agent4-adaptive-difficulty.md)" &
claude --prompt "$(cat .planning/agent-prompts/wave2-agent5-smart-review.md)" &
```

**After Wave 2**:
```bash
npm run build
npm run lint
# Manual test: Start session, verify ML confidence shows
```

### Wave 3: Experience Integration (4 Parallel Agents)

**Duration**: ~15-20 minutes if parallel

| Agent | Task |
|-------|------|
| 3-1 | Dashboard ML Integration |
| 3-2 | Learn Page Intelligence |
| 3-3 | Review Page Enhancement |
| 3-4 | Progress Visualization |

All are independent - run in parallel.

**After Wave 3**:
```bash
npm run build
npm run lint
# Manual: Full learning session with ML insights visible
```

### Wave 4: Validation & Polish (Sequential)

**Duration**: ~30-40 minutes (must be sequential)

```bash
# 4-1: Integration Testing
claude --prompt "$(cat .planning/agent-prompts/wave4-validation.md)" --task "testing"

# 4-2: Performance Optimization
claude --prompt "$(cat .planning/agent-prompts/wave4-validation.md)" --task "performance"

# 4-3: Monitoring
claude --prompt "$(cat .planning/agent-prompts/wave4-validation.md)" --task "monitoring"

# 4-4: Documentation
claude --prompt "$(cat .planning/agent-prompts/wave4-validation.md)" --task "documentation"
```

---

## Using the `parallel-agents` Skill

The `parallel-agents` skill automatically:
1. Creates isolated git worktrees for each agent
2. Runs agents in parallel
3. Merges changes when all complete
4. Resolves conflicts if any

### Example Usage

```
User: /parallel-agents

Claude: I'll orchestrate parallel agents. What task should I split?

User: Execute Wave 1 of the Aptly integration plan. Use the prompts in .planning/agent-prompts/wave1-*.md

Claude: I'll create 6 agents for Wave 1:
- Agent 1: Training Data Pipeline
- Agent 2: Notification Wiring
- Agent 3: Offline Mode Completion
- Agent 4: Interleaving Activation
- Agent 5: RAG Auto-Indexing
- Agent 6: Content-Agnostic Architecture

Starting agents... [progress updates]
```

---

## Verification Commands

### After Each Wave

```bash
# Build check
npm run build

# Lint check
npm run lint

# Type check
npx tsc --noEmit
```

### Manual Testing Checklist

**Wave 1 Complete**:
- [ ] Notifications fire on streak at risk
- [ ] Offline mode queues progress
- [ ] Session includes interleaved reviews
- [ ] RAG indexes on content change
- [ ] New domain config works

**Wave 2 Complete**:
- [ ] ML confidence shows in UI
- [ ] Coach surfaces on 3 wrong answers
- [ ] Milestones trigger celebration
- [ ] Difficulty adapts to mastery
- [ ] Smart review prioritization works
- [ ] Path shows completion estimate

**Wave 3 Complete**:
- [ ] Dashboard shows AI insights
- [ ] "Why this" shows on learn page
- [ ] Review timing feedback works
- [ ] Progress charts display

**Wave 4 Complete**:
- [ ] All tests pass
- [ ] Lighthouse > 90
- [ ] Predictions < 100ms
- [ ] Monitoring alerts configured
- [ ] Docs complete

---

## Troubleshooting

### Build Fails After Agent Completes

```bash
# Check which files changed
git status

# If merge conflicts:
git diff --name-only --diff-filter=U

# Resolve conflicts then:
npm run build
```

### Agent Seems Stuck

Check the agent's output file:
```bash
# If using background agents:
tail -f /tmp/claude-agent-{id}.log
```

### Rerun Single Agent

```bash
# Rerun just the failing agent:
claude --prompt "$(cat .planning/agent-prompts/wave1-agent3-offline-mode.md)"
```

---

## File Ownership Map

Each agent has exclusive ownership to prevent conflicts:

| Agent | Exclusive Files |
|-------|-----------------|
| 1-1 | `src/lib/ml/training/*`, `src/app/api/ml/train/*` |
| 1-2 | `src/lib/notifications/triggers.ts`, notification API routes |
| 1-3 | `src/hooks/useOfflineSync.ts`, offline PWA components |
| 1-4 | `src/app/api/adaptive/session/route.ts` (interleaving logic) |
| 1-5 | `src/lib/rag/autoIndexer.ts`, RAG admin routes |
| 1-6 | `src/lib/content/domainConfig.ts`, domain types |
| 2-1 | ML integration in API routes, prediction fallback |
| 2-2 | `src/lib/coach/struggleDetector.ts`, ProactivePrompt wiring |
| 2-3 | `src/lib/coach/optimalTiming.ts`, TimingPrompt |
| 2-4 | `src/lib/adaptive/difficulty/*`, difficulty UI |
| 2-5 | `src/lib/mastery/smartReview.ts`, review enhancements |
| 2-6 | `src/lib/adaptive/pathOptimizer.ts`, path visualization |
| 3-1 | Dashboard page and widgets |
| 3-2 | Learn page and CoachLearningView additions |
| 3-3 | Review page |
| 3-4 | Progress/mastery pages |

---

## Estimated Total Time

| Execution Style | Time |
|-----------------|------|
| Fully sequential | 4-5 hours |
| Waves parallel, waves sequential | 1.5-2 hours |
| Maximum parallelism | 45-60 minutes |

The plan is designed for maximum parallelism while respecting dependencies.
