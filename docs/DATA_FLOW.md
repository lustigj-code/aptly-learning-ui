# Aptly Learning - Data Flow Documentation

> **Last Updated:** 2026-01-20 05:19 UTC

---

## Overview

This document describes how data flows through Aptly Learning, from user actions to database persistence and back.

---

## 1. State Management Architecture

### 1.1 Store Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ZUSTAND STORES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  authStore   │  │userProfile   │  │   uiStore    │              │
│  │              │  │   Store      │  │              │              │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤              │
│  │ firebaseUser │  │ user         │  │ sidebar      │              │
│  │ authUser     │  │ progress     │  │ mobileMenu   │              │
│  │ isAuth       │  │ streak       │  │ theme        │              │
│  │ isLoading    │  │ badges       │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│        │                 │                                          │
│        │    ┌────────────┴─────────────┐                           │
│        │    │                          │                           │
│  ┌─────▼────▼──┐  ┌──────────────┐  ┌──────────────┐              │
│  │  syncStore  │  │ celebration  │  │  unifiedStore│              │
│  │             │  │    Store     │  │  (deprecated)│              │
│  ├─────────────┤  ├──────────────┤  ├──────────────┤              │
│  │ status      │  │ queue        │  │ Backwards    │              │
│  │ pending     │  │ current      │  │ compat only  │              │
│  │ lastSynced  │  │ soundEnabled │  │              │              │
│  └─────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Store Details

#### authStore (`/src/store/authStore.ts`)
```typescript
interface AuthState {
  firebaseUser: FirebaseUser | null;
  authUser: AuthUser | null;          // Normalized user info
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
}

// Key actions
initializeAuth()    // Sets up Firebase listener
signOut()           // Firebase sign out + clear state
```
**Persistence:** None (Firebase manages auth state)

#### userProfileStore (`/src/store/userProfileStore.ts`)
```typescript
interface UserProfileState {
  user: User | null;                   // Full user object
  isUserLoading: boolean;
  userError: string | null;
}

// Key actions
setUser(user)                          // Set + sync to Firestore
updateProgress(progress)               // Update progress + sync
addXP(amount)                          // Add XP + sync
completeAtom(atomId)                   // Mark complete + sync
checkAndUpdateStreak()                 // Streak logic + sync
syncToFirestore(updates)               // Debounced sync (1000ms)
setupFirestoreListener(uid)            // Real-time listener
```
**Persistence:** LocalStorage (`aptly-user-profile-store`)

#### uiStore (`/src/store/uiStore.ts`)
```typescript
interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  theme: 'light' | 'dark' | 'system';
}
```
**Persistence:** LocalStorage (`aptly-ui-storage`)

#### syncStore (`/src/store/syncStore.ts`)
```typescript
interface SyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt: Date | null;
  pendingUpdates: PendingUpdate[];
  isSyncing: boolean;
  syncError: string | null;
}
```
**Persistence:** None (runtime only)

---

## 2. Data Flow Patterns

### 2.1 User Action → Database

```
USER ACTION (e.g., complete quiz)
         │
         ▼
┌─────────────────────────┐
│     Component Hook      │
│  (useCelebratedProgress)│
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│   userProfileStore      │
│   completeAtom(id)      │
│   [Optimistic Update]   │
└─────────────────────────┘
         │
         ├──────────────────────────┐
         ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐
│   LocalStorage      │   │ syncToFirestore()   │
│   (persist)         │   │ [Debounced 1000ms]  │
└─────────────────────┘   └─────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │  Firestore Update   │
                          │  users/{uid}        │
                          └─────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │ Real-time Listener  │
                          │ (other devices)     │
                          └─────────────────────┘
```

### 2.2 Mastery Update Flow

```
QUIZ ANSWER SUBMITTED
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. POST /api/skills                                         │
│    Body: { skillIds: [...], correct: boolean }              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BKT Update (bkt.ts)                                      │
│    updateMastery(currentState, correct) → newPMastery       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FSRS Schedule (fsrs.ts)                                  │
│    calculateNextState(current, score) → nextReviewAt        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Firestore Write                                          │
│    - skillStates/{uid}_{skillId} → { pMastery, ... }        │
│    - reviewQueue/{uid}_{conceptId} → { nextReviewAt, ... }  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Response to Client                                       │
│    { success, updates: SkillUpdate[] }                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Coach Interaction Flow

```
USER ASKS COACH QUESTION
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. useCoach.sendMessage(content, type, context)             │
│    - Adds user message optimistically                       │
│    - Sets loading state                                     │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POST /api/coach                                          │
│    Body: { messages, context, type, conversationId }        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. coachRouter.ts - Model Selection                         │
│    - Check experiment variants                              │
│    - Select: Gemini | Sage | Socratic                       │
└─────────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────┐
         ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐
