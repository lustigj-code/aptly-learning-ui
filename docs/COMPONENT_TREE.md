# Aptly Learning - Component Tree

> **Last Updated:** 2026-01-15 20:11 UTC
> **Total Components:** 130+ across 20 categories

---

## Component Hierarchy Overview

```
Providers (root)
├── ProvidersInner
│   ├── AuthProvider
│   ├── QueryProvider
│   ├── MonitoringProvider
│   ├── CelebrationProvider
│   ├── PWAProvider
│   └── AppLayout
│       ├── Sidebar
│       │   ├── InlineStreak
│       │   └── NavItems
│       ├── Header
│       │   ├── InlineStreak
│       │   └── UserAvatar
│       └── Main Content (children)
```

---

## 1. Layout Components (`/src/components/layout/`)

### AppLayout
**Purpose:** Main application wrapper with sidebar + header + content.

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

// Uses stores:
// - useUIStore (sidebar collapse)
// - useAuthStore (auth check)
// - useUser (user profile)
```

**Features:**
- Responsive sidebar (collapsible on desktop, drawer on mobile)
- Skip layout for: onboarding, root, /learn routes
- Loading states with skeleton UI

### Header
**Purpose:** Top navigation with greeting, notifications, profile.

```typescript
interface HeaderProps {
  showGreeting?: boolean;
  title?: string;
  subtitle?: string;
}
```

**Child Components:** `InlineStreak`, notification bell, user avatar dropdown

### Sidebar
**Purpose:** Primary navigation with collapsible state.

**Navigation Items:**
- Dashboard
- My Learning
- Progress
- Achievements
- Settings
- Chat with Coach (with notification badge)

---

## 2. UI Primitives (`/src/components/ui/`)

### Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'celebration';
  size: 'sm' | 'md' | 'lg' | 'xl';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
}
```

### Card
```typescript
interface CardProps {
  variant: 'default' | 'elevated' | 'outlined' | 'interactive' | 'glass' | 'gradient';
  padding: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

// Sub-components:
// CardHeader, CardTitle, CardDescription, CardContent, CardFooter
```

### Modal
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}
```

### Other Primitives
| Component | Purpose |
|-----------|---------|
| `ProgressBar` | Progress visualization |
| `Input` | Text input with focus states |
| `Toast` | Notification system |
| `Badge` | Small label component |
| `Skeleton` | Loading placeholder |
| `EmptyState` | Empty list state |
| `FocusTrap` | Accessibility focus trap |
| `VisuallyHidden` | Screen reader only |
| `SkipLink` | Skip to content |

---

## 3. Learning Components (`/src/components/learning/`)

### QuizAtom
**Purpose:** Interactive quiz with BKT mastery tracking.

```typescript
interface QuizAtomProps {
  atom: Atom & { type: 'quiz'; content: QuizContent };
  onComplete: (score: number) => void;
  onStruggleDetected?: () => void;
  difficulty?: number;  // 0-1 normalized
}
```

**State Management:**
```typescript
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [answers, setAnswers] = useState<Record<number, string>>({});
const [showingFeedback, setShowingFeedback] = useState(false);
const [allSkillUpdates, setAllSkillUpdates] = useState<SkillUpdate[]>([]);
const [newlyMasteredSkills, setNewlyMasteredSkills] = useState<string[]>([]);
const [consecutiveWrong, setConsecutiveWrong] = useState(0);
```

**Child Components:**
- `QuizOption` - Answer option
- `QuizProgress` - Progress indicator
- `SocraticQuizHint` - AI hints
- `DifficultyIndicator` - Visual difficulty

### VideoAtom
**Purpose:** Video learning with chapters and transcripts.

```typescript
interface VideoAtomProps {
  atom: Atom & { type: 'video'; content: VideoContent };
  onComplete: () => void;
  isLoading?: boolean;
}
```

**Features:**
- YouTube embed extraction
- Auto-complete at 90% watched
- Chapter navigation
- Transcript display

### PracticeAtom
**Purpose:** Guided practice with AI coach feedback.

```typescript
interface PracticeAtomProps {
  atom: Atom & { type: 'practice'; content: PracticeContent };
  onComplete: () => void;
  coachAvailable?: boolean;
}
```

### AdaptiveSessionView
**Purpose:** Personalized daily learning session.

```typescript
interface AdaptiveSessionViewProps {
  userId: string;
  courseId: string;
  availableMinutes: number;
  onStartSession: () => void;
  onItemComplete: (itemId: string) => void;
}
```

**Sub-components:**
- `SessionOverview` - Session preview
- `PretestOffer` - Test-out option
- `AdaptiveReasoningBanner` - Why this content
- `SkipSuccessMessage` - Skip celebration

---

## 4. Mastery Components (`/src/components/mastery/`)

### MasteryMap
**Purpose:** Visual prerequisite graph of skills.

```typescript
interface MasteryMapProps {
  data: MasteryMapData;
  config?: Partial<MasteryMapConfig>;
  onNodeClick?: (nodeId: string) => void;
  showLegend?: boolean;
}

