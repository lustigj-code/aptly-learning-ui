# Aptly Learning: Technical Due Diligence Assessment

**Date:** January 17, 2026
**To:** Founder / Engineering Team
**From:** Antigravity (Simulating Technical VC)
**Subject:** Codebase & Architecture Audit

---

## 🚀 Executive Summary: "A Ferrari Engine in a Honda Civic Chassis"

You are building something legitimately defenisble, but your delivery vehicle is currently holding you back.

The **Vision** (Adaptive Cognitive Learning Engine) is World Class.
The **Core Algorithms** (FSRS, Struggle Detection) are mathematically sound and differentiated.
The **UI Implementation** (`CoachLearningView`) is a technical liability that will prevent you from scaling this to a second course.

**Investable Verdict:** **YES**, but conditional on immediate refactoring of the learning loop.

---

## 🔍 The Dig

### 1. The "Good" (Your Moat)

*   **`fsrs.ts` is Real:** You aren't just calling OpenAI and hoping for the best. You have implemented a legitimate Spaced Repetition algorithm (FSRS v4.5) with stability/difficulty distinct metrics. This is your retention moat.
*   **`struggleDetector.ts` is Clever:** The heuristic triggers (time anomaly, consecutive wrong, rapid guessing) are excellent "sensory inputs" for an AI. Most edtech apps just look at "correct/incorrect". You are collecting *behavioral* data.
*   **`unifiedStore.ts`:** You successfully paid down the initial tech debt of fragmented stores. This gives you a clean, reactive state layer.

### 2. The "Bad" (Your Debt)

*   **`CoachLearningView.tsx` is a God Object:**
    *   **Diagnosis:** It is ~1,500 lines of mixed concerns. It handles UI rendering, session state, API sync, struggle detection listeners, and animation logic.
    *   **Risk:** You cannot A/B test different learning flows easily. You cannot easily swap in a "Test Mode" or "Review Mode" without hacking this one giant file.
    *   **Fix:** Needs immediate decomposition into `LearningSessionManager` (logic) and presentational components.

*   **The "AI" is currently "If/Else":**
    *   **Diagnosis:** Your vision promises a Socratic Tutor ("Sage"). Your code (`MainCoachChat` + `struggleDetector`) currently relies heavily on pre-canned responses (`getInterventionMessage`). The "AI" is effectively a fancy switch statement right now.
    *   **Risk:** Users will realize the "Coach" is a bot after 3 interactions. The "Magic" isn't there yet.
    *   **Fix:** The `stuggleDetector` needs to feed a *prompt*, not a *switch statement*.

*   **Hardcoded Content Coupling:**
    *   **Diagnosis:** `courseToConceptMap.ts` handles the graph logic, but it feels manually stitched.
    *   **Risk:** Adding "Course 2" looks like it requires a developer to manually write TypeScript files. This doesn't scale.

---

## 🛠 Required Pivot Plan (Next 2 Sprints)

1.  **Operation "Shatter the Monolith":**
    *   Extract the *Session Logic* from `CoachLearningView` into a hook: `useLearningSession()`.
    *   The View should just be: `view = f(state)`. Right now the View *is* the State.

2.  **Connect the Brain:**
    *   Stop determining the intervention message in `struggleDetector.ts`.
    *   Instead, have `struggleDetector` output a **Context Object** (`{ signals: ['rapid_guessing'], severity: 'high' }`).
    *   Feed that context into the LLM system prompt to generate the *actual* intervention.

3.  **Dynamic Skill Maps:**
    *   Move `courseToConceptMap` logic to Firestore/Backend. The frontend should just receive the graph, not define it.

---

## 💡 Final Thought

You have built the *components* of a revolutionary learning engine. They are just currently duct-taped together inside a single React component. Untangle the wires, and this flies.
