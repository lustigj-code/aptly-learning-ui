# Aptly Learning - Agent Constitution

> **This document is the authoritative reference for all AI agents working on Aptly.**
> Read this FIRST before making any changes. Never speculate about code you haven't read.

AI-powered certification platform solving the "90% don't complete" problem through adaptive tutoring, mastery tracking, and gamification.

---

## 1. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 16 | App Router, Server Components, API Routes |
| **Language** | TypeScript | 5.x | Strict mode enabled |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS with custom design tokens |
| **Animation** | Framer Motion | 12.x | Physics-based animations, gestures |
| **State** | Zustand | 5.x | Client state with persistence |
| **Server State** | TanStack Query | 5.x | Caching, mutations, optimistic updates |
| **Database** | Firebase Firestore | - | NoSQL document store |
| **Auth** | Firebase Auth | - | Email/password + Google OAuth |
| **Storage** | Firebase Storage | - | Media files |
| **AI Model** | Gemini 2.0 Flash | - | Primary AI (via @google/generative-ai) |
| **AI Fallback** | HuggingFace Sage | - | Fine-tuned model (1000 req/month) |
| **Icons** | Lucide React | - | 560+ icons |
| **Testing** | Vitest + Playwright | - | Unit + E2E |

---

## 2. Directory Structure

```
aptly-learning/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth routes (login, signup, reset)
│   │   ├── api/                      # API routes
│   │   │   ├── auth/                 # Session management
│   │   │   ├── coach/                # AI coach endpoints
│   │   │   ├── interactions/         # Event logging
│   │   │   ├── mastery/              # BKT/FSRS endpoints
│   │   │   ├── progress/             # Progress sync
│   │   │   └── admin/                # Admin-only endpoints
│   │   ├── admin/                    # Admin dashboard
│   │   ├── dashboard/                # Main dashboard
│   │   ├── learn/                    # Learning view (full-screen)
│   │   ├── mastery/                  # Mastery map
│   │   ├── progress/                 # Progress tracking
│   │   ├── review/                   # Review queue
│   │   └── settings/                 # User settings
│   │
│   ├── components/
│   │   ├── ui/                       # Primitives (Button, Card, Input, etc.)
│   │   ├── layout/                   # AppLayout, Sidebar, Header
│   │   ├── learning/                 # CoachLearningView, ContentRenderer, atoms
│   │   ├── coach/                    # MainCoachChat, SageHUD, ProactivePrompt
│   │   ├── mastery/                  # MasteryMap, SkillNode, MasteryGate
│   │   ├── quiz/                     # Quiz components, hints
│   │   ├── effects/                  # PhotonEffect, MasteryOrb, CognitiveMesh
│   │   ├── motion/                   # AnimatedPage, AnimatedContent
│   │   ├── backgrounds/              # CognitiveMesh gradient
│   │   ├── dashboard/                # Dashboard widgets
│   │   ├── gamification/             # Streaks, XP, notifications
│   │   ├── accessibility/            # Announcer, KeyboardShortcuts
│   │   └── pwa/                      # OfflineIndicator, InstallPrompt
│   │
│   ├── hooks/                        # 35+ custom hooks
│   │   ├── useAuth.ts                # Firebase auth state
│   │   ├── useCoach.ts               # AI coach chat
│   │   ├── useCognitiveLoad.ts       # Struggle → UI adaptation
│   │   ├── useSplitBrain.ts          # Web Worker coordinator
│   │   ├── usePrefetchQueue.ts       # Atom prefetching
│   │   ├── useStreamingResponse.ts   # SSE streaming
│   │   ├── useReducedMotion.ts       # A11y motion preference
│   │   └── ...
│   │
│   ├── store/                        # Zustand stores
│   │   ├── authStore.ts              # Auth state
│   │   ├── userProfileStore.ts       # User data + sync
│   │   ├── uiStore.ts                # UI preferences
│   │   ├── syncStore.ts              # Offline queue
│   │   └── celebrationStore.ts       # Celebration queue
│   │
│   ├── lib/
│   │   ├── design-tokens.ts          # Colors, timing, springs, z-index
│   │   ├── motion/                   # Spring configs, motion helpers
│   │   │   ├── springs.ts            # SPRING.gentle, .snappy, .bouncy
│   │   │   └── index.ts
│   │   ├── mastery/                  # Learning algorithms
│   │   │   ├── bkt.ts                # Bayesian Knowledge Tracing
│   │   │   └── fsrs.ts               # Free Spaced Repetition Scheduler
│   │   ├── ai/                       # AI integration
│   │   │   ├── orchestrator.ts       # Provider management
│   │   │   └── coachPrompts.ts       # Prompt templates
│   │   ├── coach/                    # Coach logic
│   │   │   ├── struggleDetector.ts   # 8+ struggle signals
│   │   │   ├── socraticHandler.ts    # 3-tier interventions
│   │   │   └── coachRouter.ts        # Model selection
│   │   ├── agents/                   # Multi-agent system
│   │   │   └── orchestrator.ts       # Director → Specialists
│   │   ├── firebase/                 # Firebase setup
│   │   │   ├── config.ts             # Client SDK
│   │   │   ├── admin.ts              # Admin SDK (server only)
│   │   │   └── firestore.ts          # CRUD operations
│   │   └── api/                      # API clients
│   │
│   ├── workers/                      # Web Workers
│   │   └── masteryWorker.ts          # BKT/FSRS calculations (off main thread)
│   │
│   └── types/                        # TypeScript definitions
│
├── functions/                        # Firebase Cloud Functions
├── public/                           # Static assets
├── e2e/                              # Playwright E2E tests
├── docs/                             # Documentation
└── .claude/                          # Claude agent config
    ├── CLAUDE.md                     # This file (constitution)
    ├── HISTORY.md                    # Work log
    └── hooks/                        # Claude hooks
```

