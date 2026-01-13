# Agent 2-6: Learning Path Optimization

## Mission
Create ML-driven curriculum sequencing that optimizes learning paths.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/lib/adaptive/sequencer.ts        # Current sequencing logic
src/lib/mastery/prerequisites.ts     # Prerequisite handling (if exists)
src/lib/mastery/knowledgeGraph.ts    # Skill graph
src/lib/ml/hybridModel.ts            # ML predictions
```

## Current State
- Sequencer follows static prerequisite order
- No learning velocity estimation
- No personalized completion estimates
- No fast-track for experienced learners

## Changes to Make

### 1. Create `src/lib/adaptive/pathOptimizer.ts`
Purpose: Optimize learning path based on user state

```typescript
import { predictWithHybrid } from '../ml/hybridModel';
import { getKnowledgeGraph, Skill } from '../mastery/knowledgeGraph';

export interface OptimizedPath {
  skills: PathSkill[];
  estimatedCompletionHours: number;
  pathType: 'standard' | 'accelerated' | 'remedial';
  reasoning: string;
}

export interface PathSkill {
  skillId: string;
  skillName: string;
  order: number;
  estimatedMinutes: number;
  canSkip: boolean;
  skipReason?: string;
  prerequisites: string[];
  pMastery: number;
}

export interface LearningVelocity {
  atomsPerHour: number;
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

// Calculate user's learning velocity
export async function calculateLearningVelocity(
  userId: string
): Promise<LearningVelocity> {
  const recentSessions = await getRecentSessions(userId, 7); // Last 7 days

  if (recentSessions.length < 3) {
    // Not enough data, use defaults
    return {
      atomsPerHour: 10,
      averageAccuracy: 0.7,
      trend: 'stable',
      confidence: 0.3,
    };
  }

  // Calculate atoms per hour
  const totalAtoms = recentSessions.reduce((sum, s) => sum + s.atomsCompleted, 0);
  const totalMinutes = recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const atomsPerHour = (totalAtoms / totalMinutes) * 60;

  // Calculate accuracy
  const totalCorrect = recentSessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalAnswers = recentSessions.reduce((sum, s) => sum + s.totalAnswers, 0);
  const averageAccuracy = totalCorrect / totalAnswers;

  // Calculate trend
  const recentHalf = recentSessions.slice(0, Math.floor(recentSessions.length / 2));
  const olderHalf = recentSessions.slice(Math.floor(recentSessions.length / 2));

  const recentAccuracy = recentHalf.reduce((sum, s) => sum + s.accuracy, 0) / recentHalf.length;
  const olderAccuracy = olderHalf.reduce((sum, s) => sum + s.accuracy, 0) / olderHalf.length;

  const trend = recentAccuracy > olderAccuracy + 0.05 ? 'improving'
    : recentAccuracy < olderAccuracy - 0.05 ? 'declining'
    : 'stable';

  return {
    atomsPerHour,
    averageAccuracy,
    trend,
    confidence: Math.min(0.9, recentSessions.length / 10),
  };
}

// Build optimized learning path
export async function buildOptimizedPath(
  userId: string,
  courseId: string
): Promise<OptimizedPath> {
  const graph = await getKnowledgeGraph(courseId);
  const velocity = await calculateLearningVelocity(userId);

  // Get mastery for all skills
  const skillMastery = await Promise.all(
    graph.skills.map(async (skill) => {
      const prediction = await predictWithHybrid(userId, skill.id);
      return {
        skill,
        pMastery: prediction.pMastery,
        confidence: prediction.confidence,
      };
    })
  );

  // Determine path type based on current state
  const avgMastery = skillMastery.reduce((sum, s) => sum + s.pMastery, 0) / skillMastery.length;
  const pathType = avgMastery > 0.6 ? 'accelerated'
    : avgMastery < 0.3 && velocity.trend === 'declining' ? 'remedial'
    : 'standard';

  // Build path respecting prerequisites
  const orderedSkills = topologicalSort(graph, skillMastery);

  // Calculate which skills can be skipped (high mastery)
  const pathSkills = orderedSkills.map((s, i) => ({
    skillId: s.skill.id,
    skillName: s.skill.name,
    order: i + 1,
    estimatedMinutes: estimateSkillTime(s.skill, velocity, s.pMastery),
    canSkip: s.pMastery >= 0.85 && pathType === 'accelerated',
    skipReason: s.pMastery >= 0.85 ? 'Already mastered' : undefined,
    prerequisites: s.skill.prerequisites,
    pMastery: s.pMastery,
  }));

  // Calculate total time
  const activePath = pathSkills.filter(s => !s.canSkip);
  const totalMinutes = activePath.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return {
    skills: pathSkills,
    estimatedCompletionHours: totalMinutes / 60,
    pathType,
    reasoning: getPathReasoning(pathType, pathSkills, velocity),
  };
}

function topologicalSort(
  graph: KnowledgeGraph,
  mastery: Array<{ skill: Skill; pMastery: number }>
): Array<{ skill: Skill; pMastery: number }> {
  // Already implemented in knowledgeGraph - use existing
  const skillMap = new Map(mastery.map(s => [s.skill.id, s]));
  const sorted: Array<{ skill: Skill; pMastery: number }> = [];
  const visited = new Set<string>();

  function visit(skillId: string) {
    if (visited.has(skillId)) return;
    visited.add(skillId);

    const skillData = skillMap.get(skillId);
    if (!skillData) return;

    // Visit prerequisites first
    skillData.skill.prerequisites.forEach(prereq => visit(prereq));

    sorted.push(skillData);
  }

  graph.skills.forEach(skill => visit(skill.id));

  return sorted;
}

function estimateSkillTime(
  skill: Skill,
  velocity: LearningVelocity,
  currentMastery: number
): number {
  // Base time for skill content
  const baseMinutes = skill.atomCount * 3; // 3 min per atom average

  // Adjust for current mastery (less time if already know some)
  const masteryMultiplier = 1 - (currentMastery * 0.5);

  // Adjust for velocity (faster learners need less time)
  const velocityMultiplier = 10 / velocity.atomsPerHour;

  return Math.round(baseMinutes * masteryMultiplier * velocityMultiplier);
}

function getPathReasoning(
  pathType: string,
  skills: PathSkill[],
  velocity: LearningVelocity
): string {
  const skippable = skills.filter(s => s.canSkip).length;

  if (pathType === 'accelerated') {
    return `Fast track path - you can skip ${skippable} skills you've already mastered. Focus on ${skills.length - skippable} remaining skills.`;
  }
  if (pathType === 'remedial') {
    return 'Taking a foundational approach to build strong understanding. Extra practice included.';
  }
  return `Standard path through ${skills.length} skills. Estimated ${(velocity.atomsPerHour * 10).toFixed(0)} atoms per hour based on your pace.`;
}

// Calculate personalized completion estimate
export async function getCompletionEstimate(
  userId: string,
  courseId: string
): Promise<CompletionEstimate> {
  const path = await buildOptimizedPath(userId, courseId);
  const velocity = await calculateLearningVelocity(userId);

  // Calculate based on user's study patterns
  const userStats = await getUserStudyStats(userId);
  const avgDailyMinutes = userStats.avgDailyMinutes || 30;

  const daysToComplete = (path.estimatedCompletionHours * 60) / avgDailyMinutes;

  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + Math.ceil(daysToComplete));

