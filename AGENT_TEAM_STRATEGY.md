# AGENT_TEAM_STRATEGY.md
## Ultimate Development Team for APTLY Learning App

---

## Executive Summary

Transform APTLY from 85% frontend-complete with disconnected backend into a **flawless, production-ready** learning platform using 6 specialized agents working through 5 phases.

---

## The Team: 6 Specialized Agents

### Agent 1: STATE ARCHITECT
**Expertise:** State Management, Data Synchronization

**Mission:** Unify `authStore` + `userStore` into single source of truth
- Merge dual store architecture
- Create Firestore sync layer
- Implement optimistic updates
- Design caching strategy

**Key Deliverables:**
- Unified store with Firebase + Firestore sync
- `useUser`, `useProgress` hooks
- Real-time data subscriptions

---

### Agent 2: API INTEGRATION SPECIALIST
**Expertise:** REST APIs, Client-Server Communication

**Mission:** Connect frontend to all 13 existing API routes
- Create `/src/lib/api/` service layer
- Implement React Query for data fetching
- Add auth token injection
- Build error handling utilities

**Key Deliverables:**
- API client with auth headers
- All API routes callable from frontend
- Loading/error state utilities

---

### Agent 3: AUTH FLOW ENGINEER
**Expertise:** Authentication, Session Management

**Mission:** Complete the auth lifecycle
- Wire Sign Out button
- Implement password reset flow
- Handle session persistence
- Protected route guards

**Key Deliverables:**
- Full signup → login → session → logout flow
- Working password reset
- Session persistence across refresh

---

### Agent 4: PROGRESS PERSISTENCE AGENT
**Expertise:** Learning Progress, Gamification

**Mission:** Make progress real and persistent
- Replace localStorage with Firestore
- Wire "Continue Learning" button
- Connect streak/badge logic to backend
- Implement XP accumulation

**Key Deliverables:**
- Progress survives logout/login
- Badges earned in real-time
- Streaks persist to backend

---

### Agent 5: PROFILE & SETTINGS AGENT
**Expertise:** User Profile, Preferences

**Mission:** Make settings functional
- Build Edit Profile modal
- Wire preferences to backend
- Implement photo upload
- Create Help & Privacy pages

**Key Deliverables:**
- All Settings buttons work
- Profile changes persist
- Photo upload functional

---

### Agent 6: COACH INTEGRATION AGENT
**Expertise:** AI Integration, Conversation UI

**Mission:** Bring the AI Coach to life
- Build chat interface component
- Wire to Gemini API
- Persist conversations
- Add context awareness

**Key Deliverables:**
- Functional coach chat panel
- Conversation history
- Context-aware responses

---

## Implementation Phases

### PHASE 1: Foundation (Days 1-3)
**Agents:** STATE ARCHITECT + AUTH FLOW ENGINEER

| Task | Impact | Effort |
|------|--------|--------|
| Unify stores | Critical | Medium |
| Wire Sign Out | High | Low |
| Session persistence | High | Medium |
| User document on signup | High | Low |

**Why First:** Everything depends on reliable auth and user state.

---

### PHASE 2: API Layer (Days 4-6)
**Agent:** API INTEGRATION SPECIALIST

| Task | Impact | Effort |
|------|--------|--------|
| Create API client | Critical | Medium |
| React Query setup | High | Medium |
| Wire all 13 routes | High | Medium |
| Error handling | Medium | Low |

**Why Second:** Need the pipes before wiring UI.

---

### PHASE 3: Core Experience (Days 7-10)
**Agents:** PROGRESS + PROFILE (Parallel)

| Task | Impact | Effort |
|------|--------|--------|
| Continue Learning | Very High | Medium |
| Progress persistence | Very High | Medium |
| Edit Profile modal | High | Medium |
| Settings persistence | High | Medium |
| Badge earning | High | Medium |

**Why Third:** Makes app feel "complete."

---

### PHASE 4: Enhanced Features (Days 11-13)
**Agent:** COACH INTEGRATION

| Task | Impact | Effort |
|------|--------|--------|
| Coach chat UI | High | High |
| Conversation persistence | High | Medium |
| Context awareness | Medium | Medium |

**Why Fourth:** Valuable but not blocking core flow.

---

### PHASE 5: Polish (Days 14-15)
**Agents:** All

| Task | Impact | Effort |
|------|--------|--------|
| Password reset | Medium | Low |
| Help pages | Low | Low |
| Error boundaries | Medium | Low |
| Loading skeletons | Medium | Low |

---

## Priority Matrix

