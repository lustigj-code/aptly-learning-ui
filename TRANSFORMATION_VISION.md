# APTLY LEARNING: TRANSFORMATION VISION

## The Problem We're Solving

In 1984, Benjamin Bloom discovered that students receiving one-on-one tutoring performed **2 standard deviations better** than classroom students - meaning the average tutored student outperformed 98% of traditionally taught students. This is the "2 Sigma Problem."

The problem? One-on-one tutoring doesn't scale. Until now.

**Aptly's mission: Deliver Bloom's 2 sigma results at internet scale.**

---

## Current State: Honest Assessment

After deep analysis, the current Aptly codebase has:

### What's Working
- Solid tech foundation (Next.js 16, Firebase, Zustand)
- Good UI component library
- Gamification primitives (XP, streaks, badges)
- Basic learning content structure

### Critical Issues
1. **Coach is disconnected** - Generic chatbot, no lesson context
2. **Dual state management** - Data inconsistencies, sync bugs
3. **Preferences ignored** - Voice, learning style, goal all collected but unused
4. **No mastery gates** - Users can skip ahead without understanding
5. **No spaced repetition** - Linear progression, no review system
6. **Passive learning** - Reading ≠ understanding
7. **Missing feedback loops** - No notifications when badges earned

**The app feels "tacky" because it promises personalization but delivers generic content.**

---

## The Vision: Cognitive Learning Engine

We're not building another course platform. We're building a **Cognitive Learning Engine** that:

1. **Knows you** - Understands your knowledge gaps, learning style, and goals
2. **Adapts to you** - Adjusts difficulty, format, and pacing in real-time
3. **Teaches like the best tutor** - Socratic method, never gives answers
4. **Remembers for you** - Spaced repetition ensures long-term retention
5. **Celebrates with you** - Emotional connection drives motivation

---

## Architecture: Three Pillars

### Pillar 1: Vertical AI Tutor (codename: "Sage")

**Why "Vertical"?**
Generic LLMs like GPT-4 are generalists. A vertical AI is fine-tuned specifically for social media marketing education - it knows:
- Every Meta certification concept
- Common misconceptions and how to address them
- Real-world examples from actual campaigns
- How to scaffold complex topics

**Technical Approach:**

```
┌─────────────────────────────────────────────────────────────┐
│                    SAGE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Base LLM  │ -> │  Fine-tune  │ -> │   Domain    │     │
│  │  (Llama 3.1 │    │  on EdData  │    │  Expert AI  │     │
│  │   8B)       │    │             │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         v                  v                  v             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              CONTEXT INJECTION LAYER                │   │
│  │  - User's current mastery levels                    │   │
│  │  - Current atom content & objectives                │   │
│  │  - Recent quiz performance                          │   │
│  │  - Conversation history (last 10 messages)          │   │
│  │  - User's stated goal & learning style              │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         v                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PEDAGOGICAL LAYER                      │   │
│  │  - Socratic dialogue engine                         │   │
│  │  - Misconception detection                          │   │
│  │  - Scaffolding strategies                           │   │
│  │  - Hint generation (never full answers)             │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         v                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              RESPONSE GENERATION                    │   │
│  │  - Adaptive tone (based on user's emotional state)  │   │
│  │  - Domain-specific examples                         │   │
│  │  - Follow-up questions to check understanding       │   │
│  │  - Practice problem generation                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Socratic Dialogue Examples:**

```
❌ BAD (Current):
User: "What's a lookalike audience?"
Coach: "A lookalike audience is a targeting option that helps
        you reach new people similar to your existing customers."

✅ GOOD (Sage):
User: "What's a lookalike audience?"
Sage: "Good question! Let's think about this together.
       Imagine you have 1000 customers who love your product.
       What do you think they might have in common?"
User: "Maybe similar interests or demographics?"
Sage: "Exactly! Now, what if Facebook could find MORE people
       who share those same patterns? What would that be useful for?"