---

## 3. Design System

### 3.1 Color Palette

```typescript
// Primary
navy: '#0A004A'        // Dark backgrounds
teal: '#21A8B0'        // Primary actions, links

// Accent
yellow: '#FFDE00'      // Celebrations, highlights
purple: '#3B336E'      // Secondary accent

// Semantic
success: '#88B644'     // Correct, complete
error: '#E84133'       // Wrong, danger
warning: '#EC6726'     // Caution

// Neutrals
white: '#FFFFFF'
lightGrey: '#F1F0F0'
grey: '#8C8C8C'
richBlack: '#0A0A0A'
```

### 3.2 Animation Springs (Framer Motion)

```typescript
// src/lib/motion/springs.ts
export const SPRING = {
  // Apple-spec physics (heavy, premium feel)
  card: { type: 'spring', stiffness: 320, damping: 32, mass: 1 },
  exit: { type: 'spring', stiffness: 280, damping: 28, mass: 1 },
  snap: { type: 'spring', stiffness: 400, damping: 40, mass: 0.8 },
  celebrate: { type: 'spring', stiffness: 300, damping: 20, mass: 0.8 },
  micro: { type: 'spring', stiffness: 500, damping: 35, mass: 0.5 },

  // Timing tiers
  gentle: { stiffness: 300, damping: 20 },   // 200ms - cards, overlays
  snappy: { stiffness: 400, damping: 17 },   // 100ms - buttons, toggles
  bouncy: { stiffness: 500, damping: 15 },   // celebrations
};
```

### 3.3 Z-Index Layers

```typescript
Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
};
```

### 3.4 Glassmorphic Style (Sage HUD)

```css
.glassmorphic {
  backdrop-filter: blur(24px) saturate(180%);
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0px 20px 40px rgba(0, 0, 0, 0.25);
}
```

---

## 4. Critical Paths

### 4.1 Learning Flow

```
/learn?lesson=X → CoachLearningView → ContentRenderer → Atom
                                   ↓
                           AtomComplete → masteryWorker (Web Worker)
                                   ↓
                           BKT Update → FSRS Schedule → Firestore Sync
                                   ↓
                           XP Award → Celebration → Next Atom
```

### 4.2 AI Coach Flow

```
User Message → /api/coach → Rate Limit → Auth Check
                              ↓
                    AgentOrchestrator
                    ├── Director: Classify intent
                    ├── Route to: Content/Quiz/Remediation Agent
                    ├── RAG: Ground response in course content
                    └── Memory: Extract learning state
                              ↓
                    Response + Actions + Citations
```

### 4.3 Struggle Detection Flow

```
User Interaction → struggleDetector.ts
                   ├── consecutive_wrong (2/3/4+)
                   ├── time_anomaly (<5s guessing, >3min confused)
                   ├── reread (2/3/5+ times)
                   ├── mastery_regression (10%/20% drop)
                   └── text_atom_overtime (>3x reading time)
                              ↓
                   Confidence Score (0-1)
                              ↓
                   p > 0.6 → ProactivePrompt → SageHUD morphs
```

---

## 5. State Management

### 5.1 Zustand Stores

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `authStore` | Firebase auth state | None |
| `userProfileStore` | User data, progress, streak | localStorage + Firestore sync |
| `uiStore` | Sidebar, theme | localStorage |
| `syncStore` | Offline queue | None |
| `celebrationStore` | XP/badge celebration queue | None |

### 5.2 React Query Keys

```typescript
queryKeys = {
  user: (uid) => ['user', uid],
  userProgress: (uid) => ['userProgress', uid],
  reviewQueue: (uid) => ['reviewQueue', uid],
  masteryLevels: (uid) => ['masteryLevels', uid],
  conversation: (id) => ['conversation', id],
};
```

