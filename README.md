# Aptly Learning

An AI-powered, gamified learning platform for professional certification. Built with Next.js 16, React 19, and Tailwind CSS.

**Design Philosophy**: *"Duolingo Meets Professional Certification"* - Combining proven learning science (BKT, FSRS) with engaging UX.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwindcss)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-ff69b4?logo=framer)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)
![Google Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google)
![Tests](https://img.shields.io/badge/Tests-577-green)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Core Systems](#core-systems)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Configuration](#configuration)
- [Deployment](#deployment)

---

## Features

### AI-Powered Learning Coach

- **Sage AI Coach** - Context-aware tutor with RAG-grounded responses
- **Socratic Mode** - Hierarchical intervention system (Tier 1: metacognitive questions, Tier 2: hints, Tier 3: worked examples)
- **Struggle Detection** - Automatically detects when learners are stuck and triggers appropriate interventions
- **Smart Coach Bar** - Integrated coaching at every step with contextual messages
- **Grounded Responses** - All coach responses are grounded in course content to prevent hallucinations

### Learning Science Engine

- **Bayesian Knowledge Tracing (BKT)** - Probabilistic skill mastery tracking
- **FSRS Spaced Repetition** - Modern spaced repetition algorithm (successor to SM-2)
- **Hybrid Prediction Model** - Blends BKT with ML features for optimal predictions
- **Skill Maps** - Prerequisite-based skill graphs with mastery gates
- **Zone of Proximal Development** - Adaptive difficulty targeting 36-70% success rate

### Gamification System

- **Daily Streaks** - Streak tracking with freeze protection
- **XP System** - Experience points for all learning activities
- **Badges & Achievements** - 20+ unlockable achievements
- **Progress Visualization** - Beautiful charts and mastery maps
- **Celebrations** - Confetti, animations, and milestone rewards

### Design Excellence

- **Apple-Level Polish** - Smooth 60fps Framer Motion animations
- **Responsive Design** - Mobile-first, touch-optimized interface
- **Accessible** - WCAG 2.1 AA compliant with proper ARIA labels
- **Offline Support** - Works offline with sync when reconnected

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages          Components         Hooks           Stores       │
│  ├─ /dashboard  ├─ CoachLearning   ├─ useCoach     ├─ authStore │
│  ├─ /learn      ├─ QuizAtom        ├─ useStreak    ├─ userStore │
│  ├─ /progress   ├─ ContentRender   ├─ useProgress  ├─ uiStore   │
│  └─ /coach      └─ MasteryMap      └─ useAdaptive  └─ syncStore │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  /api/coach      /api/progress      /api/courses     /api/auth  │
│  ├─ POST chat    ├─ POST sync       ├─ GET courses   ├─ session │
│  └─ GET history  ├─ POST complete   └─ GET [id]      └─ logout  │
│                  └─ GET resume                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  coachService    progressService    courseService    userService│
│  ├─ RAG query    ├─ updateProgress  ├─ getCourses    ├─ getUser │
│  ├─ generate     ├─ calculateXP     ├─ getAtoms      └─ update  │
│  └─ validate     └─ syncOffline     └─ getModules              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Firestore          LRU Cache           Redis (Upstash)│
│  ├─ users                    ├─ courses          ├─ rate limits │
│  ├─ courses                  ├─ skillMaps        └─ sessions    │
│  ├─ interventionStates       └─ userProgress                    │
│  └─ coachConversations                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Coach System Architecture

```
/src/lib/coach/
├── coachRouter.ts              # Model selection (Gemini/Sage/Socratic)
├── socraticHandler.ts          # Socratic mode with RAG grounding
├── interventionStateManager.ts # Persistent intervention state (Firestore)
├── ragCoordinator.ts           # Unified RAG query interface
├── tokenUsageTracker.ts        # Token usage monitoring
├── groundedCoach.ts            # Grounded response generation
├── responseValidation.ts       # Response quality validation
└── context/                    # Context building modules
    ├── UserProfileBuilder.ts
    ├── PerformanceAggregator.ts
    ├── ConversationContextBuilder.ts
    ├── EmotionalStateDetector.ts
    ├── LessonContextBuilder.ts
    ├── PersonalityStateBuilder.ts
    └── ContextStringBuilder.ts
```

### State Management Architecture

```
/src/store/
├── authStore.ts          # Firebase authentication state
├── userProfileStore.ts   # User profile, progress, XP, badges
├── uiStore.ts            # UI preferences (sidebar, theme)
├── syncStore.ts          # Offline/online sync status
├── celebrationStore.ts   # Celebration triggers
└── index.ts              # Barrel exports
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | Server components, API routes |
| **Language** | TypeScript 5 | Type safety |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Animations** | Framer Motion 11 | 60fps animations |
| **State** | Zustand | Lightweight state management |
| **Database** | Firebase Firestore | NoSQL document database |
| **Auth** | Firebase Auth | Authentication |
| **AI** | Google Gemini 2.0 | LLM for coaching |
| **RAG** | Custom + Firestore | Retrieval-augmented generation |
| **Cache** | LRU Cache + Upstash Redis | Performance optimization |
| **Testing** | Vitest | Unit and integration tests |
| **Monitoring** | Sentry + PostHog | Error tracking and analytics |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project
- Google AI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/lustigj-code/aptly-learning.git
cd aptly-learning

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# AI Services
GOOGLE_GENAI_API_KEY=

# Feature Flags (optional)
FEATURE_SOCRATIC=true
FEATURE_HYBRID_MODEL=false
FEATURE_RAG=true

# Rate Limiting (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── coach/              # AI coach endpoints
│   │   ├── courses/            # Course data endpoints
│   │   ├── progress/           # Progress tracking
│   │   ├── auth/               # Authentication
│   │   └── admin/              # Admin endpoints
│   ├── dashboard/              # Main dashboard page
│   ├── learn/                  # Learning experience
│   ├── progress/               # Progress tracking page
│   ├── mastery/                # Mastery map visualization
│   ├── coach/                  # Standalone coach page
│   └── achievements/           # Badges & achievements
│
├── components/
│   ├── ui/                     # Core UI components
│   │   ├── Button.tsx          # Button with variants
│   │   ├── Card.tsx            # Card components
│   │   ├── Input.tsx           # Form inputs
│   │   ├── ProgressBar.tsx     # Progress visualization
│   │   └── Toast.tsx           # Notifications
│   ├── layout/                 # Layout components
│   │   ├── AppLayout.tsx       # Main app layout
│   │   ├── Header.tsx          # Navigation header
│   │   └── Sidebar.tsx         # Side navigation
│   ├── learning/               # Learning components
│   │   ├── CoachLearningView   # Main learning view
│   │   ├── QuizAtom.tsx        # Quiz component
│   │   ├── ContentRenderer.tsx # Content type router
│   │   └── SwipeableAtomView   # Mobile swipeable view
│   ├── coach/                  # Coach UI components
│   ├── gamification/           # XP, streaks, badges
│   └── progress/               # Progress visualization
│
├── hooks/                      # Custom React hooks
│   ├── useCoach.ts             # Coach chat state
│   ├── useStreak.ts            # Streak tracking
│   ├── useProgress.ts          # Progress state
│   ├── useAdaptiveContent.ts   # Adaptive learning
│   └── useInteractionLogger.ts # Analytics logging
│
├── lib/
│   ├── auth/                   # Authentication utilities
│   │   ├── routeAuth.ts        # Unified route auth
│   │   └── apiAuth.ts          # API authentication
│   ├── cache/                  # Caching utilities
│   │   └── LRUCache.ts         # LRU cache with TTL
│   ├── coach/                  # Coach business logic
│   │   ├── coachRouter.ts      # Model selection
│   │   ├── socraticHandler.ts  # Socratic mode
│   │   ├── ragCoordinator.ts   # RAG queries
│   │   └── context/            # Context builders
│   ├── data/                   # Data access layer
│   │   └── userProgressLayer   # Unified progress
│   ├── errors/                 # Error handling
│   │   └── handlers.ts         # Unified error handler
│   ├── firebase/               # Firebase configuration
│   ├── mastery/                # Learning algorithms
│   │   ├── bkt.ts              # Bayesian Knowledge Tracing
│   │   ├── fsrs.ts             # FSRS spaced repetition
│   │   └── hybridPredictor.ts  # Hybrid model
│   ├── rag/                    # RAG system
│   ├── security/               # Security utilities
│   │   └── rateLimiter.ts      # Rate limiting
│   ├── services/               # Business logic
│   └── types/                  # Centralized types
│
├── store/                      # Zustand stores
│   ├── authStore.ts            # Auth state
│   ├── userProfileStore.ts     # User state
│   ├── uiStore.ts              # UI state
│   └── syncStore.ts            # Sync state
│
├── config/                     # Configuration
│   ├── constants.ts            # Magic numbers
│   ├── featureFlags.ts         # Feature toggles
│   └── messages.ts             # UI messages
│
└── data/                       # Course content
    ├── fsmCourse.ts            # Social media course
    └── courseRegistry.ts       # Course registry
```

---

## Core Systems

### 1. Mastery Prediction

The platform uses a hybrid approach combining classical learning science with ML:

```typescript
// Bayesian Knowledge Tracing (BKT)
import { updateMastery, predictCorrect, isMastered } from '@/lib/mastery/bkt';

const newState = updateMastery(skillState, isCorrect, params);
const pCorrect = predictCorrect(newState);  // 0-1 probability
const mastered = isMastered(newState, 0.95); // threshold check

// FSRS Spaced Repetition
import { scheduleFSRS, getNextReview } from '@/lib/mastery/fsrs';

const schedule = scheduleFSRS(card, rating); // rating: 1-4
const nextReview = getNextReview(schedule);  // Date

// Hybrid Model (BKT + ML features)
import { getPrediction } from '@/lib/mastery/predictionRouter';

const prediction = await getPrediction(userId, skillId, features);
```

### 2. AI Coach System

The coach uses RAG-grounded responses with hierarchical interventions:

```typescript
// Model Selection
import { selectCoachModel } from '@/lib/coach/coachRouter';

const model = selectCoachModel({
  preferSocratic: true,
  userId: 'user-123',
  context: { consecutiveWrong: 2 }
});
// Returns: 'socratic' | 'sage' | 'gemini'

// Socratic Mode Handler
import { handleSocraticMode } from '@/lib/coach/socraticHandler';

const result = await handleSocraticMode(
  userId,
  message,
  context,
  conversationHistory,
  lessonId
);
// Returns: { response, interventionTier, isGrounded, sourceCitations }

// Intervention State (persistent)
import { getOrCreateInterventionState } from '@/lib/coach/interventionStateManager';

const state = await getOrCreateInterventionState(userId, conceptId);
// state.currentTier: 1 | 2 | 3
// state.attemptCount: number
```

### 3. Progress Tracking

Progress is tracked at multiple levels with offline support:

```typescript
// User Progress Layer (unified)
import { getUserProgress, getAtomsCompleted } from '@/lib/data/userProgressLayer';

const progress = await getUserProgress(userId);
const completed = await getAtomsCompleted(userId, courseId);

// Progress Store
import { useProgress } from '@/store/userProfileStore';

const { addXP, completeAtom, completeLesson } = useProgress();
await completeAtom(courseId, lessonId, atomId, atomType, score);
```

### 4. Caching System

LRU caches with TTL prevent unbounded memory growth:

```typescript
import { LRUCache, memoizeAsync } from '@/lib/cache';

// Direct cache usage
const cache = new LRUCache<string, CourseData>({
  maxSize: 100,
  ttl: 15 * 60 * 1000  // 15 minutes
});

cache.set('course-1', courseData);
const data = cache.get('course-1');

// Function memoization
const getCourseWithCache = memoizeAsync(
  getCourse,
  (courseId) => courseId,
  { maxSize: 50, ttl: 10 * 60 * 1000 }
);
```

---

## API Reference

### Coach API

```typescript
// POST /api/coach - Send message to coach
{
  messages: [{ role: 'user', content: 'string' }],
  context: {
    currentCourse: string,
    currentLesson: string,
    atomType: 'reading' | 'video' | 'quiz' | 'practice',
    masteryLevel: number
  },
  type: 'chat' | 'practice_feedback' | 'quiz_help',
  conversationId?: string
}

// Response
{
  message: string,
  conversationId: string,
  isGrounded: boolean,
  sourceCitations: [{ chunkId, title, relevance }]
}
```

### Progress API

```typescript
// POST /api/progress/sync - Sync progress
{
  progress: {
    coursesStarted: string[],
    lessonsCompleted: string[],
    atomsCompleted: { [atomId]: AtomProgress }
  },
  timestamp: number
}

// POST /api/progress/complete-atom - Mark atom complete
{
  courseId: string,
  lessonId: string,
  atomId: string,
  atomType: string,
  score?: number
}
```

### Courses API

```typescript
// GET /api/courses - List all courses
// Response
{
  courses: [{
    id: string,
    name: string,
    description: string,
    modules: Module[],
    progress?: { completed: number, total: number }
  }]
}

// GET /api/courses/[courseId] - Get course details
```

---

## Testing

The project uses Vitest for testing with 577+ tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npm test src/lib/mastery/__tests__/bkt.test.ts

# Watch mode
npm run test:watch
```

### Test Structure

```
src/lib/
├── mastery/__tests__/
│   ├── bkt.test.ts              # BKT algorithm tests
│   ├── predictionRouter.test.ts # Routing tests
│   └── hybridTypes.test.ts      # Hybrid model tests
├── coach/__tests__/
│   └── coachRouter.test.ts      # Coach routing tests
└── auth/__tests__/
    └── apiAuth.test.ts          # Auth middleware tests
```

### Coverage Areas

| Area | Tests | Coverage |
|------|-------|----------|
| Mastery Prediction | 64 | BKT, FSRS, Hybrid |
| Coach Routing | 32 | Model selection, A/B tests |
| Authentication | 24 | Sessions, admin checks |
| Components | 50+ | UI components |

---

## Configuration

### Constants (`/src/config/constants.ts`)

```typescript
export const QUIZ = {
  DEFAULT_PASSING_SCORE: 70,
  CERTIFICATION_PASSING_SCORE: 80,
  MAX_ATTEMPTS: 3
};

export const MASTERY = {
  THRESHOLD_PROFICIENT: 0.7,
  THRESHOLD_MASTERED: 0.95
};

export const XP = {
  COMPLETE_READING: 10,
  COMPLETE_VIDEO: 15,
  COMPLETE_QUIZ: 25,
  CORRECT_ANSWER: 5
};
```

### Feature Flags (`/src/config/featureFlags.ts`)

```typescript
export const FEATURES = {
  SOCRATIC_MODE: process.env.FEATURE_SOCRATIC !== 'false',
  HYBRID_MODEL: process.env.FEATURE_HYBRID === 'true',
  RAG_GROUNDING: process.env.FEATURE_RAG !== 'false',
  OFFLINE_MODE: process.env.FEATURE_OFFLINE === 'true'
};
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Setup

1. Add all environment variables in Vercel dashboard
2. Enable Firebase Firestore indexes (see `firestore.indexes.json`)
3. Configure rate limiting with Upstash Redis

### Build Commands

```bash
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
npm run test      # Run tests
```

---

## Design System

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Navy** | `#0A004A` | Primary text, backgrounds |
| **Teal** | `#21A8B0` | Primary actions, links |
| **Yellow** | `#FFDE00` | Celebrations, highlights |
| **Purple** | `#3B336E` | Secondary accents |
| **Success** | `#88B644` | Positive feedback |
| **Error** | `#E84133` | Error states |

### Animation Timing

| Tier | Duration | Usage |
|------|----------|-------|
| **Instant** | 100ms | Micro-feedback, toggles |
| **Standard** | 200ms | Most transitions |
| **Elaborate** | 400ms | Page transitions, celebrations |

---

## Scripts

```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm test              # Run tests
npm run test:coverage # Tests with coverage
npm run test:watch    # Watch mode
```

---

## License

This project is proprietary software. All rights reserved.

---

## Acknowledgments

- Design inspired by [Duolingo](https://duolingo.com), [Headspace](https://headspace.com), and [Masterclass](https://masterclass.com)
- Learning science based on BKT (Corbett & Anderson, 1995) and FSRS (Open Spaced Repetition)
- UI components built with [shadcn/ui](https://ui.shadcn.com) patterns
- Animations powered by [Framer Motion](https://framer.com/motion)

---

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed technical architecture
- **[.claude/CLAUDE.md](./.claude/CLAUDE.md)** - Development workflow

---

Built with care by the Aptly team.