User: "Finding new customers who might also like my product?"
Sage: "🎯 You got it! That's precisely what a lookalike audience does.
       Based on what you just figured out, can you guess what data
       Facebook needs to create one?"
```

**Fine-tuning Data Sources:**
1. Meta Blueprint certification materials
2. High-quality tutoring transcripts (Socratic dialogues)
3. Common student Q&A pairs with expert responses
4. Misconception-correction pairs
5. Real social media marketing case studies

**Implementation Path:**
1. Start with Claude/GPT-4 + rich prompting (quick win)
2. Build evaluation dataset for tutor quality
3. Fine-tune Llama 3.1 8B on educational dialogues
4. Implement RLHF using student learning outcomes as reward

---

### Pillar 2: Mastery & Spaced Repetition Engine

**Why This Matters:**
Research shows:
- Spaced repetition: **30-50% better retention**
- Active recall: **25-40% better retention**
- Combined: **Synergistic effect** - deeper, more durable memory

**Current Problem:**
Aptly is linear - you complete Lesson 1, move to Lesson 2, never see Lesson 1 again. This guarantees forgetting.

**The Solution: FSRS Algorithm + Mastery Gates**

```
┌─────────────────────────────────────────────────────────────┐
│                MASTERY ENGINE                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  KNOWLEDGE GRAPH                                            │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│  │ Concept │ --> │ Concept │ --> │ Concept │               │
│  │   A     │     │    B    │     │    C    │               │
│  │ (prereq)│     │(depends │     │(requires│               │
│  │         │     │  on A)  │     │ A & B)  │               │
│  └─────────┘     └─────────┘     └─────────┘               │
│       │               │               │                     │
│       v               v               v                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MASTERY TRACKING                       │   │
│  │  concept_a: { mastery: 0.85, last_review: 2d ago }  │   │
│  │  concept_b: { mastery: 0.45, last_review: 5d ago }  │   │
│  │  concept_c: { mastery: 0.00, locked: true }         │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       v                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              FSRS SCHEDULER                         │   │
│  │  Uses Free Spaced Repetition Scheduler algorithm    │   │
│  │  - Predicts optimal review time per concept         │   │
│  │  - Adapts to individual forgetting curves           │   │
│  │  - Prioritizes items about to be forgotten          │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       v                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              DAILY REVIEW QUEUE                     │   │
│  │  "You have 5 concepts to review today"              │   │
│  │  1. Ad Objectives (due now, mastery declining)      │   │
│  │  2. Budget Types (due in 2 hours)                   │   │
│  │  3. Audience Targeting (due tomorrow)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Mastery Gates:**
- Can't unlock Concept C until Concepts A & B are ≥80% mastery
- Failing a quiz doesn't end the lesson - it triggers remediation
- Multiple attempts encouraged (different questions each time)
- "You're not ready for this yet" is replaced with "Let's strengthen your foundation first"

**Review Types:**
1. **Quick Recall Cards** - 30 seconds each, test single concepts
2. **Application Questions** - Real scenarios requiring multiple concepts
3. **Sage Conversations** - AI asks you to explain concepts back
4. **Practice Simulations** - Build actual ad campaigns

---

### Pillar 3: Emotional Learning Experience

**Why Emotions Matter:**
Learning is not purely cognitive. Motivation, confidence, and emotional connection determine whether someone:
- Shows up tomorrow
- Persists through difficulty
- Actually applies what they learn

**Current Character Problem:**
The owl mascot has "moods" but no personality. It's decoration, not relationship.

**The Solution: Character with Depth**

