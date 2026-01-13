# Agent 2-1: ML Model Full Integration

## Mission
Make the hybrid ML model DRIVE all mastery decisions, not just log predictions.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/ml/hybridModel.ts           # Hybrid DKT2+BKT model
src/lib/ml/modelSwitching.ts        # BKT → Hybrid switching
src/lib/mastery/predictionRouter.ts # Prediction routing
src/app/api/skills/ready/route.ts   # Next skill API
src/app/api/mastery/map/route.ts    # Mastery map API
src/app/api/mastery/predict/route.ts # Prediction API
```

## Current State
- Hybrid model exists and can make predictions
- Model only LOGS predictions (shadow mode)
- BKT drives all actual decisions
- No confidence display in UI

## Changes to Make

### 1. Modify `src/app/api/skills/ready/route.ts`
Use hybrid model for skill recommendations:

```typescript
import { predictWithHybrid } from '@/lib/ml/hybridModel';
import { shouldUseHybrid } from '@/lib/ml/modelSwitching';

export async function GET(request: Request) {
  const { userId, courseId } = getParams(request);

  // Get all skills for course
  const allSkills = await getSkillsForCourse(courseId);

  // Get predictions for each skill
  const skillPredictions = await Promise.all(
    allSkills.map(async (skill) => {
      const useHybrid = await shouldUseHybrid(userId);

      const prediction = useHybrid
        ? await predictWithHybrid(userId, skill.id)
        : await predictWithBKT(userId, skill.id);

      return {
        skillId: skill.id,
        skillName: skill.name,
        pMastery: prediction.pMastery,
        confidence: prediction.confidence || 0.5,
        modelUsed: useHybrid ? 'hybrid' : 'bkt',
        isReady: meetsPrerequisites(skill, skillPredictions),
      };
    })
  );

  // Rank by readiness (prerequisites met) and optimal challenge level
  const readySkills = skillPredictions
    .filter(s => s.isReady && s.pMastery < 0.95) // Not fully mastered
    .sort((a, b) => {
      // Prefer skills in zone of proximal development (0.4-0.7 mastery)
      const aZPD = Math.abs(a.pMastery - 0.55);
      const bZPD = Math.abs(b.pMastery - 0.55);
      return aZPD - bZPD;
    });

  return NextResponse.json({
    skills: readySkills,
    totalSkills: allSkills.length,
    masteredCount: skillPredictions.filter(s => s.pMastery >= 0.95).length,
  });
}
```

### 2. Modify `src/app/api/mastery/map/route.ts`
Use hybrid model for mastery visualization:

```typescript
import { predictWithHybrid } from '@/lib/ml/hybridModel';
import { shouldUseHybrid } from '@/lib/ml/modelSwitching';

export async function GET(request: Request) {
  const { userId, courseId } = getParams(request);

  const skills = await getSkillsForCourse(courseId);
  const useHybrid = await shouldUseHybrid(userId);

  const masteryData = await Promise.all(
    skills.map(async (skill) => {
      const prediction = useHybrid
        ? await predictWithHybrid(userId, skill.id)
        : await predictWithBKT(userId, skill.id);

      const fsrsState = await getFSRSState(userId, skill.id);

      return {
        skillId: skill.id,
        skillName: skill.name,
        pMastery: prediction.pMastery,
        confidence: prediction.confidence || 0.5,
        modelUsed: useHybrid ? 'hybrid' : 'bkt',
        retrievability: fsrsState?.retrievability || null,
        status: getSkillStatus(prediction, fsrsState),
        // For UI: show why this prediction
        reasoning: useHybrid
          ? `Based on ${prediction.interactionCount || 0} interactions`
          : 'Initial estimate (need more data)',
      };
    })
  );

  return NextResponse.json({
    skills: masteryData,
    modelInfo: {
      currentModel: useHybrid ? 'hybrid' : 'bkt',
      interactionCount: await getInteractionCount(userId),
      hybridThreshold: 20,
    },
  });
}

function getSkillStatus(prediction: Prediction, fsrs: FSRSState | null): SkillStatus {
  if (prediction.pMastery >= 0.95) return 'mastered';
  if (fsrs && fsrs.retrievability < 0.8) return 'decaying';
  if (prediction.pMastery >= 0.5) return 'learning';
  return 'available';
}
```

### 3. Modify `src/components/dashboard/ExamReadinessWidget.tsx`
Show ML confidence:

```typescript
interface Props {
  courseId: string;
}