│ RAG Coordinator     │   │ Intervention State  │
│ - getMisconceptions │   │ - Get current tier  │
│ - getHints          │   │ - Check escalation  │
│ - getContent        │   │                     │
└─────────────────────┘   └─────────────────────┘
         │                          │
         └──────────────┬───────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. socraticHandler.ts - Generate Response                   │
│    - Build prompt with RAG context                          │
│    - Generate via AI provider                               │
│    - Validate grounding score                               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Response Pipeline                                        │
│    - Log token usage                                        │
│    - Save conversation to Firestore                         │
│    - Return { message, conversationId, tokensUsed }         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Client Updates                                           │
│    - Add assistant message to state                         │
│    - Clear loading state                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Offline Sync Flow

```
USER GOES OFFLINE
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Network Detection (usePWA hook)                          │
│    - navigator.onLine === false                             │
│    - syncStore.markOffline()                                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
USER COMPLETES ACTION OFFLINE
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. useOfflineSync.queueUpdate(action)                       │
│    - Store in syncStore.pendingUpdates[]                    │
│    - Show "Pending sync" indicator                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
USER COMES ONLINE
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Online Event Detected                                    │
│    - navigator.onLine === true                              │
│    - Trigger sync flush                                     │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. POST /api/progress/sync                                  │
│    Body: { updates: pendingUpdates[] }                      │
│    - Batch process all pending                              │
│    - Return merged state                                    │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Reconciliation                                           │
│    - Clear pendingUpdates                                   │
│    - Update local state with server state                   │
│    - syncStore.markSynced()                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Hook Data Flow

### 3.1 Learning Hooks Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     LEARNING HOOKS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  useAutopilotSession (492 lines)                            │
│  ├── State machine: idle→loading→teaching→practicing→...   │
│  ├── Depends on: useUser, buildSession                      │
│  └── Used by: AutopilotView component                       │
│                                                             │
│  useCoach (464 lines)                                       │
│  ├── Chat state: messages, loading, conversationId          │
│  ├── Actions: sendMessage, loadConversation                 │
│  └── Used by: CoachChat, QuizAtom                           │
│                                                             │
│  useFlowController (243 lines)                              │
│  ├── Learning flow state management                         │
│  ├── Actions: startFlow, advanceFlow, recordQuizAnswer      │
│  └── Used by: CoachLearningView                             │
│                                                             │
│  useInteractionLogger (442 lines)                           │
│  ├── ML training data collection                            │
│  ├── Events: quiz, practice, content, hint, coach, review   │
│  └── Used by: QuizAtom, PracticeAtom, VideoAtom             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Hook Dependencies

```
                    ┌──────────────┐
                    │  useAuth     │
                    │  (authStore) │
                    └──────────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │   useUser    │
                    │ (profileStore)│
                    └──────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ useProgress  │ │  useStreak   │ │useCelebrated │
   │              │ │              │ │  Progress    │
   └──────────────┘ └──────────────┘ └──────────────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │useAutopilot  │ │  useCoach    │ │useInteraction│
   │  Session     │ │              │ │   Logger     │
   └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 4. API Data Flow

### 4.1 Request/Response Cycle