```
┌─────────────────────────────────────────────────────────────┐
│              CHARACTER SYSTEM: "SAGE"                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PERSONALITY TRAITS                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - Warm & encouraging (never condescending)         │   │
│  │  - Genuinely curious about YOUR success             │   │
│  │  - Has opinions (favorite campaigns, pet peeves)    │   │
│  │  - Remembers your past conversations                │   │
│  │  - Celebrates your wins like they're personal       │   │
│  │  - Admits when something is hard                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  EMOTIONAL INTELLIGENCE                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Detects:                                           │   │
│  │  - Frustration (repeated wrong answers)             │   │
│  │  - Confusion (long pauses, vague questions)         │   │
│  │  - Flow state (rapid correct answers)               │   │
│  │  - Disengagement (short sessions, skipping)         │   │
│  │                                                     │   │
│  │  Responds:                                          │   │
│  │  - Frustration → "This one trips everyone up..."    │   │
│  │  - Confusion → "Let me try explaining differently"  │   │
│  │  - Flow → "You're on fire! Ready for a challenge?"  │   │
│  │  - Disengagement → "5 min is better than 0 min"    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RELATIONSHIP PROGRESSION                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Day 1:   "Welcome! I'm Sage, your learning coach"  │   │
│  │  Day 7:   "You've been showing up! I noticed..."    │   │
│  │  Day 30:  "Remember when targeting confused you?"   │   │
│  │  Day 90:  "You've grown so much. Seriously."        │   │
│  │  Cert:    "I'm so proud. You earned this."          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Celebration System:**
```
MICRO CELEBRATIONS (every few minutes)
- Correct answer: Subtle "✓" with satisfying sound
- Streak continues: Small flame animation
- +XP: Floating number with gentle bounce

MEDIUM CELEBRATIONS (every session)
- Lesson complete: Confetti burst + Sage comment
- Daily goal hit: "You showed up. That's everything."
- Quiz passed: Badge animation + unlock sound

