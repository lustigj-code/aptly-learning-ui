# Aptly Learning - Architecture Documentation

## Overview

Aptly Learning is an AI-powered, gamified learning platform designed for professional certification. The architecture is built around three core principles:

1. **AI-First Learning** - Sage (AI coach) tracks learner progress, identifies struggles, and provides personalized guidance
2. **Mastery-Based Progression** - Uses Bayesian Knowledge Tracing (BKT) and spaced repetition (FSRS) to ensure real learning
3. **Engaging UX** - Gamification elements (streaks, XP, badges) combined with Apple-level polish

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 16 (App Router) | Server components, routing, API routes |
| Language | TypeScript 5 | Type safety throughout |
| Styling | Tailwind CSS 4 | Utility-first styling with brand colors |
| Animations | Framer Motion | Smooth, accessible animations |
| State | Zustand | Client-side state with Firebase sync |
| Database | Firebase Firestore | NoSQL document database |
| Auth | Firebase Auth | Email/password + Google OAuth |
| AI | Google Gemini | AI coach and content generation |
| Monitoring | Sentry + PostHog | Error tracking and analytics |

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── api/                      # API routes
│   │   ├── chat/                 # AI chat endpoint
│   │   └── generate/             # Content generation
│   ├── dashboard/                # Main dashboard
│   ├── learn/                    # Learning experience (full-screen)
│   ├── progress/                 # Progress tracking
│   └── achievements/             # Badges & streaks
│
├── components/
│   ├── ui/                       # Core UI components (Button, Card, etc.)
│   ├── layout/                   # AppLayout, Sidebar, Header
│   ├── learning/                 # Learning-specific components
│   │   ├── CoachLearningView.tsx # Main learning orchestrator
│   │   ├── ContentRenderer.tsx   # Renders video/reading/quiz content
│   │   └── ChatOverlay.tsx       # AI coach chat interface
│   ├── dashboard/                # Dashboard widgets
│   └── onboarding/               # Onboarding flow components
│
├── lib/
│   ├── adaptive/                 # Adaptive learning algorithms
│   │   └── struggleDetection.ts  # Detects learner struggles
│   ├── ai/                       # AI integration
│   │   ├── geminiClient.ts       # Gemini API client
│   │   └── coachPrompts.ts       # System prompts for Sage
│   ├── firebase/                 # Firebase configuration
│   ├── mastery/                  # Mastery tracking
│   │   ├── bkt.ts                # Bayesian Knowledge Tracing
│   │   └── fsrs.ts               # Spaced repetition algorithm
│   ├── analytics/                # Analytics events
│   └── utils/                    # Utility functions
│
├── hooks/
│   ├── useProactiveCoach.ts      # Triggers coach based on struggles
│   ├── useHydration.ts           # Zustand hydration helper
│   └── useLearningNavigation.ts  # Learning flow navigation
│
├── store/
│   └── unifiedStore.ts           # Single source of truth for app state
│
├── content/                      # Course content
│   └── courses/
│       └── fsm/                  # Financial Statement Modeling course
│
└── types/                        # TypeScript definitions
    ├── index.ts                  # Core types
    └── course.ts                 # Course structure types
