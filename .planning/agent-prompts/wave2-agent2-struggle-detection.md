# Agent 2-2: Proactive Coach - Struggle Detection

## Mission
Make the coach surface automatically when it detects the user is struggling.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files:
```
src/hooks/useProactiveCoach.ts           # Proactive coach hook
src/components/coach/ProactivePrompt.tsx # Proactive UI component
src/components/learning/CoachLearningView.tsx  # Main learning view
src/lib/adaptive/struggleDetection.ts    # Existing struggle signals (if any)
src/lib/coach/socraticCoachService.ts    # Coach service
```

## Current State
- ProactivePrompt component exists but never shows
- useProactiveCoach hook exists but isn't triggered
- No automatic struggle detection

## Changes to Make

### 1. Create `src/lib/coach/struggleDetector.ts`
Purpose: Detect struggle signals from learning behavior

```typescript
export interface StruggleSignal {
  type: 'consecutive_wrong' | 'time_anomaly' | 'reread' | 'mastery_regression' | 'help_seeking';
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  context: Record<string, any>;
}

export interface StruggleState {
  isStruggling: boolean;
  signals: StruggleSignal[];
  overallSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  suggestedIntervention: InterventionType;
  skillId?: string;
  atomId?: string;
}

// Track state per user session
const struggleStates = new Map<string, SessionStruggleState>();

interface SessionStruggleState {
  consecutiveWrong: number;
  responseTimes: number[];
  rereadCount: Map<string, number>;
  lastMasteryValues: Map<string, number>;
  lastUpdate: number;
}

export function initStruggleTracking(sessionId: string): void {
  struggleStates.set(sessionId, {
    consecutiveWrong: 0,
    responseTimes: [],
    rereadCount: new Map(),
    lastMasteryValues: new Map(),
    lastUpdate: Date.now(),
  });
}

// Called after each quiz/practice answer
export function recordAnswer(
  sessionId: string,
  isCorrect: boolean,
  responseTimeMs: number,
  skillId: string
): StruggleState {
  const state = struggleStates.get(sessionId);
  if (!state) return noStruggle();

  const signals: StruggleSignal[] = [];

  // Signal 1: Consecutive wrong answers
  if (isCorrect) {
    state.consecutiveWrong = 0;
  } else {
    state.consecutiveWrong++;
    if (state.consecutiveWrong >= 2) {
      signals.push({
        type: 'consecutive_wrong',
        severity: state.consecutiveWrong >= 3 ? 'severe' : 'moderate',
        confidence: 0.9,
        context: { count: state.consecutiveWrong, skillId },
      });
    }
  }

  // Signal 2: Time anomalies
  state.responseTimes.push(responseTimeMs);
  const avgTime = state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length;

  if (responseTimeMs < 5000) {
    // Too fast = guessing
    signals.push({
      type: 'time_anomaly',
      severity: 'moderate',
      confidence: 0.7,
      context: { responseTimeMs, avgTime, issue: 'too_fast' },
    });
  } else if (responseTimeMs > 180000) {
    // 3+ minutes = confused
    signals.push({
      type: 'time_anomaly',
      severity: 'moderate',
      confidence: 0.8,
      context: { responseTimeMs, avgTime, issue: 'too_slow' },
    });
  }

  state.lastUpdate = Date.now();
  return evaluateStruggle(signals, skillId);
}

// Called when user views content
export function recordContentView(
  sessionId: string,
  contentId: string
): StruggleState {
  const state = struggleStates.get(sessionId);
  if (!state) return noStruggle();

  const viewCount = (state.rereadCount.get(contentId) || 0) + 1;
  state.rereadCount.set(contentId, viewCount);

  const signals: StruggleSignal[] = [];

  // Signal 3: Re-reading same content
  if (viewCount >= 3) {
    signals.push({
      type: 'reread',
      severity: viewCount >= 5 ? 'severe' : 'moderate',
      confidence: 0.85,
      context: { contentId, viewCount },
    });
  }

  return evaluateStruggle(signals);
}

// Called when mastery updates
export function recordMasteryChange(
  sessionId: string,
  skillId: string,
  newMastery: number
): StruggleState {
  const state = struggleStates.get(sessionId);
  if (!state) return noStruggle();

  const previousMastery = state.lastMasteryValues.get(skillId);
  state.lastMasteryValues.set(skillId, newMastery);

  const signals: StruggleSignal[] = [];

  // Signal 4: Mastery regression
  if (previousMastery && newMastery < previousMastery - 0.1) {
    signals.push({
      type: 'mastery_regression',
      severity: newMastery < previousMastery - 0.2 ? 'severe' : 'moderate',
      confidence: 0.95,
      context: { skillId, previousMastery, newMastery, drop: previousMastery - newMastery },
    });
  }

  return evaluateStruggle(signals, skillId);
}

function evaluateStruggle(signals: StruggleSignal[], skillId?: string): StruggleState {
  if (signals.length === 0) {
    return noStruggle();
  }

  const overallSeverity = signals.some(s => s.severity === 'severe')
    ? 'severe'
    : signals.some(s => s.severity === 'moderate')
    ? 'moderate'
    : 'mild';

  const suggestedIntervention = getSuggestedIntervention(signals, overallSeverity);

  return {
    isStruggling: true,
    signals,
    overallSeverity,
    suggestedIntervention,
    skillId,
  };
}

function getSuggestedIntervention(
  signals: StruggleSignal[],
  severity: string
): InterventionType {
  // Prioritize interventions based on signals
  if (signals.some(s => s.type === 'consecutive_wrong' && s.severity === 'severe')) {
    return 'simpler_practice';
  }
  if (signals.some(s => s.type === 'time_anomaly' && s.context.issue === 'too_fast')) {
    return 'engagement_prompt';
  }
  if (signals.some(s => s.type === 'reread')) {
    return 'alternative_explanation';
  }
  if (signals.some(s => s.type === 'mastery_regression')) {
    return 'prerequisite_review';
  }
  if (severity === 'severe') {
    return 'coach_session';
  }
  return 'hint';
}

function noStruggle(): StruggleState {
  return {
    isStruggling: false,
    signals: [],
    overallSeverity: 'none',
    suggestedIntervention: 'none',
  };
}

export type InterventionType =
  | 'none'
  | 'hint'
  | 'alternative_explanation'
  | 'prerequisite_review'
  | 'simpler_practice'
  | 'coach_session'
  | 'break_suggestion'
  | 'engagement_prompt';
```