```
                    HIGH IMPACT
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    │   Sign Out ★       │  Continue Learning │
    │   (QUICK WIN)      │  Progress Persist  │
    │                    │                    │
    │   Store Unify ★    │                    │
    │   (CRITICAL)       │                    │
    │                    │                    │
────┼────────────────────┼────────────────────┼────
    │                    │                    │
    │   Edit Profile     │  Coach Chat        │
    │                    │                    │
    │                    │                    │
    │   Password Reset   │  Help Pages        │
    │   (DEFER)          │  (DEFER)           │
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
                    LOW IMPACT
         LOW EFFORT ◄────┼────► HIGH EFFORT
```

---

## Dependency Graph

```
PHASE 1
┌─────────────┐     ┌─────────────┐
│ Store Unify │────▶│ Auth Flow   │
│ (Agent 1)   │     │ (Agent 3)   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
PHASE 2    ┌─────────────┐
           │ API Layer   │
           │ (Agent 2)   │
           └──────┬──────┘
                  │
       ┌──────────┼──────────┐
       ▼          │          ▼
PHASE 3 (Parallel)│
┌─────────────┐   │   ┌─────────────┐
│ Progress    │   │   │ Profile     │
│ (Agent 4)   │   │   │ (Agent 5)   │
└──────┬──────┘   │   └──────┬──────┘
       │          │          │
       └──────────┼──────────┘
                  ▼
PHASE 4    ┌─────────────┐
           │ Coach       │
           │ (Agent 6)   │
           └──────┬──────┘
                  │
                  ▼
PHASE 5    ┌─────────────┐
           │ Polish      │
           │ (All Agents)│
           └─────────────┘
```

---

## Quick Wins (Do First)

1. **Sign Out Button** (~1 hour)
   - File: `/src/app/settings/page.tsx`
   - Action: Add onClick to call `/api/auth/logout`

2. **Continue Learning** (~2 hours)
   - File: `/src/app/dashboard/page.tsx`
   - Action: Add router.push to current lesson

3. **Remove Mock Data Dependency** (~3 hours)
   - File: `/src/store/userStore.ts`
   - Action: Fetch from Firestore on auth

---

## Success Metrics

### Phase 1 Complete When:
- [ ] Sign Out works
- [ ] Session persists on refresh
- [ ] New signup creates Firestore doc
- [ ] Single unified store

### Phase 2 Complete When:
- [ ] All 13 API routes callable
- [ ] Auth tokens injected automatically
- [ ] Error handling consistent

### Phase 3 Complete When:
- [ ] Dashboard shows real data
- [ ] Continue Learning navigates correctly
- [ ] Progress persists to Firestore
- [ ] Badges earned automatically
- [ ] Edit Profile saves

### Phase 4 Complete When:
- [ ] Coach chat opens
- [ ] Conversations persist
- [ ] Context-aware responses

### Phase 5 Complete When:
- [ ] Password reset works
- [ ] All buttons functional
- [ ] No console errors
- [ ] Build passes

---

## Definition of "Done"

The app is **flawless** when:

✅ Every button does something meaningful
✅ All data persists to Firestore
✅ Auth flow is seamless
✅ AI Coach is accessible and helpful
✅ Progress survives logout/login
✅ Zero TypeScript/ESLint errors
✅ No console errors in production
✅ All loading states handled
✅ All error states graceful

---

## Estimated Timeline

| Phase | Duration | Parallel? |
|-------|----------|-----------|
| 1 | 2-3 days | No |
| 2 | 2-3 days | No |
| 3 | 3-4 days | Yes (2 agents) |
| 4 | 2-3 days | No |
| 5 | 1-2 days | Yes (all) |

**Total: 10-15 working days**

---

## Files to Create

```
/src/lib/api/
├── client.ts          # Base API client
├── userApi.ts         # User endpoints
├── progressApi.ts     # Progress endpoints
├── coachApi.ts        # Coach endpoints
└── badgeApi.ts        # Badge endpoints

/src/hooks/
├── useUser.ts         # User data hook
├── useProgress.ts     # Progress hook
└── useBadges.ts       # Badges hook

/src/components/
├── modals/
│   └── EditProfileModal.tsx
└── coach/
    ├── CoachChat.tsx
    └── CoachPanel.tsx
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Store migration data loss | Keep localStorage backup |
| API rate limiting | Use Upstash (already installed) |
| Gemini latency | Optimistic UI + typing indicators |
| Breaking changes | Feature flags + incremental rollout |

---

**Created:** December 26, 2025
**Status:** Ready to Execute