```

---

## Core Systems

### 1. Unified Store (`src/store/unifiedStore.ts`)

Single Zustand store managing all application state with Firebase sync.

**Key slices:**
- `user` - User profile, preferences, onboarding state
- `auth` - Firebase authentication state
- `progress` - Course progress, completed items, XP
- `streak` - Current streak, history, freeze tokens
- `ui` - Sidebar state, current lesson, chat visibility

**Firebase Sync:**
- Writes to Firestore on state changes (debounced)
- Reads from Firestore on auth state change
- Handles offline-first with local persistence

### 2. Learning System

**Course Structure:**
```
Course → Module → Lesson → Atom (content unit)
```

**Atom Types:**
- `video` - Video content with transcript
- `reading` - Markdown-based reading material
- `quiz` - Interactive assessment

**Learning Flow (`CoachLearningView.tsx`):**
1. Load lesson and atoms
2. Display current atom via `ContentRenderer`
3. Track interactions and time spent
4. On completion, advance to next atom
5. Update progress and mastery in store

### 3. AI Coach (Sage)

**Components:**
- `ChatOverlay.tsx` - Sliding chat panel
- `SmartCoachBar.tsx` - Contextual coach bar at bottom of learning view

**Context Awareness:**
The coach receives `LearningInsights` with:
- Quiz performance (scores, passed/failed)
- Struggle areas (topics with low mastery)
- Strong areas (topics mastered)
- Time spent by content type
- Coach interaction history

**Personalized Messages:**
`getPersonalizedCoachMessage()` generates context-aware messages based on:
- Current content type (video, reading, quiz)
- Recent performance
- Detected struggles
- Learning pace

### 4. Mastery Tracking

**Bayesian Knowledge Tracing (BKT) - `src/lib/mastery/bkt.ts`:**
- Tracks P(mastery) for each skill
- Updates on quiz answers (correct/incorrect)
- Parameters: P(L0), P(T), P(G), P(S)

**FSRS Spaced Repetition - `src/lib/mastery/fsrs.ts`:**
- Schedules review based on forgetting curve
- Implements Free Spaced Repetition Scheduler algorithm
- Parameters: difficulty, stability, retrievability

### 5. Struggle Detection (`src/lib/adaptive/struggleDetection.ts`)

Detects 5 struggle signals:
1. Repeated wrong answers on same topic
2. Long time on single question
3. Quick abandonment (frustration)
4. Low quiz scores
5. Excessive video rewinding

**Interventions:**
- Hint provision
- Alternative explanation
- Break suggestion
- Content simplification

### 6. Analytics (`src/lib/analytics/events.ts`)

Tracks key learning events:
- `lesson_started`, `lesson_completed`
- `quiz_attempted`, `quiz_passed`, `quiz_failed`
- `struggle_detected`, `intervention_shown`
- `coach_chat_opened`, `coach_question_asked`

---

## Key Data Types

### User Progress
```typescript
type UserProgress = {
  currentCourseId: string
  currentModuleId: string
  currentLessonId: string
  currentAtomId: string
  overallPercentage: number
  coursesCompleted: string[]
  modulesCompleted: string[]
  lessonsCompleted: string[]
  atomsCompleted: string[]
  assessmentScores: AssessmentScore[]
  masteryLevels: MasteryLevel[]
  totalTimeSpentMinutes: number
  xp: number
  streak: StreakData
}
```

### Learning Insights
```typescript
type LearningInsights = {
  // Quiz Performance
  quizAttempts: Array<{
    lessonId: string
    lessonTitle: string
    score: number
    passed: boolean
    timestamp: number
  }>
  struggleAreas: string[]
  strongAreas: string[]
  totalQuizzesPassed: number
  totalQuizzesFailed: number
  averageQuizScore: number

  // Time & Engagement
  timeSpentByType: { video: number; reading: number; quiz: number }
  sessionCount: number
  totalTimeSpent: number

  // Learning Pace
  lessonsCompletedToday: number
  averageTimePerLesson: number

  // Coach Interactions
  coachQuestionsAsked: number
  lastCoachQuestion?: string

  // Patterns
  consecutiveCorrectAnswers: number
  longestCorrectStreak: number
}
```

---

## API Routes

### POST `/api/chat`
AI coach conversation endpoint.

**Request:**
```json
{
  "messages": [...],
  "context": {
    "currentLesson": "Income Statement Basics",
    "atomType": "quiz"
  }
}
```

### POST `/api/generate`
Content generation endpoint (admin only).

---

## State Flow

```
User Action → Zustand Store → Firebase Sync → UI Update
                    ↓
            Analytics Event
                    ↓
           Struggle Detection
                    ↓
            Coach Intervention
```

---

## Design System

### Brand Colors
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Navy | `#0A004A` | `--navy` | Primary text, dark backgrounds |
| Teal | `#21A8B0` | `--teal` | Primary actions, links |
| Yellow | `#FFDE00` | `--yellow` | Celebrations, highlights |
| Purple | `#3B336E` | `--purple` | Secondary accents |
| Success | `#88B644` | `--success` | Positive feedback |
| Error | `#E84133` | `--error` | Error states |

### Animation Guidelines
- **Instant** (100ms): Micro-feedback, toggles
- **Standard** (200ms): Most transitions
- **Elaborate** (400ms): Page transitions, celebrations

### Touch Targets
- Minimum 44x44px on interactive elements
- 48px+ recommended for primary actions

---

## Testing Strategy

### Unit Tests (Vitest)
- Mastery algorithms (BKT, FSRS)
- Struggle detection logic
- Utility functions

### Integration Tests
- Store actions and Firebase sync
- API route handlers

### E2E Tests (Playwright)
- Onboarding flow
- Learning flow completion
- Quiz interactions

---

## Deployment

**Platform:** Vercel
**Branch Strategy:**
- `main` → Production
- `develop` → Staging
- Feature branches for development

**Environment Variables:**
- Firebase credentials (client + admin)
- Google Gemini API key
- Sentry DSN
- PostHog project key

---

## Future Roadmap

### Phase 1 (Current)
- Core learning experience
- AI coach integration
- Basic gamification

### Phase 2
- Full BKT integration with backend
- Cross-session analytics
- A/B testing framework

### Phase 3
- Mobile app (React Native)
- Offline mode
- Social learning features

---

## Contributing

1. Follow existing patterns and conventions
2. Use TypeScript strictly (no `any`)
3. Write tests for new features
4. Update this document for architectural changes

---

Built with care by the Aptly team.
