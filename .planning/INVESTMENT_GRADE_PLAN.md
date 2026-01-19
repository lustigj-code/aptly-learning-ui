# The Aptly "Cognitive OS" Transformation Plan
**Status:** DRAFT
**Target:** Investment Grade (Series A Ready)
**Timeline:** 6 Weeks to V2.0

---

## 1. The North Star: "Not a Course, A Cognitive Companion"

Current LMS platforms are **Passive Data Stores**. We are building an **Active Cognitive OS**.
The VC pitch is simple: *"Others host content. Sage understands how you learn it."*

### The "Investable" UX Vision
We ditch the "Sidebar + Content + Chatbot" layout. It feels like 2023.
We move to a **"Focus-First" Spatial UI**.

#### The new "Flow State" Interface
Imagine a UI that breathes with the learner.
1.  **The Stage (Center):** Where the content lives. But it's not a static page. It's a "Card" that enters/exits with physics (Spring animations).
2.  **The Sage HUD (Floating/Dynamic):** Not a sidebar. A "Dynamic Island" at the bottom-center or top-center.
    *   *Normal State:* Pulse indicator (listening/ready).
    *   *Struggle Detected:* Expands gently. "You've paused here for 2 minutes. Want a hint?"
    *   *Celebration:* Erupts into the full screen for mastery moments.
3.  **The Mastery Orb (Top Right):** A live visualization of the specific neuron you are building. It fills up as you master the concept.

---

## 2. Technical Architecture: "The Brain & The Body"

We must decouple the "Thinking" (AI/Logic) from the "Rendering" (UI).

### The "Body" (UI Refactor)
**Goal:** Shatter `CoachLearningView.tsx`.
**New Structure:**

```
src/components/learning/
├── session/
│   ├── LearningSessionProvider.tsx  <-- The Brain Context
│   └── useLearningSession.ts        <-- The Logic Hook
├── stage/
│   ├── ContentStage.tsx             <-- The Center Stage
│   ├── transitions/                 <-- Physics (Framer Motion)
│   └── cards/                       <-- TextCard, QuizCard, VideoCard
├── hud/
│   ├── SagePresence.tsx             <-- The Avatar/Status
│   ├── InterventionToast.tsx        <-- "Need a hint?"
│   └── DialogueOverlay.tsx          <-- Full chat mode
└── visuals/
    ├── MasteryOrb.tsx               <-- Realtime viz
    └── CelebrationEffects.tsx       <-- Confetti/Springs
```

### The "Brain" (AI Loop)
**Goal:** Move from "If/Else" to "Contextual Intelligence".

**The Cognitive Loop:**
1.  **Sensors (`struggleDetector`):**
    *   *Input:* Mouse velocity, time on card, wrong answer streak, tab switching.
    *   *Output:* `UserState { stress: 'high', focus: 'low', confidence: 0.4 }`
2.  **The Context Engine (`SageBrain`):**
    *   Aggregates: `UserState` + `ConceptGraph` + `ConversationHistory`.
    *   *Decision:* "Intervene" OR "Observe".
3.  **The Actuator:**
    *   If Intervene: Stream LLM response with *intent* (e.g., `<intent>SocraticHint</intent>`).
    *   UI renders specific component based on intent (e.g., Highlight specific text paragraph).

---

## 3. The Design System: "Neo-Socratic"
*Adhering to Aptly Brand (Navy/Teal/Purple/Yellow)*

**Typography:** `DM Sans` (Keep it. It's clean.)
**Visual Language:**
*   **Glassmorphism 2.0:** Sage's interface is "Glass on top of Content".
*   **Semantic Motion:**
    *   *Mastery:* Upward/Growing motions.
    *   *Struggle:* Slow/Breathing motions.
    *   *Error:* Lateral shake (gentle).
*   **The "Yellow" Highlight:** use `#FFDE00` Sparingly. Only for "Aha!" moments and key Call-to-Actions.

---

## 4. Execution Roadmap (6 Weeks)

### Sprint 1: Surgery (The Refactor)
*   **Objective:** Untangle `CoachLearningView`.
*   [ ] Create `useLearningSession` hook.
*   [ ] Move all state (progress, struggle, history) into React Context.
*   [ ] Create `ContentStage` component that accepts `currentAtom` as a prop.
*   *Result:* A clean codebase where we can swap UI without breaking logic.

### Sprint 2: The Sage HUD (UX Redesign)
*   **Objective:** Build the distinct factor.
*   [ ] Create the "Dynamic Island" component for Sage.
*   [ ] Implement "Struggle Triggers" that open the HUD automatically.
*   [ ] Replace standard chat with "Contextual Cards" (e.g., Sage offers 3 buttons: "Hint", "Explain", "Skip").
*   *Result:* It looks like a consumer app, not an LMS.

### Sprint 3: The Brain (Real AI)
*   **Objective:** Connect the wires.
*   [ ] Replace `getInterventionMessage` (hardcoded) with an approximate RAG/LLM call.
*   [ ] Feed `struggleDetector` context into the system prompt.
*   [ ] Implement "Streaming Thoughts" (Sage "thinking" UI).
*   *Result:* The user feels "seen".

---

## 5. The "Why This Wins" Slide
For the VC Deck:
> "Legacy EdTech is a library. Aptly is a tutor. We don't just serve content; we model the user's mind and adapt the interface in real-time. Our moat is the behavioral data loop that traditional LMS architectures cannot capture."