  return {
    estimatedHours: path.estimatedCompletionHours,
    estimatedDays: Math.ceil(daysToComplete),
    completionDate,
    confidence: velocity.confidence,
    assumptions: {
      dailyMinutes: avgDailyMinutes,
      learningVelocity: velocity.atomsPerHour,
    },
  };
}

interface CompletionEstimate {
  estimatedHours: number;
  estimatedDays: number;
  completionDate: Date;
  confidence: number;
  assumptions: {
    dailyMinutes: number;
    learningVelocity: number;
  };
}

// Check if user qualifies for fast track
export async function checkFastTrackEligibility(
  userId: string,
  courseId: string
): Promise<FastTrackEligibility> {
  const path = await buildOptimizedPath(userId, courseId);
  const skippable = path.skills.filter(s => s.canSkip);

  if (skippable.length < 3) {
    return {
      eligible: false,
      reason: 'Need mastery in at least 3 skills to unlock fast track',
      currentMastered: skippable.length,
      requiredMastered: 3,
    };
  }

  const timeSaved = skippable.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return {
    eligible: true,
    reason: `Skip ${skippable.length} skills you've mastered`,
    skillsToSkip: skippable.map(s => s.skillName),
    timeSavedMinutes: timeSaved,
  };
}

interface FastTrackEligibility {
  eligible: boolean;
  reason: string;
  currentMastered?: number;
  requiredMastered?: number;
  skillsToSkip?: string[];
  timeSavedMinutes?: number;
}
```

### 2. Create path visualization component
Create `src/components/learning/PathVisualization.tsx`:

```typescript
import { OptimizedPath, PathSkill } from '@/lib/adaptive/pathOptimizer';

interface Props {
  path: OptimizedPath;
  onSkillClick: (skillId: string) => void;
}

