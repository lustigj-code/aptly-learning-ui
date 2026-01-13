# Agent 2-3: Proactive Coach - Optimal Timing

## Mission
Surface the coach at optimal learning moments (milestones, transitions, prep for difficult content).

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/components/learning/CoachLearningView.tsx  # Main learning view
src/lib/adaptive/sessionBuilder.ts             # Session structure
src/lib/mastery/bkt.ts                         # Mastery tracking
src/hooks/useProactiveCoach.ts                 # Proactive hook
```

## Current State
- Coach only appears when user explicitly opens it
- No celebration of achievements
- No prep before difficult content
- No transition guidance

## Changes to Make

### 1. Create `src/lib/coach/optimalTiming.ts`
Purpose: Determine when coach should appear proactively

```typescript
export interface TimingTrigger {
  type: TimingTriggerType;
  priority: 'high' | 'medium' | 'low';
  message: CoachMessage;
  context: Record<string, any>;
}

export type TimingTriggerType =
  | 'mastery_milestone'
  | 'session_transition'
  | 'difficult_content_prep'
  | 'review_optimal_time'
  | 'session_recap'
  | 'daily_check_in';

export interface CoachMessage {
  title: string;
  body: string;
  action?: string;
  actionLabel?: string;
}

// Check for mastery milestones
export async function checkMasteryMilestone(
  userId: string,
  skillId: string,
  newMastery: number,
  previousMastery: number
): Promise<TimingTrigger | null> {
  const milestones = [0.5, 0.75, 0.9, 0.95];

  for (const milestone of milestones) {
    if (previousMastery < milestone && newMastery >= milestone) {
      return {
        type: 'mastery_milestone',
        priority: milestone >= 0.9 ? 'high' : 'medium',
        message: getMilestoneMessage(milestone, skillId),
        context: { milestone, skillId, newMastery },
      };
    }
  }

  return null;
}

function getMilestoneMessage(milestone: number, skillId: string): CoachMessage {
  const skillName = getSkillName(skillId);

  if (milestone >= 0.95) {
    return {
      title: '🎉 Mastery achieved!',
      body: `Incredible! You've mastered ${skillName}. This knowledge is now solidly yours.`,
      action: 'suggest_next_skill',
      actionLabel: 'What should I learn next?',
    };
  }
  if (milestone >= 0.9) {
    return {
      title: '🌟 Almost there!',
      body: `You're at 90% mastery of ${skillName}. A few more practice sessions and you'll have it locked in!`,
    };
  }
  if (milestone >= 0.75) {
    return {
      title: '💪 Great progress!',
      body: `You're now proficient in ${skillName}. Keep practicing to solidify this knowledge.`,
    };
  }
  return {
    title: '🚀 Halfway there!',
    body: `You've reached 50% mastery of ${skillName}. The foundations are coming together!`,
  };
}

// Check before difficult content
export async function checkDifficultContentPrep(
  userId: string,
  upcomingAtom: Atom,
  userMastery: Map<string, number>
): Promise<TimingTrigger | null> {
  // Get atom difficulty and prerequisites
  const difficulty = getAtomDifficulty(upcomingAtom);
  const prerequisites = getAtomPrerequisites(upcomingAtom);

  // Check if user might struggle
  const weakPrereqs = prerequisites.filter(
    prereq => (userMastery.get(prereq) || 0) < 0.7
  );

  if (difficulty === 'hard' || weakPrereqs.length > 0) {
    return {
      type: 'difficult_content_prep',
      priority: 'medium',
      message: {
        title: "Quick heads up",
        body: weakPrereqs.length > 0
          ? `This next section builds on ${weakPrereqs.join(', ')}. Want a quick refresher first?`
          : "This is one of the more challenging sections. Take your time with it!",
        action: weakPrereqs.length > 0 ? 'review_prerequisites' : undefined,
        actionLabel: 'Quick review',
      },
      context: { atomId: upcomingAtom.id, difficulty, weakPrereqs },
    };
  }

  return null;
}

