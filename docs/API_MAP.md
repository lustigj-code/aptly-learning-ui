# Aptly Learning - API Documentation

> **Last Updated:** 2026-01-15 08:37 UTC
> **Total Endpoints:** 63+ across 13 categories

---

## Quick Reference

| Category | Base Path | Auth | Purpose |
|----------|-----------|------|---------|
| [Auth](#1-authentication) | `/api/auth/*` | Variable | Session management |
| [Coach](#2-coach) | `/api/coach/*` | Token/Session | AI tutoring |
| [Courses](#3-courses) | `/api/courses/*` | None | Course content |
| [Progress](#4-progress) | `/api/progress/*` | Token | Learning progress |
| [Users](#5-users) | `/api/users/*` | Variable | User profiles |
| [Skills](#6-skills) | `/api/skills/*` | Token | BKT skill tracking |
| [Mastery](#7-mastery) | `/api/mastery/*` | Token | ML predictions |
| [Review](#8-review) | `/api/review/*` | Token | Spaced repetition |
| [Dashboard](#9-dashboard) | `/api/dashboard/*` | Token | Analytics |
| [Admin](#10-admin) | `/api/admin/*` | Admin | Management |
| [Interactions](#11-interactions) | `/api/interactions/*` | Token | ML training data |
| [Lessons](#12-lessons) | `/api/lessons/*` | None | Lesson content |
| [Experiments](#13-experiments) | `/api/experiments/*` | Token | A/B testing |

---

## Authentication Types

| Type | Header | Description |
|------|--------|-------------|
| **Bearer Token** | `Authorization: Bearer <token>` | Firebase ID token |
| **Session Cookie** | `Cookie: session=<token>` | Server-side session |
| **Admin** | Bearer + role check | Admin-only endpoints |
| **None** | - | Public endpoints |

---

## 1. Authentication

### POST `/api/auth/session`
Create secure session cookie from Firebase ID token.

**Request:**
```json
{ "idToken": "firebase-id-token" }
```

**Response:**
```json
{ "success": true, "message": "Session created" }
```

**Rate Limited:** 5 req/min per IP

---

### GET `/api/auth/session`
Check current session status.

**Response:**
```json
{ "authenticated": true }
```

---

### POST `/api/auth/logout`
Logout user, revoke session, clear cookies.

**Auth:** Required (Bearer token)

**Response:**
```json
{ "success": true, "message": "Logged out" }
```

---

## 2. Coach

### POST `/api/coach`
Main AI coach endpoint - Socratic tutoring.

**Auth:** Bearer token or Session

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What is CPM?" }
  ],
  "context": {
    "currentCourse": "AI at Work",
    "currentModule": "Module 1",
    "currentLesson": "Lesson 1",
    "atomType": "reading",
    "atomContent": "Content about CPM..."
  },
  "type": "chat | practice_feedback | quiz_help | summary",
  "conversationId": "optional-existing-id",
  "userId": "user-123",
  "lessonId": "lesson-id"
}
```

**Response:**
```json
{
  "message": "Great question! CPM stands for...",
  "conversationId": "conv-abc123",
  "tokensUsed": 450,
  "modelInfo": {
    "model": "gemini-pro",
    "variant": "socratic"
  },
  "pathModified": false
}
```

**Features:**
- Model selection (Gemini/Sage/Socratic)
- RAG grounding for accuracy
- Intervention tier tracking
- Training data logging

---

### GET `/api/coach/[conversationId]`
Retrieve conversation history.

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "conversation": {
    "id": "conv-abc123",
    "messages": [...],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### DELETE `/api/coach/[conversationId]`
Soft delete conversation.

**Response:**
```json
{ "success": true, "conversationId": "conv-abc123" }
```

---

## 3. Courses

### GET `/api/courses`
List all published courses with optional user progress.

**Query Params:**
- `userId` (optional) - Include user progress overlay

**Response:**
```json
{
  "courses": [
    {
      "id": "course-1",
      "title": "AI at Work",
      "description": "...",
      "modules": 5,
      "progress": {
        "completed": 3,
        "total": 5,
        "percentage": 60
      }
    }
  ]
}
```

**Performance:** Uses LRU cache, O(1) lookups

---

### GET `/api/courses/[courseId]`
Fetch single course with all modules and lessons.

**Response:**
```json
{
  "course": {
    "id": "course-1",
    "title": "AI at Work",
    "modules": [
      {
        "id": "module-1",
        "title": "Introduction",
        "lessons": [...]
      }
    ]
  }
}
```

---

### GET `/api/courses/[courseId]/modules/[moduleId]`
Fetch module with lessons and optional progress.

**Query Params:**
- `userId` (optional)

---

## 4. Progress

### POST `/api/progress/sync` ⭐ PRIMARY
Main progress sync from learning flow.

**Auth:** Session cookie (verifyAuth)

**Request:**
```json
{
  "type": "atom_complete | quiz_result | lesson_complete",
  "atomId": "atom-123",
  "lessonId": "lesson-456",
  "quizScore": 85
}
```

**Response:**
```json
{
  "success": true,
  "xpEarned": 50,
  "newLevel": 5,
  "overallPercentage": 45
}
```

**Features:**
- Cascading completion tracking
- Streak updates
- Interaction logging

---

### GET `/api/progress/resume`
Get resume state for mid-content resume.

**Auth:** Bearer token + IDOR protection

**Response:**
```json
{
  "resumeState": {
    "atomId": "atom-123",
    "atomType": "video",
    "videoTimestamp": 125,
    "quizQuestionIndex": 3
  }
}
```

---

### POST `/api/progress/resume`
Save resume state.

**Request:**
```json
{
  "userId": "user-123",
  "resumeState": {
    "atomId": "atom-123",
    "videoTimestamp": 125
  }
}
```

---

### GET `/api/progress/report`
Complete progress report for export.

**Query Params:**
- `userId` (required)

**Response:**
```json
{
  "report": {
    "totalXP": 5000,
    "level": 12,
    "completedCourses": 2,
    "skillMastery": {...}
  },
  "visualization": {
    "masteryHistory": [...]
  }
}
```

---

## 5. Users

### POST `/api/users/create-profile`
Create user profile after Firebase auth.

**Rate Limited:** 3 req/hour per IP

**Request:**
```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "onboardingCompleted": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

---

### PATCH `/api/users/update-profile`
Update user profile data.

**Request:**
```json
{
  "userId": "user-123",
  "name": "New Name",
  "avatar": "https://...",
  "preferences": {
    "notifications": true,
    "theme": "dark"
  }
}
```

---

## 6. Skills

### GET `/api/skills`
Get all skill states for current user.

**Auth:** Required

**Response:**
```json
{
  "states": [
    {
      "skillId": "skill-1",
      "skillName": "CPM Calculation",
      "pMastery": 0.85,
      "status": "learning"
    }
  ],
  "summary": {
    "mastered": 5,
    "learning": 12,
    "notStarted": 8
  }
}
```

---

### POST `/api/skills`
Update skill state after quiz answer (BKT).

**Request:**
```json
{
  "skillIds": ["skill-1", "skill-2"],
  "correct": true
}
```

**Response:**
```json
{
  "success": true,
  "updates": [
    {
      "skillId": "skill-1",
      "previousMastery": 0.75,
      "newMastery": 0.85,
      "isMastered": false
    }
  ]
}
```

---

### GET `/api/skills/ready`
Get skills in Zone of Proximal Development.

**Response:**
```json
{
  "almostMastered": [...],
  "readyToLearn": [...],
  "locked": [...],
  "mastered": [...]
}
```

---

## 7. Mastery

### GET `/api/mastery/map`
Skill map with user progress for visualization.

**Query Params:**
- `userId` (required)
- `courseId` (default: 'ai-at-work')

**Response:**
```json
{
  "nodes": [
    {
      "id": "skill-1",
      "name": "CPM",
      "mastery": 0.85,
      "status": "mastered",
      "position": { "x": 100, "y": 200 }
    }
  ],
  "edges": [
    { "from": "skill-1", "to": "skill-2" }
  ]
}
```

---

### GET/POST `/api/mastery/predict`
Get mastery predictions using hybrid model.

**Request (POST):**
```json
{
  "skillId": "skill-1",
  "features": {
    "difficulty": 0.7,
    "elapsedTime": 120
  }
}
```

**Response:**
```json
{
  "prediction": 0.78,
  "confidence": 0.92,
  "pathway": "hybrid",
  "coldStartPhase": false,
  "reasoning": "Based on 45 interactions..."
}
```

---

## 8. Review

### GET `/api/review/due`
Get items due for spaced repetition review.

**Query Params:**
- `limit` (default: 10)
- `forecast` (boolean) - Include 7-day forecast
- `maxMinutes` (default: 20)

**Response:**
```json
{
  "dueItems": [
    {
      "conceptId": "concept-1",
      "conceptName": "CPM",
      "urgency": "high",
      "daysOverdue": 2,
      "mastery": 0.65
    }
  ],
  "forecast": {
    "day1": 5,
    "day2": 3,
    ...
  },
  "optimalSessionMinutes": 15
}
```

---

### POST `/api/review/complete`
Record review result, update FSRS state.

**Request:**
```json
{
  "conceptId": "concept-1",
  "score": 80,
  "timeSpentSeconds": 45
}
```

**Response:**
```json
{
  "newMasteryLevel": 0.85,
  "nextReviewAt": "2024-01-15T10:00:00Z",
  "daysUntilNextReview": 7
}
```

---

## 9. Dashboard

### GET `/api/dashboard/insights`
ML-driven personalized learning insights.

**Query Params:**
- `userId` (required)

**Response:**
```json
{
  "insights": {
    "learningVelocity": {
      "atomsPerHour": 4.2,
      "trend": "improving"
    },
    "predictedCompletionDate": "2024-02-15",
    "confidence": 0.85,
    "strongestSkill": "CPM Calculation",
    "focusArea": "Attribution Models"
  },
  "modelInfo": {
    "model": "hybrid",
    "interactionCount": 156
  }
}
```

---

## 10. Admin

### POST `/api/admin/content/upload`
Upload course content from zip file.

**Auth:** Admin required

**Request:** Multipart form data with `file` (zip)

**Response:**
```json
{
  "jobId": "job-123",
  "courseId": "course-new",
  "stats": {
    "modules": 5,
    "lessons": 20,
    "atoms": 85
  }
}
```

---

### POST `/api/admin/reset-progress`
Reset user progress (admin only).

**Request:**
```json
{ "userId": "user-123" }
```

---

### GET/POST `/api/admin/experiments`
Manage A/B testing experiments.

---

## 11. Interactions

### POST `/api/interactions/log`
Log learning interactions for ML training.

**Auth:** Bearer token required

**Request:**
```json
{
  "interactions": [
    {
      "type": "quiz_answer",
      "skillId": "skill-1",
      "correct": true,
      "responseTimeMs": 5000,
      "difficulty": 0.7
    }
  ]
}
```

**Limits:** 1-100 interactions per request

---

## 12. Lessons

### GET `/api/lessons/[lessonId]`
Fetch lesson with all embedded atoms.

**Query Params:**
- `userId` (optional) - Include completion status

---

## 13. Experiments

### GET `/api/experiments/config`
Get experiment configuration for user.

### POST `/api/experiments/assign`
Assign user to experiment variant.

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "VAL_001",
    "message": "Missing required field: userId",
    "details": { "field": "userId" },
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

**Error Codes:**
| Code | Meaning |
|------|---------|
| `AUTH_001` | Authentication failed |
| `VAL_001` | Validation failed |
| `DATA_001` | Data not found |
| `QUOTA_001` | Rate limit exceeded |
| `FB_001` | Firebase error |
| `ERR_999` | Unknown error |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/session` | 5 | 1 minute |
| `/api/users/create-profile` | 3 | 1 hour |
| `/api/coach` | Message-based | Variable |
| Others | 100 | 1 hour |

---

*This document is auto-updated on each commit via GitHub Action.*
