# Agent 3-4: Progress & Mastery Visualization

## Mission
Create rich visualization of ML-tracked progress with exportable reports.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
```
src/app/progress/page.tsx
src/app/mastery/page.tsx
src/components/mastery/EnhancedMasteryMap.tsx
src/lib/ml/hybridModel.ts
```

## Changes to Make

### 1. Add mastery trajectory charts
Historical P(mastery) over time:

```typescript
function MasteryTrajectoryChart({ skillId, userId }) {
  const { data: history } = useMasteryHistory(skillId, userId);

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h4 className="font-medium mb-4">Mastery Over Time</h4>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={history}>
          <XAxis dataKey="date" tickFormatter={formatDate} />
          <YAxis domain={[0, 1]} tickFormatter={(v) => `${v * 100}%`} />
          <Tooltip
            content={({ payload }) => (
              <div className="bg-white p-2 shadow rounded">
                <p>{payload?.[0]?.payload.date}</p>
                <p className="font-bold">{Math.round(payload?.[0]?.value * 100)}%</p>
              </div>
            )}
          />
          <Line
            type="monotone"
            dataKey="mastery"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6' }}
          />
          {/* Target line at 95% */}
          <ReferenceLine y={0.95} stroke="#10B981" strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 2. Add prediction accuracy display
How well AI knows the user:

```typescript
function PredictionAccuracyWidget({ userId }) {
  const { data: accuracy } = usePredictionAccuracy(userId);

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h4 className="font-medium mb-2">AI Accuracy</h4>
      <p className="text-sm text-gray-600 mb-4">
        How well the AI predicts your performance
      </p>

      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-blue-600">
          {Math.round(accuracy.overall * 100)}%
        </div>
        <div className="text-sm text-gray-500">
          <p>Based on {accuracy.predictions} predictions</p>
          <p>{accuracy.modelType === 'hybrid' ? 'Personalized model' : 'Building your profile'}</p>
        </div>
      </div>

      {/* Accuracy trend */}
      <div className="mt-4 h-2 bg-gray-200 rounded-full">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${accuracy.overall * 100}%` }}
        />
      </div>
    </div>
  );
}
```

### 3. Add skill gap analysis
Identify areas needing work:

```typescript
function SkillGapAnalysis({ userId, courseId }) {
  const { data: gaps } = useSkillGaps(userId, courseId);

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h4 className="font-medium mb-4">Skill Gap Analysis</h4>

      <div className="space-y-3">
        {gaps.map(gap => (
          <div key={gap.skillId} className="flex items-center justify-between">
            <div>
              <span className="font-medium">{gap.skillName}</span>
              <p className="text-xs text-gray-500">{gap.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    gap.mastery < 0.5 ? 'bg-red-500' :
                    gap.mastery < 0.8 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${gap.mastery * 100}%` }}
                />
              </div>
              <span className="text-sm w-12">{Math.round(gap.mastery * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigateToPractice(gaps[0].skillId)}
        className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg"
      >
        Practice Weakest Skill
      </button>
    </div>
  );
}
```

### 4. Add time-to-mastery estimates
Per skill completion predictions:

```typescript
function TimeToMasteryWidget({ skills }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <h4 className="font-medium mb-4">Time to Mastery</h4>

      <div className="space-y-3">
        {skills.slice(0, 5).map(skill => (
          <div key={skill.id} className="flex items-center justify-between">
            <span>{skill.name}</span>
            <span className={`text-sm ${
              skill.estimatedDays < 3 ? 'text-green-600' :
              skill.estimatedDays < 7 ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              ~{skill.estimatedDays} days
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5. Add exportable progress report
Generate PDF/shareable report:

```typescript
function ExportProgressReport({ userId }) {
  const handleExport = async () => {
    const report = await generateProgressReport(userId);

    // Generate PDF
    const pdf = await generatePDF({
      title: 'Learning Progress Report',
      sections: [
        { title: 'Overview', content: report.overview },
        { title: 'Skills Mastered', content: report.masteredSkills },
        { title: 'In Progress', content: report.inProgress },
        { title: 'Predictions', content: report.predictions },
      ],
    });

    downloadPDF(pdf, 'progress-report.pdf');
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
    >
      <DownloadIcon className="w-4 h-4" />
      Export Report
    </button>
  );
}
```

### 6. Update progress page
Modify `src/app/progress/page.tsx`:

```typescript
export default function ProgressPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Progress</h1>
        <ExportProgressReport userId={userId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mastery trajectory */}
        <MasteryTrajectoryChart userId={userId} />

        {/* AI accuracy */}
        <PredictionAccuracyWidget userId={userId} />

        {/* Skill gaps */}
        <SkillGapAnalysis userId={userId} courseId={courseId} />

        {/* Time to mastery */}
        <TimeToMasteryWidget skills={skills} />
      </div>

      {/* Full mastery map */}
      <EnhancedMasteryMap userId={userId} courseId={courseId} />
    </div>
  );
}
```

## Verification Steps
1. `npm run build` - Must pass
2. Mastery trajectory shows historical data
3. AI accuracy percentage displays
4. Skill gaps identified correctly
5. Time estimates show
6. Export generates PDF