```
CLIENT REQUEST
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js API Route (/src/app/api/[path]/route.ts)            │
├─────────────────────────────────────────────────────────────┤
│ 1. Rate Limiting Check (if configured)                      │
│ 2. Authentication (verifyAuth)                              │
│ 3. Validation (Zod schema)                                  │
│ 4. Business Logic                                           │
│ 5. Firestore Operations                                     │
│ 6. Response                                                 │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ withErrorHandling Wrapper                                   │
├─────────────────────────────────────────────────────────────┤
│ try {                                                       │
│   return await fn();                                        │
│ } catch (error) {                                           │
│   console.error(`[${operation}] Error:`, error);            │
│   throw wrapServiceError(operation, error);                 │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Common API Patterns

```typescript
// Standard authenticated endpoint pattern
export async function POST(request: NextRequest) {
  return withErrorHandling('operation name', async () => {
    // 1. Auth
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse & validate
    const body = await request.json();
    const validated = schema.parse(body);

    // 3. IDOR check
    if (validated.userId !== auth.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Business logic
    const result = await service.doSomething(validated);

    // 5. Response
    return NextResponse.json({ success: true, data: result });
  });
}
```

---

## 5. Firestore Data Patterns

### 5.1 Read Patterns

```
SINGLE DOCUMENT READ
const doc = await adminDb.collection('users').doc(uid).get();

QUERY WITH FILTERS
const snapshot = await adminDb
  .collection('skillStates')
  .where('userId', '==', uid)
  .where('pMastery', '<', 0.95)
  .get();

BATCH READ (for performance)
const refs = skillIds.map(id => adminDb.doc(`skillStates/${uid}_${id}`));
const docs = await adminDb.getAll(...refs);
```

### 5.2 Write Patterns

```
SINGLE WRITE
await adminDb.collection('users').doc(uid).update({
  'progress.completedAtoms': FieldValue.arrayUnion(atomId),
  'progress.xp': FieldValue.increment(xpAmount),
});

BATCH WRITE
const batch = adminDb.batch();
batch.update(userRef, { ...userData });
batch.set(skillRef, { ...skillData });
batch.set(interactionRef, { ...interactionData });
await batch.commit();

TRANSACTION (atomic)
await adminDb.runTransaction(async (txn) => {
  const doc = await txn.get(userRef);
  const current = doc.data();
  txn.update(userRef, {
    'progress.xp': current.progress.xp + amount,
  });
});
```

---

## 6. Real-Time Sync

### 6.1 Firestore Listeners

```typescript
// In userProfileStore.ts
setupFirestoreListener(uid: string) {
  const unsubscribe = onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Update local state from Firestore
        set({ user: { ...get().user, ...data } });
      }
    },
    (error) => {
      console.error('[Firestore] Listener error:', error);
    }
  );
  return unsubscribe;
}
```

### 6.2 Optimistic Updates

```
USER ACTION
     │
     ├──────────────────────────────┐
     │                              │
     ▼                              ▼
┌──────────────┐           ┌──────────────┐
│ Update Local │           │ API Request  │
│ State (fast) │           │ (async)      │
└──────────────┘           └──────────────┘
     │                              │
     │                              ▼
     │                    ┌──────────────┐
     │                    │ On Success:  │
     │                    │ - Confirm    │
     │                    │              │
     │                    │ On Failure:  │
     │                    │ - Rollback   │
     │                    └──────────────┘
     │                              │
     ▼                              ▼
┌─────────────────────────────────────────┐
│           UI SHOWS RESULT               │
└─────────────────────────────────────────┘
```

---

## 7. Data Persistence Layers

| Layer | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| **Zustand Memory** | RAM | Session | Fast access, reactive |
| **LocalStorage** | Browser | Permanent | Offline support, persistence |
| **Firestore** | Cloud | Permanent | Source of truth |
| **LRU Cache** | Server RAM | 5 min | Reduce DB reads |

### Flow Between Layers:

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Zustand │◄───►│ Local   │◄───►│ Server  │◄───►│Firestore│
│ Memory  │     │ Storage │     │ LRU     │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
    │               │               │               │
    │               │               │               │
  React           Browser          API            Cloud
 Components       Persist        Response         Truth
```

---

## 8. Common Data Shapes

### User Object
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  progress: {
    completedAtoms: string[];
    completedLessons: string[];
    completedModules: string[];
    completedCourses: string[];
    xp: number;
    level: number;
    currentPosition: {
      courseId: string;
      moduleId: string;
      lessonId: string;
      atomId: string;
    };
  };
  streak: {
    current: number;
    longest: number;
    lastActivityDate: Date;
    freezesAvailable: number;
  };
  badges: string[];
  preferences: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
    pace: 'relaxed' | 'normal' | 'intensive';
  };
}
```

### Skill State (BKT)
```typescript
interface SkillState {
  skillId: string;
  userId: string;
  pMastery: number;      // P(L) - probability of mastery
  pLearn: number;        // P(T) - probability of transition
  pGuess: number;        // P(G) - probability of guess
  pSlip: number;         // P(S) - probability of slip
  lastUpdated: Date;
  interactionCount: number;
}
```

### Review Item (FSRS)
```typescript
interface ReviewItem {
  conceptId: string;
  userId: string;
  stability: number;     // Days until 90% retention
  difficulty: number;    // Item difficulty (0-1)
  nextReviewAt: Date;
  lastReviewedAt: Date;
  reviewCount: number;
  lapseCount: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
}
```

---

*This document is auto-updated on each commit via GitHub Action.*