MAJOR CELEBRATIONS (milestones)
- 7-day streak: Full-screen celebration + shareable badge
- Module complete: Video message from Sage
- Certification ready: Epic animation + call-to-action
```

---

## Technical Implementation Roadmap

### Phase 1: Foundation Fix (Week 1-2)

**Priority: Fix what's broken before adding new**

1. **Unify State Management**
   - Delete `authStore.ts` and `userStore.ts`
   - Migrate all components to `useUnifiedStore`
   - Fix AppLayout to use correct store
   - Test Firestore sync end-to-end

2. **Fix Coach Context**
   - Inject real user progress into coach API
   - Send current atom content with structure
   - Include conversation history (last 10 messages)
   - Add performance metrics to context

3. **Close Feedback Loops**
   - Achievement notifications on badge earn
   - Fix time tracking (actually increment minutes)
   - Progress sync on atom complete (not debounced)

### Phase 2: Sage v1 (Week 3-4)

**Goal: Transform coach from chatbot to tutor**

1. **Rich Context System**
   ```typescript
   type SageContext = {
     user: {
       name: string
       goal: string
       experienceLevel: number
       masteryLevels: Record<string, number>
       strugglingConcepts: string[]
       recentQuizScores: number[]
     }
     lesson: {
       id: string
       title: string
       objectives: string[]
       currentAtom: {
         type: 'reading' | 'video' | 'quiz' | 'practice'
         content: object
         expectedOutcomes?: string[]
       }
     }
     conversation: {
       history: Message[]
       sessionGoal?: string
     }
   }
   ```

2. **Socratic System Prompt**
   ```
   You are Sage, a master tutor for social media marketing.

   NEVER give direct answers. Instead:
   1. Ask what the user already knows
   2. Build on their knowledge with leading questions
   3. Use real examples they can relate to
   4. Guide them to discover the answer themselves
   5. Confirm understanding with a follow-up question

   The user is currently studying: {lesson.title}
   Their current mastery of prerequisites: {user.masteryLevels}
   They're struggling with: {user.strugglingConcepts}

   Adapt your response to their level. If they're stuck,
   simplify. If they're breezing through, challenge them.
   ```

3. **Practice Atom Integration**
   - Sage evaluates practice responses against rubric
   - Provides structured feedback with score
   - Generates follow-up practice if needed

### Phase 3: Mastery System (Week 5-6)

1. **Knowledge Graph**
   - Map all concepts and prerequisites
   - Define mastery thresholds per concept
   - Build unlock logic for gated content

2. **FSRS Implementation**
   - Integrate ts-fsrs library
   - Track review history per concept per user
   - Generate daily review queue
   - Build review UI (quick cards)

3. **Adaptive Quizzes**
   - Multiple question pools per concept
   - Randomly select on each attempt
   - Increase difficulty as mastery grows

### Phase 4: Personalization (Week 7-8)

1. **Learning Style Adaptation**
   - Actually use video/reading preference
   - Show preferred format first, alternative available
   - Track which format leads to better outcomes

2. **Goal-Based Experience**
   - "Get certified" → Show exam prep prominently
   - "Learn for work" → Emphasize practical applications
   - "Career change" → Include industry context

3. **Difficulty Adaptation**
   - Beginners get more scaffolding
   - Experts can skip basics (test-out option)
   - Struggling users get remediation paths

### Phase 5: Vertical AI Fine-tuning (Week 9-12)

1. **Data Collection**
   - Log all Sage conversations with outcomes
   - Tag successful tutoring moments
   - Build misconception database

2. **Evaluation Framework**
   - Define metrics: learning gain, engagement, completion
   - A/B test Sage responses
   - Build human evaluation rubric

3. **Fine-tuning Pipeline**
   - Prepare training data in instruction format
   - Fine-tune Llama 3.1 8B using LoRA
   - Evaluate against base model
   - Deploy with fallback to Claude/GPT-4

---

## Success Metrics

**Learning Outcomes (Bloom's 2 Sigma Target)**
- Pre/post assessment score improvement: Target +2σ (d=2.0)
- Certification pass rate: Target 90%+
- Knowledge retention at 30 days: Target 80%+

**Engagement Metrics**
- Daily active learners: Target 60% of registered
- Average session length: Target 15+ minutes
- 30-day retention: Target 50%+
- Streak maintenance: Target 40% maintain 7+ day streak

**Coach Quality Metrics**
- Socratic ratio: Target 70%+ responses are questions
- User satisfaction: Target 4.5+/5 rating
- "Aha moment" frequency: Target 1+ per session

---

## What This Means for Users

### Before (Current State)
```
"I opened the app, clicked through some slides,
 answered quiz questions, got some XP.
 The AI chat thing didn't really help.
 I'm not sure I actually learned anything."
```

### After (Transformed)
```
"Sage noticed I was struggling with ad targeting
 and walked me through it step by step without
 just telling me the answer. When I finally got it,
 there was this moment of 'oh, THAT'S how it works!'

 Now every morning I have a few review cards to
 keep things fresh. My streak is at 23 days and
 I actually feel ready for the certification."
```

---

## Conclusion

Aptly isn't just a course platform - it's an opportunity to solve education's hardest problem.

The technology exists. The research is clear. The path is defined.

**What's needed:**
1. Fix the foundation (state management, feedback loops)
2. Transform the coach into a Socratic tutor
3. Implement spaced repetition for real retention
4. Build emotional connection through character
5. Fine-tune a vertical AI that knows this domain deeply

This is how we deliver Bloom's 2 sigma at scale.

---

## References

- [Bloom's 2 Sigma Problem](https://en.wikipedia.org/wiki/Bloom's_2_sigma_problem) - Original research
- [Training LLM-based Tutors](https://arxiv.org/html/2503.06424v1) - Fine-tuning for education
- [Spaced Repetition Research](https://www.researchgate.net/publication/397538205) - Cognitive science foundations
- [Khanmigo Architecture](https://ideausher.com/blog/khanmigo-like-ai-tutoring-platform/) - How Khan Academy built their tutor
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki) - Modern spaced repetition
- [EduAlign Framework](https://arxiv.org/abs/2507.20335) - Pedagogical alignment for LLMs
