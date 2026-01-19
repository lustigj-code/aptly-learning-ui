# Aptly Master Rebuild Plan: The "Cognitive OS" Pivot
**Version:** 2.0 (The "Seamless" Edition)
**Status:** APPROVED FOR EXECUTION
**Objective:** Transform Aptly into a State-of-the-Art Cognitive OS.
**Core Mandate:** *Absolute Seamlessness. Zero Friction. Adaptive Perfection.*

---

## 1. The UX Physics: "Digital Fluidity"
*Why VCs will invest:* We are not building a website. We are simulating a physics-based learning environment.

### 1.1 The Spatial Stage (The "Flow State")
Content does not "load". It *arrives*.
*   **Zero-Latency Architecture:**
    *   **Prefetching:** `StageManager` loads `n+1` and `n+2` cards in a hidden DOM layer (opacity 0, pointer-events none).
    *   **Optimistic Transitions:** When user clicks "Next", the transition begins *instantaneously* (0ms). The logic runs in the background. If logic fails, we gently rollback, but we *never* block the UI for an API call.
*   **The Physics Engine (Framer Motion):**
    *   *Card Entry:* `spring(stiffness: 320, damping: 32, mass: 1)` – Heavy, premium feel. Not bouncy/cartoony.
    *   *Card Exit (Success):* `spring(stiffness: 280, damping: 28)` + `y: -100` + `scale: 0.9` -> Flies into the Mastery Orb.
    *   *Card Exit (Discard):* `spring(stiffness: 400, damping: 40)` + `x: -50` -> Snaps away quickly.
*   **The "Mesh" Background:**
    *   A WebGL fragment shader (via Fiber) or optimized CSS gradient mesh that shifts hue based on Cognitive Load.
    *   *Calm:* `#0F172A` (Navy) mixed with `#2DD4BF` (Teal) — Slow, deep breathing motion (6s cycle).
    *   *Struggle:* Introduces subtle pulses of `#F97316` (Orange) — Faster frequency (2s cycle).

### 1.2 The Sage HUD (The "Conscious Interface")
Sage is the "Soul" of the OS. A "Dynamic Island" glass capsule.
*   **Visual Spec:**
    *   **Material:** `backdrop-filter: blur(24px) saturate(180%)`.
    *   **Border:** `1px solid rgba(255, 255, 255, 0.15)`.
    *   **Shadow:** `0px 20px 40px rgba(0, 0, 0, 0.25)` (Soft, deep elevation).
*   **Seamless Morphing:**
    *   Sage is *never* undefined. It transitions effectively between 4 states using `layoutId` sharing for pixel-perfect morphs.
    *   **State 1: Pulse (Ambient)** -> A 40px circle. Breathing.
    *   **State 2: Thought (Processing)** -> Expands to 120px pill. A "Siri-like" waveform visualizes the AI *thinking*.
    *   **State 3: Intervention (Toast)** -> Expands Up. "Hint" appears.
    *   **State 4: Consciousness (Full)** -> Expands to Panel. Full conversation.

### 1.3 The Mastery Orb (The "Digital Synapse")
*   **Visual Spec:** A 3D Sphere rendered in Three.js (or high-fidelity CSS radial gradients to save bundle size).
*   **The "Connection" Moment:**
    *   Completing a concept isn't just a checkmark.
    *   A "Photon" particle travels from the *Card* to the *Orb* following a Bezier curve path.
    *   Impact: The Orb flashes/ripples. Haptic feedback (if mobile).
    *   *Subconscious Cue:* "I am building something."

---

## 2. Technical Architecture: "The Self-Healing Brain"

We are shifting from a "Component" mindset to a "System" mindset.

### 2.1 The Learning Session Engine (Zero-Latency State)
We execute a **Split-Brain Architecture**:
*   **The Fast Brain (UI Thread):** Handles animations, inputs, and optimistic updates. *Never blocks.*
*   **The Slow Brain (Web Worker / Async):** Handles AI logic, API syncing, and complex struggle analysis.

```
src/components/learning/
├── session/
│   ├── LearningSessionContext.tsx   <-- The Source of Truth
│   ├── LearningSessionLayout.tsx    <-- The Physics Wrapper
│   └── useLearningSession.ts        <-- The Fast Brain Hook
├── logic/
│   ├── CognitiveModel.ts            <-- The Slow Brain (User State Analysis)
│   └── ContentScheduler.ts          <-- FSRS Logic & Prefetcher
├── stage/
│   ├── StageManager.tsx             <-- Orchestrates Transitions
│   └── cards/                       <-- (Text, Video, Quiz, Interactive)
└── hud/
    └── SageHUD.tsx                  <-- The Dynamic Island
```

### 2.2 The Cognitive Model (Adaptive Perfection)
A "Struggle" is not a boolean. It is a multi-dimensional vector.
*   **Inputs:**
    *   `time_on_card`: (ms)
    *   `scroll_velocity`: (pixels/ms) - erratic scrolling = confusion.
    *   `click_rage`: (count) - anger/frustration.
    *   `tab_switches`: (count) - disengagement.
*   **The Adaptation Loop:**
    1.  **Monitor:** `CognitiveModel` listens to inputs at 60fps.
    2.  **Analyze:** Calculates `ProbabilityOfStruggle` (0.0 to 1.0).
    3.  **React:**
        *   `p > 0.4`: Background color shifts slightly warm (Subconscious).
        *   `p > 0.7`: Sage HUD changes simply from "Pulse" to "Eye Open" (Awareness).
        *   `p > 0.9`: Sage gently expands: "I noticed you're hesitating. Want a different angle?"

---

## 3. The Implementation Strategy (Meticulous Execution)

### Phase 1: The "Clean Room" (Architecture)
*   **Goal:** Establish the `LearningSession` with absolute state integrity.
*   **Checklist:**
    *   [ ] Implement `LearningSessionContext` (Zustand).
    *   [ ] Implement **Optimistic State Updates** (UI updates instantly, syncs later).
    *   [ ] Implement `usePrefetch` to ensure the next 3 cards are always in memory.
    *   *Validation:* Disconnect internet. The app must continue to work for at least 5 cards.

### Phase 2: The "Physics Lab" (Motion)
*   **Goal:** "Apple-Level" fluidity.
*   **Checklist:**
    *   [ ] Build `StageManager` with `AnimatePresence`.
    *   [ ] Tune Spring Physics to match the "Heavy/Premium" feel.
    *   [ ] Implement the "Photon" particle effect for mastery.
    *   *Validation:* No layout shifts. No jank. 60fps on mobile.

### Phase 3: The "Ghost in the Shell" (Sage AI)
*   **Goal:** Make Sage feel alive, not scripted.
*   **Checklist:**
    *   [ ] Build the Glassmorphic HUD with `layoutId` morphing.
    *   [ ] Connect `CognitiveModel` vector to Sage's visual state.
    *   [ ] Implement **Streaming Responses**: Sage's text appears character-by-character, synced with haptic taps.

### Phase 4: The "Final Polish" (Atmosphere)
*   **Goal:** Sound, Haptics, Light.
*   **Checklist:**
    *   [ ] Add subtle Sound FX (Swoosh, Pop, Hum) using `howler.js` (optional but recommended).
    *   [ ] Implement the Dynamic Gradient Mesh background.
    *   [ ] Add Micro-interactions (Button press scales to 0.95, hover glows).

---
## 4. Next Action
I will immediately begin **Phase 1: The Clean Room**.
I will construct the `LearningSessionContext` to be the rock-solid foundation for this entire experience.