interface MasteryMapData {
  nodes: SkillNodeData[];
  edges: Edge[];
  currentSkillId?: string;
}
```

**Node Status Colors:**
| Status | Color |
|--------|-------|
| locked | grey |
| available | teal |
| active | orange |
| mastered | green |
| needs_review | orange |

### ReviewQueue
**Purpose:** Spaced repetition review session.

```typescript
interface ReviewQueueProps {
  userId: string;
  masteryRecords: ConceptMastery[];
  onMasteryUpdate: (conceptId: string, newMastery: number) => void;
  onComplete: () => void;
}
```

**Review States:**
```typescript
type ReviewState = 'idle' | 'reviewing' | 'showing_answer' | 'complete';
```

**Rating Buttons:**
- Again (score: 40)
- Hard (score: 60)
- Good (score: 80)
- Easy (score: 100)

### ConceptProgress
**Purpose:** Individual concept status card.

```typescript
interface ConceptProgressProps {
  mastery: ConceptMastery;
  showDetails?: boolean;
  onClick?: () => void;
}
```

### Other Mastery Components
| Component | Purpose |
|-----------|---------|
| `SkillNode` | Individual node in mastery map |
| `MasteryTrajectory` | Time-series mastery chart |
| `ReviewForecast` | FSRS schedule prediction |
| `MiniMap` | Compact skill overview |
| `MasteryGate` | Prerequisite gate |

---

## 5. Coach Components (`/src/components/coach/`)

### MainCoachChat
**Purpose:** Full chat interface with Sage AI coach.

```typescript
interface MainCoachChatProps {
  onMessageSent?: () => void;
  easyStartSection?: ReactNode;
  lessonContext?: {
    currentCourse: string;
    currentModule: string;
    currentLesson: string;
    atomType: string;
    atomContent?: string;
  };
  onQuizAnswer?: (answer: Answer) => void;
  onReady?: (api: CoachAPI) => void;
}
```

**Features:**
- Message history with user/assistant distinction
- Inline quiz support (`InlineQuiz`)
- Quick prompt suggestions
- Keyboard shortcuts (Enter/Shift+Enter)

### SocraticQuizHint (`/src/components/ai/`)
**Purpose:** Progressive 3-level hints for quizzes.

```typescript
interface SocraticQuizHintProps {
  question: QuizQuestion;
  userMastery: number;
  attemptNumber: number;
  onHintViewed: (level: number) => void;
}
```

**Hint Levels:**
1. Light hint (guiding question)
2. Medium hint (narrowed options)
3. Heavy hint (worked example)

---

## 6. Dashboard Widgets (`/src/components/dashboard/`)

### ReviewQueueWidget
**Purpose:** Dashboard card showing due reviews.

```typescript
interface ReviewQueueWidgetProps {
  userId: string | null;
  maxItems?: number;
}
```

**Urgency Indicators:**
| Status | Color |
|--------|-------|
| overdue | red |
| due_today | yellow |
| upcoming | green |

### Other Widgets
| Widget | Purpose |
|--------|---------|
| `ExamReadinessWidget` | Exam prep progress |
| `AIInsightsWidget` | AI learning recommendations |

---

## 7. Progress Components (`/src/components/progress/`)

### StreakCounter
**Purpose:** Display current streak.

**Exports:**
- `StreakCounter` - Large badge
- `InlineStreak` - Compact (Header/Sidebar)
- `StreakCalendar` - Calendar view

### ExportProgressReport
**Purpose:** Generate and export progress PDF.

**Exports:**
- `ExportProgressReport` - Main component
- `ReportPreview` - Preview before export

---

## 8. Gamification (`/src/components/gamification/`)

### NotificationCenter
**Purpose:** Achievement and milestone notifications.

**Notification Types:**
- Achievement unlocked
- Streak maintained
- Level up
- Badge earned

### XPBreakdown
**Purpose:** Show XP earned by activity type.

---

## 9. Celebration (`/src/components/celebration/`)

### CelebrationSystem
**Purpose:** Context provider for celebration animations.

**Exports:**
- `CelebrationProvider` - App wrapper
- `useCelebration` hook - Trigger celebrations
- `QuickCelebration` - Quick pop animation
- `StreakCelebration` - Streak milestone

**Trigger Events:**
- Mastery achieved
- Streak milestone
- Quiz pass
- Course completion

---

## 10. Admin (`/src/components/admin/`)

| Component | Purpose |
|-----------|---------|
| `OverviewPanel` | Platform metrics |
| `ExperimentPanel` | A/B testing control |
| `CohortAnalysis` | Learner segments |
| `InterventionEffectiveness` | AI impact |
| `RetentionAnalysis` | Retention curves |
| `MetricsChart` | Data visualization |
| `HybridModelStatus` | ML model health |
| `SkillMapEditor` | Edit skill graph |

---

## 11. PWA (`/src/components/pwa/`)

| Component | Purpose |
|-----------|---------|
| `PWAProvider` | Offline capability context |
| `InstallPrompt` | App install prompt |
| `UpdateNotification` | Update available |
| `OfflineIndicator` | Offline status |

---

## 12. Providers (`/src/components/providers/`)

### Provider Stack
```
Providers (root)
└── ProvidersInner (client-side)
    ├── AuthProvider (auth context)
    ├── QueryProvider (React Query)
    ├── MonitoringProvider (Sentry)
    ├── CelebrationProvider
    ├── PWAProvider
    └── AppLayout