### 2. Wire to `src/components/coach/ProactivePrompt.tsx`
Make it actually display:

```typescript
import { useEffect, useState } from 'react';
import { StruggleState, InterventionType } from '@/lib/coach/struggleDetector';

interface Props {
  struggleState: StruggleState;
  onAccept: (intervention: InterventionType) => void;
  onDismiss: () => void;
}

export function ProactivePrompt({ struggleState, onAccept, onDismiss }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (struggleState.isStruggling && struggleState.overallSeverity !== 'mild') {
      // Delay to avoid interrupting mid-thought
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
    setIsVisible(false);
  }, [struggleState]);

  if (!isVisible) return null;

  const messages = getInterventionMessage(struggleState);

  return (
    <div className="fixed bottom-24 right-4 max-w-sm animate-slide-up">
      <div className="bg-white rounded-xl shadow-xl p-4 border-l-4 border-purple-500">
        {/* Sage avatar */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-xl">🦉</span>
          </div>

          <div className="flex-1">
            <p className="font-medium text-gray-900">{messages.title}</p>
            <p className="text-sm text-gray-600 mt-1">{messages.body}</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onAccept(struggleState.suggestedIntervention)}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
              >
                {messages.acceptText}
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800"
              >
                I'm okay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getInterventionMessage(state: StruggleState): {
  title: string;
  body: string;
  acceptText: string;
} {
  const signal = state.signals[0];

  switch (state.suggestedIntervention) {
    case 'simpler_practice':
      return {
        title: "Let's try a different approach",
        body: "I noticed you might be finding this challenging. Want to try some easier practice first?",
        acceptText: "Yes, simplify",
      };
    case 'alternative_explanation':
      return {
        title: "Want me to explain differently?",
        body: "Sometimes a different perspective helps. I can explain this concept another way.",
        acceptText: "Show me",
      };
    case 'prerequisite_review':
      return {
        title: "Quick foundation check",
        body: "It might help to review some foundational concepts first. Want to do a quick refresher?",
        acceptText: "Review basics",
      };
    case 'coach_session':
      return {
        title: "Let's work through this together",
        body: "I'm here to help! Want to chat through what's confusing?",
        acceptText: "Chat with Sage",
      };
    case 'engagement_prompt':
      return {
        title: "Taking your time?",
        body: "No rush! Read carefully and think through each question. Quality over speed.",
        acceptText: "Got it",
      };
    case 'break_suggestion':
      return {
        title: "Time for a break?",
        body: "You've been at it for a while. A short break can help you learn better!",
        acceptText: "Take a break",
      };
    default:
      return {
        title: "Need a hint?",
        body: "I can give you a nudge in the right direction if you'd like.",
        acceptText: "Give me a hint",
      };
  }
}
```

