# Agent 3-1: Unified Learning Dashboard

## Mission
Make the dashboard driven entirely by ML insights with "why" explanations.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
```
src/app/dashboard/page.tsx
src/components/dashboard/*Widget.tsx
src/lib/ml/hybridModel.ts
src/app/api/mastery/map/route.ts
```

## Changes to Make

### 1. Create `src/components/dashboard/AIInsightsWidget.tsx`
Shows ML observations about user's learning:

```typescript
export function AIInsightsWidget({ userId }: { userId: string }) {
  const { data: insights } = useAIInsights(userId);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <BrainIcon className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-900">AI Insights</h3>
      </div>

      <div className="space-y-4">
        {/* Learning velocity */}
        <InsightCard
          icon="⚡"
          title="Learning Pace"
          value={`${insights.velocity.atomsPerHour.toFixed(1)} items/hour`}
          trend={insights.velocity.trend}
          explanation="Based on your last 7 days of activity"
        />

        {/* Predicted completion */}
        <InsightCard
          icon="📅"
          title="Predicted Completion"
          value={insights.completionDate.toLocaleDateString()}
          confidence={insights.completionConfidence}
          explanation={`At ${insights.avgDailyMinutes} min/day`}
        />

        {/* Strongest/weakest skills */}
        <InsightCard
          icon="💪"
          title="Strongest Skill"
          value={insights.strongestSkill.name}
          detail={`${Math.round(insights.strongestSkill.mastery * 100)}% mastery`}
        />

        <InsightCard
          icon="🎯"
          title="Focus Area"
          value={insights.focusSkill.name}
          detail={insights.focusSkill.reason}
        />
      </div>
    </div>
  );
}
```

### 2. Add "Why" explanations to all recommendations
Modify `src/components/dashboard/NextStepWidget.tsx`:

```typescript
export function NextStepWidget({ recommendation }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h3 className="font-medium">{recommendation.title}</h3>

      {/* The "Why" explanation */}
      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <LightbulbIcon className="w-4 h-4 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-800">
            {recommendation.reasoning}
          </p>
        </div>
      </div>

      {/* Confidence indicator */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>AI Confidence: {Math.round(recommendation.confidence * 100)}%</span>
        <Tooltip content="Higher confidence means more personalized recommendation">
          <InfoIcon className="w-3 h-3" />
        </Tooltip>
      </div>
    </div>
  );
}
```

### 3. Create API endpoint for AI insights
`src/app/api/dashboard/insights/route.ts`:

```typescript
export async function GET(request: Request) {
  const { userId } = getParams(request);

  const [velocity, path, mastery, activity] = await Promise.all([
    calculateLearningVelocity(userId),
    buildOptimizedPath(userId, currentCourseId),
    getMasteryMap(userId),
    getRecentActivity(userId),
  ]);

  // Find strongest and weakest skills
  const sortedByMastery = mastery.skills.sort((a, b) => b.pMastery - a.pMastery);

  // Generate focus recommendation
  const focusSkill = selectFocusSkill(mastery.skills, velocity);

  return NextResponse.json({
    velocity,
    completionDate: path.estimate.completionDate,
    completionConfidence: velocity.confidence,
    avgDailyMinutes: activity.avgDailyMinutes,
    strongestSkill: sortedByMastery[0],
    focusSkill: {
      ...focusSkill,
      reason: generateFocusReason(focusSkill, mastery),
    },
    modelInfo: {
      interactionCount: activity.totalInteractions,
      usingHybrid: activity.totalInteractions >= 20,
    },
  });
}
```

### 4. Update dashboard page
Modify `src/app/dashboard/page.tsx`:

```typescript
export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      {/* AI Insights - prominent placement */}
      <AIInsightsWidget userId={userId} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {/* Next recommended action with "why" */}
        <NextStepWidget recommendation={nextStep} />

        {/* Review status with ML priority */}
        <ReviewStatusWidget userId={userId} />

        {/* Progress with trajectory */}
        <ProgressWidget userId={userId} />

        {/* Exam readiness with confidence */}
        <ExamReadinessWidget courseId={courseId} />

        {/* Daily goals based on ML */}
        <DailyGoalsWidget userId={userId} />

        {/* Streak with prediction */}
        <StreakWidget userId={userId} />
      </div>
    </div>
  );
}
```

## Verification Steps
1. `npm run build` - Must pass
2. Dashboard shows AI Insights widget
3. All recommendations have "Why" explanations
4. Confidence percentages visible
5. Model info shows (BKT vs Hybrid)