export function ExamReadinessWidget({ courseId }: Props) {
  const { data: mastery } = useMasteryMap(courseId);

  // Calculate overall readiness with confidence
  const avgMastery = mastery?.skills.reduce((sum, s) => sum + s.pMastery, 0) / mastery?.skills.length || 0;
  const avgConfidence = mastery?.skills.reduce((sum, s) => sum + s.confidence, 0) / mastery?.skills.length || 0;

  const readinessScore = avgMastery * 100;

  return (
    <div className="bg-white rounded-xl p-6 shadow">
      <h3 className="text-lg font-semibold mb-4">Exam Readiness</h3>

      {/* Main readiness score */}
      <div className="text-center mb-4">
        <span className="text-5xl font-bold text-blue-600">
          {readinessScore.toFixed(0)}%
        </span>
        <p className="text-gray-500 text-sm mt-1">Predicted Pass Probability</p>
      </div>

      {/* ML Confidence indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <BrainIcon className="w-4 h-4 text-purple-500" />
        <span className="text-sm text-gray-600">
          AI Confidence: {(avgConfidence * 100).toFixed(0)}%
        </span>
        <Tooltip content="Higher confidence means more accurate predictions based on your learning history">
          <InfoIcon className="w-4 h-4 text-gray-400" />
        </Tooltip>
      </div>

      {/* Model info */}
      <div className="text-xs text-gray-400 text-center">
        {mastery?.modelInfo.currentModel === 'hybrid' ? (
          <span>Using AI model ({mastery.modelInfo.interactionCount} data points)</span>
        ) : (
          <span>Building your learning profile ({mastery?.modelInfo.interactionCount}/{mastery?.modelInfo.hybridThreshold} interactions)</span>
        )}
      </div>

      {/* Skills breakdown */}
      <div className="mt-4 space-y-2">
        {mastery?.skills.slice(0, 5).map(skill => (
          <div key={skill.skillId} className="flex items-center justify-between text-sm">
            <span className="truncate">{skill.skillName}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${skill.pMastery * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8">
                {(skill.pMastery * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Modify `src/app/api/review/due/route.ts`
Enhance FSRS with ML predictions:

```typescript
import { predictWithHybrid } from '@/lib/ml/hybridModel';

export async function GET(request: Request) {
  const { userId } = getParams(request);

  // Get FSRS due items
  const fsrsDue = await getFSRSDueItems(userId);

  // Enhance with ML predictions for priority scoring
  const enhancedDue = await Promise.all(
    fsrsDue.map(async (item) => {
      const prediction = await predictWithHybrid(userId, item.skillId);

      // Priority score: lower mastery + lower retrievability = higher priority
      const priorityScore =
        (1 - prediction.pMastery) * 0.5 +
        (1 - item.retrievability) * 0.5;

      return {
        ...item,
        pMastery: prediction.pMastery,
        confidence: prediction.confidence,
        priorityScore,
        // ML-informed urgency
        urgency: priorityScore > 0.7 ? 'high' : priorityScore > 0.4 ? 'medium' : 'low',
      };
    })
  );

  // Sort by priority
  const sorted = enhancedDue.sort((a, b) => b.priorityScore - a.priorityScore);

  return NextResponse.json({
    items: sorted,
    totalDue: sorted.length,
    highPriority: sorted.filter(i => i.urgency === 'high').length,
  });
}
```

### 5. Add fallback handling
Create `src/lib/ml/predictionFallback.ts`:

```typescript
import { predictWithHybrid, HybridPrediction } from './hybridModel';
import { predictWithBKT, BKTPrediction } from '../mastery/bkt';

export async function getPredictionWithFallback(
  userId: string,
  skillId: string
): Promise<Prediction> {
  try {
    const hybrid = await predictWithHybrid(userId, skillId);

    // Validate prediction
    if (isValidPrediction(hybrid)) {
      return {
        ...hybrid,
        source: 'hybrid',
      };
    }

    // Fall back to BKT
    console.warn(`Hybrid prediction invalid for ${skillId}, falling back to BKT`);
    const bkt = await predictWithBKT(userId, skillId);
    return {
      pMastery: bkt.pMastery,
      confidence: 0.5,
      source: 'bkt_fallback',
    };

  } catch (error) {
    console.error(`Prediction failed for ${skillId}:`, error);

    // Emergency fallback
    const bkt = await predictWithBKT(userId, skillId);
    return {
      pMastery: bkt.pMastery,
      confidence: 0.3,
      source: 'bkt_emergency',
    };
  }
}

function isValidPrediction(p: HybridPrediction): boolean {
  return (
    typeof p.pMastery === 'number' &&
    p.pMastery >= 0 &&
    p.pMastery <= 1 &&
    typeof p.confidence === 'number'
  );
}
```

### 6. Log all predictions for model improvement
Add to each API that uses predictions:

```typescript
import { logPrediction } from '@/lib/ml/predictionLogger';

// After getting prediction:
await logPrediction({
  userId,
  skillId,
  prediction: prediction.pMastery,
  confidence: prediction.confidence,
  modelUsed: prediction.source,
  timestamp: Date.now(),
  context: 'skill_recommendation', // or 'mastery_map', 'review_priority', etc.
});
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Check mastery map shows confidence percentages
4. Manual test: Skill recommendations use ML (check API response)
5. Manual test: ExamReadinessWidget shows AI confidence
6. Manual test: Review priority uses ML enhancement
7. Edge case: Force hybrid prediction failure, verify BKT fallback works

## Do NOT Modify
- `src/lib/ml/hybridModel.ts` (model logic is correct)
- `src/lib/mastery/bkt.ts` (BKT is correct)
- `src/lib/mastery/fsrs.ts` (FSRS is correct)

## Output
When complete:
- ML drives ALL mastery decisions
- UI shows confidence levels
- Graceful fallback when ML fails
- All predictions logged for improvement