export function PathVisualization({ path, onSkillClick }: Props) {
  return (
    <div className="bg-white rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Learning Path</h3>
        <span className={`px-3 py-1 rounded-full text-sm ${
          path.pathType === 'accelerated' ? 'bg-green-100 text-green-700' :
          path.pathType === 'remedial' ? 'bg-yellow-100 text-yellow-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {path.pathType.charAt(0).toUpperCase() + path.pathType.slice(1)} Path
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{path.reasoning}</p>

      <div className="space-y-2">
        {path.skills.map((skill, i) => (
          <SkillNode
            key={skill.skillId}
            skill={skill}
            isFirst={i === 0}
            isLast={i === path.skills.length - 1}
            onClick={() => onSkillClick(skill.skillId)}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t text-sm text-gray-600">
        Estimated completion: ~{path.estimatedCompletionHours.toFixed(1)} hours
        {path.skills.filter(s => s.canSkip).length > 0 && (
          <span className="text-green-600 ml-2">
            ({path.skills.filter(s => s.canSkip).length} skills skippable)
          </span>
        )}
      </div>
    </div>
  );
}

function SkillNode({ skill, isFirst, isLast, onClick }: {
  skill: PathSkill;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const statusColor = skill.canSkip ? 'bg-green-500' :
    skill.pMastery >= 0.5 ? 'bg-blue-500' :
    'bg-gray-300';

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
        skill.canSkip ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      {/* Connection line */}
      <div className="flex flex-col items-center">
        {!isFirst && <div className="w-0.5 h-2 bg-gray-300" />}
        <div className={`w-4 h-4 rounded-full ${statusColor}`} />
        {!isLast && <div className="w-0.5 h-2 bg-gray-300" />}
      </div>

      {/* Skill info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={skill.canSkip ? 'line-through text-gray-400' : 'font-medium'}>
            {skill.skillName}
          </span>
          {skill.canSkip && (
            <span className="text-xs text-green-600">Skip</span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          ~{skill.estimatedMinutes} min • {Math.round(skill.pMastery * 100)}% mastery
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-20 h-2 bg-gray-200 rounded-full">
        <div
          className={`h-full rounded-full ${statusColor}`}
          style={{ width: `${skill.pMastery * 100}%` }}
        />
      </div>
    </div>
  );
}
```

### 3. Add path API endpoint
Create `src/app/api/path/optimized/route.ts`:

```typescript
import {
  buildOptimizedPath,
  getCompletionEstimate,
  checkFastTrackEligibility,
  calculateLearningVelocity,
} from '@/lib/adaptive/pathOptimizer';

export async function GET(request: Request) {
  const { userId, courseId } = getParams(request);

  const [path, estimate, fastTrack, velocity] = await Promise.all([
    buildOptimizedPath(userId, courseId),
    getCompletionEstimate(userId, courseId),
    checkFastTrackEligibility(userId, courseId),
    calculateLearningVelocity(userId),
  ]);

  return NextResponse.json({
    path,
    estimate,
    fastTrack,
    velocity,
  });
}
```

### 4. Wire to learn page
Add path info to dashboard or learn page:

```typescript
// In dashboard or course overview:
const { data: pathData } = usePath(courseId);

{pathData && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <PathVisualization
      path={pathData.path}
      onSkillClick={handleSkillNavigation}
    />

    <div className="space-y-4">
      {/* Completion estimate */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h4 className="font-medium mb-2">Completion Estimate</h4>
        <div className="text-3xl font-bold text-blue-600">
          {pathData.estimate.estimatedDays} days
        </div>
        <p className="text-sm text-gray-600">
          At ~{pathData.estimate.assumptions.dailyMinutes} min/day
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Target date: {pathData.estimate.completionDate.toLocaleDateString()}
        </p>
      </div>

      {/* Fast track option */}
      {pathData.fastTrack.eligible && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <h4 className="font-medium text-green-800">Fast Track Available!</h4>
          <p className="text-sm text-green-700 mt-1">
            {pathData.fastTrack.reason}
          </p>
          <p className="text-sm text-green-600">
            Save ~{Math.round(pathData.fastTrack.timeSavedMinutes! / 60)} hours
          </p>
          <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg">
            Enable Fast Track
          </button>
        </div>
      )}
    </div>
  </div>
)}
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Check path shows for course
4. Manual test: High mastery skills marked as skippable
5. Manual test: Completion estimate shows
6. Verify: Fast track eligibility calculates correctly
7. Verify: Learning velocity calculated from history

## Do NOT Modify
- `src/lib/mastery/knowledgeGraph.ts` (graph structure)
- Session builder (just uses path info)
- ML model

## Output
When complete:
- Personalized learning paths
- Accurate completion estimates
- Fast track for experienced learners
- Learning velocity tracking