---

## 6. Mastery Algorithms

### 6.1 BKT (Bayesian Knowledge Tracing)

**Parameters (per skill):**
- `pL0`: Initial mastery probability (default 0.1)
- `pT`: Learning rate per attempt (default 0.3)
- `pG`: Guess probability (default 0.25)
- `pS`: Slip probability (default 0.1)

**Mastery threshold:** 0.95 (95% = mastered)

**Scale:** 0-1 probability

### 6.2 FSRS (Free Spaced Repetition Scheduler)

**Ratings:** 1=Again, 2=Hard, 3=Good, 4=Easy

**Score → Rating:**
- < 50 → 1, 50-70 → 2, 70-90 → 3, ≥90 → 4

**Card states:** new → learning → review → relearning

**Scale:** masteryLevel 0-100, stability in days, difficulty 1-10

---

## 7. Firestore Schema

```
users/{uid}
├── progress: { atomsCompleted[], lessonsCompleted[], xp, currentLevel }
├── streak: { currentStreak, longestStreak, freezesAvailable }
└── preferences: { learningPace, dailyGoalMinutes }

skillStates/{uid}/skills/{skillId}
├── pMastery: number (0-1)
├── attempts: number
├── history: Array<{ timestamp, correct, pMasteryAfter }>
└── lastAttemptAt: Timestamp

events/interactions/items/{eventId}
├── userId, atomId, conceptId
├── isCorrect, responseTimeMs
├── pMasteryBefore, pMasteryAfter
└── experimentVariants: Record<string, string>
```

---

## 8. API Endpoints

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/session` | POST | No | Create session cookie |
| `/api/coach` | POST | Yes | Main AI coach chat |
| `/api/coach/stream` | POST | Yes | SSE streaming responses |
| `/api/interactions/log` | POST | Yes | Log learning events |
| `/api/progress/sync` | POST | Yes | Sync atom/lesson completion |
| `/api/mastery/predict` | GET | Yes | Get mastery prediction |
| `/api/mastery/map` | GET | Yes | Get skill graph data |

---

## 9. Component Patterns

### 9.1 UI Primitives

All in `src/components/ui/`:
- `Button` - Variants: primary, secondary, ghost, danger, success, celebration
- `Card` - Variants: default, elevated, outlined, interactive, glass, gradient
- `Input` - Text input with validation states
- `Badge` - Labels and tags
- `ProgressBar` - Linear progress
- `Modal` - Dialog with z-index 50
- `Toast` - Notifications with z-index 80
- `MicroButton` - Button with micro-interactions
- `MicroCard` - Card with hover/tap effects

### 9.2 Learning Components

- `CoachLearningView` - Main learning orchestrator
- `ContentRenderer` - Routes to atom type components
- `AnimatedContent` - Transitions between atoms
- `ContentSkeleton` - Loading state per atom type
- `VideoPlayer` - Video with speed controls, keyboard shortcuts
- `MainCoachChat` - Full coach interface

### 9.3 Coach Components

- `SageHUD` - 4-state morphing HUD (pulse → thought → intervention → consciousness)
- `ProactivePrompt` - Struggle-triggered help prompt
- `ConversationHistoryPanel` - Past conversations sidebar

---

## 10. Working Rules

### 10.1 Before ANY Change

1. **Read the code** - Never speculate about code you haven't opened
2. **Check HISTORY.md** - See what was recently changed
3. **Run build first** - `npm run build` to catch existing errors

### 10.2 Making Changes

1. **Minimal changes** - Impact as little code as possible
2. **Check in first** - Ask before architectural changes, deletions, new deps
3. **Follow patterns** - Match existing code style in the file
4. **Use design tokens** - Colors from `design-tokens.ts`, springs from `springs.ts`

### 10.3 After Changes

1. **Run build** - `npm run build` must pass
2. **Run lint** - `npm run lint` must pass
3. **Log to HISTORY.md** - Document what you changed

---

## 11. Commands

```bash
npm run dev        # Development server (localhost:3000)
npm run build      # Production build (REQUIRED before stopping)
npm run lint       # ESLint check
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright E2E tests
```

---

## 12. Research Resources

### 12.1 NotebookLM Notebooks

1. **Aptly Learning Research** - 166 docs on adaptive learning, BKT, FSRS, gamification
   - URL: `https://notebooklm.google.com/notebook/58b571c0-54c8-4232-b75d-e24bb07d5e9a`
   - Topics: Knowledge tracing, spaced repetition, struggle detection, AI tutoring