// Check at session transitions
export function checkSessionTransition(
  sessionProgress: SessionProgress,
  currentPhase: 'warmup' | 'main' | 'cooldown',
  nextPhase: 'warmup' | 'main' | 'cooldown' | 'complete'
): TimingTrigger | null {
  if (currentPhase === 'warmup' && nextPhase === 'main') {
    return {
      type: 'session_transition',
      priority: 'low',
      message: {
        title: 'Warm-up complete!',
        body: "Great job warming up. Now let's dive into the main content.",
      },
      context: { from: currentPhase, to: nextPhase },
    };
  }

  if (currentPhase === 'main' && nextPhase === 'cooldown') {
    const accuracy = sessionProgress.correctCount / sessionProgress.totalCount;
    return {
      type: 'session_transition',
      priority: 'medium',
      message: {
        title: 'Almost done!',
        body: accuracy > 0.8
          ? `Excellent work! ${Math.round(accuracy * 100)}% accuracy. Let's wrap up with a quick review.`
          : `Good effort! Let's solidify what you've learned with a quick review.`,
      },
      context: { from: currentPhase, to: nextPhase, accuracy },
    };
  }

  if (nextPhase === 'complete') {
    return {
      type: 'session_recap',
      priority: 'high',
      message: getSessionRecapMessage(sessionProgress),
      context: { sessionProgress },
    };
  }

  return null;
}

function getSessionRecapMessage(progress: SessionProgress): CoachMessage {
  const accuracy = progress.correctCount / progress.totalCount;
  const timeMinutes = Math.round(progress.durationMs / 60000);

  return {
    title: '🎯 Session Complete!',
    body: `You spent ${timeMinutes} minutes learning and achieved ${Math.round(accuracy * 100)}% accuracy. ${getEncouragement(accuracy)}`,
    action: 'view_progress',
    actionLabel: 'See my progress',
  };
}

function getEncouragement(accuracy: number): string {
  if (accuracy >= 0.9) return "Outstanding performance!";
  if (accuracy >= 0.75) return "Great job!";
  if (accuracy >= 0.5) return "Keep practicing, you're improving!";
  return "Every session makes you stronger. Keep going!";
}

// Check for optimal review timing
export async function checkOptimalReviewTime(
  userId: string
): Promise<TimingTrigger | null> {
  // Get user's historical learning times
  const learningHistory = await getLearningHistory(userId);
  const peakHour = findPeakLearningHour(learningHistory);

  const currentHour = new Date().getHours();

  // Check if within optimal window and has due reviews
  if (Math.abs(currentHour - peakHour) <= 1) {
    const dueReviews = await getDueReviewCount(userId);

    if (dueReviews > 0) {
      return {
        type: 'review_optimal_time',
        priority: 'medium',
        message: {
          title: 'Perfect timing!',
          body: `This is typically your best learning time. You have ${dueReviews} review${dueReviews > 1 ? 's' : ''} ready.`,
          action: 'start_review',
          actionLabel: 'Start reviews',
        },
        context: { peakHour, dueReviews },
      };
    }
  }

  return null;
}

// Daily check-in
export function getDailyCheckIn(
  streak: number,
  todayProgress: DayProgress
): TimingTrigger {
  if (todayProgress.atomsCompleted === 0) {
    return {
      type: 'daily_check_in',
      priority: 'medium',
      message: {
        title: streak > 0 ? `Day ${streak + 1} awaits!` : 'Ready to learn?',
        body: streak > 0
          ? `Keep your ${streak}-day streak going! What would you like to focus on today?`
          : "Let's start building your knowledge. What interests you today?",
        action: 'start_session',
        actionLabel: 'Start learning',
      },
      context: { streak, todayProgress },
    };
  }

  return {
    type: 'daily_check_in',
    priority: 'low',
    message: {
      title: 'Welcome back!',
      body: `You've completed ${todayProgress.atomsCompleted} items today. Want to continue?`,
      action: 'continue_session',
      actionLabel: 'Continue',
    },
    context: { streak, todayProgress },
  };
}
```

### 2. Create timing check component
Create `src/components/coach/TimingPrompt.tsx`:

```typescript
import { TimingTrigger } from '@/lib/coach/optimalTiming';

interface Props {
  trigger: TimingTrigger | null;
  onAction: (action: string) => void;
  onDismiss: () => void;
}