```

---

## State Management by Component

### High-Usage Stores
| Component | Stores Used |
|-----------|-------------|
| `AppLayout` | useUIStore, useAuthStore, useUser |
| `Header` | useUser, useUIStore |
| `Sidebar` | useUIStore, useUser |
| `QuizAtom` | useInteractionLogger, useCoach |
| `ReviewQueue` | useUser, useCelebration |
| `MainCoachChat` | useCoach |

### Hook Usage Patterns
| Hook | Used By |
|------|---------|
| `useUser` | Most components |
| `useCoach` | CoachChat, QuizAtom |
| `useInteractionLogger` | QuizAtom, PracticeAtom, VideoAtom |
| `useTimeTracking` | All atom components |
| `useCelebration` | QuizAtom, ReviewQueue |
| `useStreak` | StreakCounter, Header |

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, drawer sidebar |
| sm | 640px+ | Two column where appropriate |
| md | 768px+ | Full sidebar visible |
| lg | 1024px+ | Wide layouts |

---

## Animation Patterns

All components use Framer Motion with consistent configs:

```typescript
// From design-tokens
const SPRING = {
  snappy: { type: 'spring', stiffness: 500, damping: 30 },
  gentle: { type: 'spring', stiffness: 300, damping: 25 },
};
```

---

## Accessibility Features

| Feature | Implementation |
|---------|----------------|
| Focus management | `FocusTrap` component |
| Screen reader | `VisuallyHidden` component |
| Skip navigation | `SkipLink` component |
| Keyboard shortcuts | `KeyboardShortcuts` component |
| ARIA labels | On all interactive elements |
| Touch targets | Min 44px on all buttons |

---

*This document is auto-updated on each commit via GitHub Action.*