2. **UI Best Practices 2026** - Frontend design trends, animation, Dynamic Island
   - URL: `https://notebooklm.google.com/notebook/f8a846c4-13e5-426b-8ac3-f8613d12f000`
   - Topics: Glassmorphism, morphing UI, spring physics, Bento grids

### 12.2 Brand Guidelines

- **Figma**: `https://www.figma.com/design/UB7XHZFFIgO5n7YbMDdF0j/Aptly-Brand-Guidelines`

---

## 13. Semantic Code Search (Code Index MCP)

> **AUTOMATIC USAGE:** All agents working on Aptly MUST use Code Index MCP for context gathering before planning or implementing changes. Runs 100% locally - no API keys needed.

### 13.1 Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `search_code_advanced` | Semantic code search | "Find authentication handlers", "Where is BKT calculated?" |
| `find_files` | Find files by pattern/name | Locate specific files or patterns |
| `get_file_summary` | Get file overview | Understand a file's purpose and exports |
| `get_symbol_details` | Get symbol information | Function signatures, class definitions |
| `find_references` | Find all usages | Before modifying, check what uses it |
| `get_project_structure` | Directory tree | Understanding project layout |
| `build_deep_index` | Build full index | Run once at session start for full symbol search |

### 13.2 Mandatory Usage Protocol

**AT SESSION START:**
```
1. Run `build_deep_index` to enable full symbol search
```

**BEFORE any implementation task:**
```
1. Run `search_code_advanced` with task description
   Example: "Find components related to mastery calculation"

2. Run `find_references` on key symbols
   Example: Find what components use masteryWorker

3. Run `get_file_summary` on files you'll modify
   Example: Understand bkt.ts before changing it

4. ONLY THEN start implementing
```

### 13.3 Example Workflows

**Task: "Add new struggle signal"**
```
Step 1: search_code_advanced("struggle detection signals")
Step 2: get_file_summary("src/lib/coach/struggleDetector.ts")
Step 3: find_references("struggleDetector")
Step 4: Now implement with full context
```

**Task: "Optimize mastery calculations"**
```
Step 1: search_code_advanced("BKT FSRS mastery calculation")
Step 2: find_references("masteryWorker")
Step 3: get_symbol_details("updateMastery")
Step 4: Now implement with full context
```

**Task: "Fix bug in learning flow"**
```
Step 1: search_code_advanced("learning flow content renderer")
Step 2: find_references("CoachLearningView")
Step 3: get_file_summary for all related components
Step 4: Now debug with full context
```

### 13.4 Auto-Invocation Rules

Agents MUST use Code Index MCP automatically when:

1. **Starting any task** - Search for related code first
2. **Before creating new files** - Check if similar exists
3. **Before modifying existing files** - Understand dependencies
4. **Debugging issues** - Search for related error handlers
5. **Architectural decisions** - Map current structure first

### 13.5 Configuration

Code Index MCP is configured in the Claude settings:
```json
{
  "code-index": {
    "command": "uvx",
    "args": ["code-index-mcp", "--project-path", "/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning"]
  }
}
```

**Note:** Runs 100% locally. Run `build_deep_index` at session start for full symbol search capabilities.

---

## 14. Product Requirements Document

> **The definitive specification for all Aptly development is in `.claude/PRD.md`**

This PRD is grounded in research from:
- **UI Best Practices 2026 Notebook** - Animation, glassmorphism, layout, accessibility
- **Aptly Learning Research Notebook** - BKT, FSRS, intervention timing, gamification

**Key Sections:**
1. Animation Physics (springs, timing budgets)
2. Liquid Glass / Glassmorphism 2.0
3. Bento Grid Layout
4. Sage HUD (Dynamic Island pattern)
5. Learning Intervention System
6. Mastery Visualization
7. Gamification UI Patterns
8. FSRS UI Specification
9. AI Coach Interface
10. Skeleton Loading Patterns

---

## 15. Current Focus

**Cognitive OS Transformation** - Converting Aptly from a functional learning platform into a "Cognitive OS" with:

1. Zero-latency architecture (prefetch queue + skeleton rendering)
2. Split-brain design (Web Workers for BKT/FSRS)
3. Apple-level fluidity (physics-based springs 320/32/1)
4. Dynamic Island Sage (4-state morphing HUD)
5. Character streaming (token-by-token AI responses)
6. Photon effects (mastery completion feedback)
7. Adaptive gradients (cognitive load → background shift)

---

## 16. Hooks (Automatic)

- **SessionStart**: Shows production progress
- **PreToolUse**: Blocks edits to .env, firebase keys
- **PostToolUse**: Auto-lints TypeScript/JS files
- **Stop**: Quality gate (build + lint must pass)

---

**Last Updated:** 2026-01-17
**Version:** 3.1 (Cognitive OS + Code Index + PRD Edition)
