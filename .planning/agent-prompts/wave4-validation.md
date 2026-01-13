# Wave 4: Validation & Polish

## Overview
Wave 4 runs **sequentially** (not in parallel) to ensure thorough validation of the integrated system.

---

## Agent 4-1: Integration Testing

### Mission
End-to-end testing of the complete integrated system.

### Test Scenarios

```typescript
// tests/e2e/integration.spec.ts

describe('Full Learning Flow with ML', () => {
  test('new user gets BKT predictions', async () => {
    const user = await createTestUser();
    const prediction = await getPrediction(user.id, 'skill-1');
    expect(prediction.source).toBe('bkt');
    expect(prediction.confidence).toBeLessThan(0.6);
  });

  test('user with 20+ interactions gets hybrid predictions', async () => {
    const user = await createUserWithInteractions(25);
    const prediction = await getPrediction(user.id, 'skill-1');
    expect(prediction.source).toBe('hybrid');
  });

  test('struggle detection triggers coach', async () => {
    await answerWrong(3); // 3 consecutive wrong
    expect(screen.getByText(/struggling/i)).toBeInTheDocument();
  });

  test('notifications fire on events', async () => {
    const notificationSpy = jest.spyOn(notifications, 'send');
    await triggerStreakAtRisk();
    expect(notificationSpy).toHaveBeenCalled();
  });

  test('offline mode queues and syncs', async () => {
    await goOffline();
    await completeAtom('atom-1');
    expect(await getPendingCount()).toBe(1);
    await goOnline();
    await waitFor(() => expect(getPendingCount()).toBe(0));
  });

  test('interleaving includes review items', async () => {
    const session = await buildSession({ interleavingEnabled: true });
    const reviewItems = session.items.filter(i => i.isReviewChallenge);
    expect(reviewItems.length).toBeGreaterThan(0);
  });
});
```

### Commands
```bash
npm run test:e2e
npm run test:integration
```

---

## Agent 4-2: Performance Optimization

### Mission
Ensure ML predictions don't slow down UX.

### Performance Targets
- Prediction latency: < 100ms
- Page load: < 2s
- Session build: < 500ms

### Optimizations

```typescript
// 1. Prediction caching
const predictionCache = new Map<string, CachedPrediction>();

export async function getCachedPrediction(userId: string, skillId: string) {
  const cacheKey = `${userId}:${skillId}`;
  const cached = predictionCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.prediction;
  }

  const prediction = await predictWithHybrid(userId, skillId);
  predictionCache.set(cacheKey, { prediction, timestamp: Date.now() });
  return prediction;
}

// 2. Batch predictions
export async function batchPredict(userId: string, skillIds: string[]) {
  return Promise.all(skillIds.map(id => getCachedPrediction(userId, id)));
}

// 3. Lazy loading for non-critical features
const AIInsights = dynamic(() => import('./AIInsightsWidget'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### Verification
```bash
npm run build
npm run lighthouse
# Check: LCP < 2.5s, FID < 100ms, CLS < 0.1
```

---

## Agent 4-3: Monitoring & Observability

### Mission
Production monitoring for ML system health.

### Monitoring Setup

```typescript
// src/lib/monitoring/mlMetrics.ts

export async function trackPrediction(prediction: Prediction) {
  await logMetric('ml.prediction', {
    model: prediction.source,
    confidence: prediction.confidence,
    latencyMs: prediction.latencyMs,
    userId: prediction.userId,
    skillId: prediction.skillId,
  });
}

export async function trackPredictionAccuracy(
  prediction: number,
  actual: boolean
) {
  const accurate = (prediction > 0.5) === actual;
  await logMetric('ml.accuracy', { accurate, prediction, actual });
}

// Alert on anomalies
export function setupAlerts() {
  // Alert if prediction accuracy drops below 60%
  createAlert('ml.accuracy_low', {
    condition: 'accuracy < 0.6 for 1 hour',
    severity: 'warning',
  });

  // Alert if predictions take > 500ms
  createAlert('ml.latency_high', {
    condition: 'p95_latency > 500ms',
    severity: 'error',
  });

  // Alert if hybrid model usage drops
  createAlert('ml.hybrid_drop', {
    condition: 'hybrid_usage drops 20%',
    severity: 'warning',
  });
}
```

### Admin Dashboard Widget

```typescript
function MLHealthWidget() {
  return (
    <div>
      <h3>ML System Health</h3>
      <MetricCard label="Prediction Accuracy" value="78%" />
      <MetricCard label="Avg Latency" value="45ms" />
      <MetricCard label="Hybrid Usage" value="65%" />
      <MetricCard label="Active Users" value="1,234" />
    </div>
  );
}
```

---

## Agent 4-4: Documentation & Architecture

### Mission
Document the integrated system.

### Documents to Create/Update

1. **`.planning/ARCHITECTURE_v2.md`**
   - System overview with ML integration
   - Data flow diagrams
   - Component interactions

2. **`.planning/ML_SYSTEM.md`**
   - Hybrid model architecture
   - Training data pipeline
   - Prediction routing logic
   - Shadow mode comparison

3. **`.planning/RUNBOOK.md`**
   - How to retrain models
   - How to monitor predictions
   - How to roll back if issues
   - Common troubleshooting

4. **`docs/API.md`**
   - Updated API documentation
   - New ML endpoints
   - Prediction response formats

### Example Architecture Doc

```markdown
# Aptly Learning Architecture v2.0

## ML Prediction Flow

```
User Action → API Route → Prediction Router
                              ↓
                    [interactionCount >= 20?]
                         ↓           ↓
                       YES          NO
                         ↓           ↓
                    Hybrid Model   BKT Model
                         ↓           ↓
                    Prediction ← ← ←
                         ↓
                    Cache & Log
                         ↓
                    Return to UI
```

## Key Components

1. **Hybrid Model** (`src/lib/ml/hybridModel.ts`)
   - DKT2 (Transformer) + BKT dual-pathway
   - Cross-attention fusion
   - Cold-start handling

2. **Prediction Router** (`src/lib/mastery/predictionRouter.ts`)
   - Routes to BKT for new users
   - Routes to hybrid for users with 20+ interactions

3. **Struggle Detector** (`src/lib/coach/struggleDetector.ts`)
   - Multi-signal detection
   - Triggers proactive coach

...
```

---

## Execution Order

```
Agent 4-1 (Testing) → Agent 4-2 (Performance) → Agent 4-3 (Monitoring) → Agent 4-4 (Docs)
```

Each agent must complete before the next starts.

## Final Verification Checklist

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (95%+ coverage)
- [ ] All e2e tests pass
- [ ] Lighthouse score > 90
- [ ] ML predictions < 100ms
- [ ] Monitoring alerts configured
- [ ] Documentation complete

## Success Criteria

When Wave 4 completes:
1. Complete test coverage of integrated features
2. Performance meets targets
3. Monitoring and alerts in place
4. Full documentation for maintenance