### 3. Integrate into `src/components/learning/CoachLearningView.tsx`
Wire struggle detection to learning interactions:

```typescript
import {
  initStruggleTracking,
  recordAnswer,
  recordContentView,
  recordMasteryChange,
  StruggleState,
} from '@/lib/coach/struggleDetector';
import { ProactivePrompt } from '@/components/coach/ProactivePrompt';

export function CoachLearningView({ ... }) {
  const [struggleState, setStruggleState] = useState<StruggleState>({
    isStruggling: false,
    signals: [],
    overallSeverity: 'none',
    suggestedIntervention: 'none',
  });
  const sessionId = useRef(crypto.randomUUID());

  // Initialize tracking on mount
  useEffect(() => {
    initStruggleTracking(sessionId.current);
  }, []);

  // When quiz answer is submitted
  const handleQuizAnswer = (atomId: string, isCorrect: boolean, responseTimeMs: number, skillId: string) => {
    // ... existing logic

    // Check for struggle
    const newStruggleState = recordAnswer(sessionId.current, isCorrect, responseTimeMs, skillId);
    setStruggleState(newStruggleState);
  };

  // When content is viewed
  const handleContentView = (contentId: string) => {
    const newStruggleState = recordContentView(sessionId.current, contentId);
    setStruggleState(newStruggleState);
  };

  // When mastery updates
  const handleMasteryUpdate = (skillId: string, newMastery: number) => {
    const newStruggleState = recordMasteryChange(sessionId.current, skillId, newMastery);
    setStruggleState(newStruggleState);
  };

  // Handle intervention acceptance
  const handleInterventionAccept = async (intervention: InterventionType) => {
    switch (intervention) {
      case 'coach_session':
        // Open coach chat
        setShowCoach(true);
        break;
      case 'simpler_practice':
        // Load easier content
        await loadSimplerContent(currentSkillId);
        break;
      case 'alternative_explanation':
        // Fetch alternative explanation
        const alt = await getAlternativeExplanation(currentAtomId);
        setCurrentContent(alt);
        break;
      case 'prerequisite_review':
        // Navigate to prerequisite
        const prereq = await getPrerequisiteSkill(currentSkillId);
        navigateToSkill(prereq);
        break;
    }

    // Reset struggle state
    setStruggleState({ isStruggling: false, signals: [], overallSeverity: 'none', suggestedIntervention: 'none' });

    // Log intervention
    await logInteraction({ type: 'intervention_accepted', intervention, skillId: currentSkillId });
  };

  const handleInterventionDismiss = () => {
    setStruggleState({ ...struggleState, isStruggling: false });
    logInteraction({ type: 'intervention_dismissed', skillId: currentSkillId });
  };

  return (
    <div>
      {/* Existing learning UI */}
      ...

      {/* Proactive coach prompt */}
      <ProactivePrompt
        struggleState={struggleState}
        onAccept={handleInterventionAccept}
        onDismiss={handleInterventionDismiss}
      />
    </div>
  );
}
```

### 4. Add struggle context to coach conversations
When coach opens from intervention, provide context:

```typescript
// In coach chat component or service
const startCoachWithContext = async (struggleState: StruggleState) => {
  const context = {
    struggleSignals: struggleState.signals,
    currentSkill: struggleState.skillId,
    severity: struggleState.overallSeverity,
  };

  // Include in first message to coach
  await sendMessage({
    role: 'system',
    content: `The student appears to be struggling. Signals: ${JSON.stringify(context)}. Be supportive and use Socratic questioning to help them understand.`,
  });
};
```

## Verification Steps

1. `npm run build` - Must compile
2. `npm run lint` - Must pass
3. Manual test: Answer 3 questions wrong in a row
4. Verify: ProactivePrompt appears with "simpler practice" option
5. Manual test: Answer very quickly (< 5 seconds)
6. Verify: Prompt appears about taking time
7. Manual test: Re-read same content 3+ times
8. Verify: Alternative explanation offered
9. Manual test: Accept intervention, verify it works

## Do NOT Modify
- `src/lib/coach/socraticCoachService.ts` (just use it)
- Coach API routes
- Quiz/practice components (just call struggle functions)

## Output
When complete:
- Coach surfaces automatically when user struggles
- Multiple struggle signals detected
- Appropriate interventions offered
- User can accept or dismiss