export function TimingPrompt({ trigger, onAction, onDismiss }: Props) {
  if (!trigger) return null;

  const { message, priority } = trigger;

  return (
    <div className={`
      fixed bottom-24 right-4 max-w-sm animate-slide-up
      ${priority === 'high' ? 'z-50' : 'z-40'}
    `}>
      <div className={`
        bg-white rounded-xl shadow-xl p-4
        ${priority === 'high' ? 'border-l-4 border-green-500' : 'border border-gray-200'}
      `}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xl">🦉</span>
          </div>

          <div className="flex-1">
            <p className="font-medium text-gray-900">{message.title}</p>
            <p className="text-sm text-gray-600 mt-1">{message.body}</p>

            <div className="flex gap-2 mt-3">
              {message.action && (
                <button
                  onClick={() => onAction(message.action!)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  {message.actionLabel}
                </button>
              )}
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Integrate into CoachLearningView
Wire timing checks to learning flow:

```typescript
import {
  checkMasteryMilestone,
  checkDifficultContentPrep,
  checkSessionTransition,
  TimingTrigger,
} from '@/lib/coach/optimalTiming';
import { TimingPrompt } from '@/components/coach/TimingPrompt';

export function CoachLearningView({ ... }) {
  const [timingTrigger, setTimingTrigger] = useState<TimingTrigger | null>(null);

  // Check milestones after mastery updates
  const handleMasteryUpdate = async (skillId: string, newMastery: number) => {
    const trigger = await checkMasteryMilestone(
      userId,
      skillId,
      newMastery,
      previousMastery
    );

    if (trigger) {
      setTimingTrigger(trigger);
    }
  };

  // Check before loading next atom
  const prepareNextAtom = async (atom: Atom) => {
    const trigger = await checkDifficultContentPrep(userId, atom, masteryMap);

    if (trigger) {
      setTimingTrigger(trigger);
      // Wait for user acknowledgment before proceeding
      await waitForTriggerDismissal();
    }

    loadAtom(atom);
  };

  // Check at phase transitions
  const handlePhaseChange = (from: string, to: string) => {
    const trigger = checkSessionTransition(sessionProgress, from, to);

    if (trigger) {
      setTimingTrigger(trigger);
    }
  };

  // Handle timing prompt actions
  const handleTimingAction = async (action: string) => {
    switch (action) {
      case 'suggest_next_skill':
        const nextSkill = await getRecommendedNextSkill();
        navigateToSkill(nextSkill);
        break;
      case 'review_prerequisites':
        await loadPrerequisiteReview(timingTrigger?.context.weakPrereqs);
        break;
      case 'view_progress':
        router.push('/progress');
        break;
      case 'start_review':
        router.push('/review');
        break;
    }

    setTimingTrigger(null);
  };

  return (
    <div>
      {/* Existing learning UI */}
      ...

      {/* Timing prompt (lower priority than struggle prompt) */}
      <TimingPrompt
        trigger={timingTrigger}
        onAction={handleTimingAction}
        onDismiss={() => setTimingTrigger(null)}
      />
    </div>
  );
}
```

### 4. Add timing preferences to settings
Modify `src/app/settings/page.tsx`:

```typescript
<section className="space-y-4">
  <h3 className="text-lg font-semibold">Coach Timing</h3>

  <div className="space-y-2">
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={preferences.showMilestones}
        onChange={(e) => updatePreference('showMilestones', e.target.checked)}
      />
      <span>Celebrate milestones</span>
    </label>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={preferences.showTransitions}
        onChange={(e) => updatePreference('showTransitions', e.target.checked)}
      />
      <span>Session transition guidance</span>
    </label>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={preferences.showDifficultyPrep}
        onChange={(e) => updatePreference('showDifficultyPrep', e.target.checked)}
      />
      <span>Prep me for difficult content</span>
    </label>
  </div>
</section>
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Reach 50% mastery on a skill
4. Verify: Milestone celebration appears
5. Manual test: Complete warm-up phase
6. Verify: Transition message appears
7. Manual test: Navigate to difficult content
8. Verify: Prep message appears

## Do NOT Modify
- Session builder logic
- Mastery calculation algorithms
- Coach API routes

## Output
When complete:
- Coach celebrates mastery milestones
- Session transitions are smooth with guidance
- Users are prepped before difficult content
- Timing can be configured in settings
