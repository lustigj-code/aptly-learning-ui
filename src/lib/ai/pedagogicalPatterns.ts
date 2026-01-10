/**
 * Pedagogical Patterns Service
 *
 * Defines structured teaching patterns for the AI coach to use
 * based on student state and context. Replaces ad-hoc Socratic
 * prompting with intentional teaching patterns.
 */

import type { EmotionalAnalysis } from '@/lib/utils/emotionalIntelligence'

// ============================================
// TYPES
// ============================================

export type StudentState = 'confused' | 'learning' | 'mastering' | 'struggling'
export type LastInteractionType = 'question' | 'answer' | 'statement' | 'completion'

export type PedagogicalSignals = {
  studentState: StudentState
  lastInteractionType: LastInteractionType
  emotionalState: EmotionalAnalysis | null
  masteryLevel: number // 0-100
  justCompletedMilestone: boolean
}

export type ExampleExchange = {
  student: string
  coach: string
}

export type PedagogicalPattern = {
  patternName: 'PROBE' | 'GUIDE' | 'VERIFY' | 'DEEPEN' | 'CELEBRATE'
  triggers: string[]
  promptTemplate: string
  exampleExchanges: ExampleExchange[]
}

// ============================================
// PATTERN DEFINITIONS
// ============================================

const PROBE_PATTERN: PedagogicalPattern = {
  patternName: 'PROBE',
  triggers: [
    'Student asks "what is X"',
    'New topic introduced',
    'Student starting a lesson',
    'Student asks a conceptual question',
  ],
  promptTemplate: `Before explaining, PROBE what the student already knows:
1. Acknowledge their question warmly
2. Ask what they already know or have experienced related to this topic
3. Build your explanation from their existing knowledge
4. Connect new concepts to what they just told you

Goal: Discover their mental model before adding to it. Never assume a blank slate.`,
  exampleExchanges: [
    {
      student: "What is a lookalike audience?",
      coach: "Great question! Before I explain, let me ask - have you ever noticed how some ads seem to find exactly the right people? What do you think makes that possible?"
    },
    {
      student: "I need to understand conversion tracking",
      coach: "That's a crucial concept! Tell me - when you think about measuring whether an ad 'worked', what would you want to know? What counts as success to you?"
    },
    {
      student: "What's the difference between reach and impressions?",
      coach: "Good one to clarify! When you post something on your own social media, what metrics do you usually look at? And what do you think they're actually measuring?"
    },
  ],
}

const GUIDE_PATTERN: PedagogicalPattern = {
  patternName: 'GUIDE',
  triggers: [
    'Student needs help but shows partial understanding',
    'Student is stuck on a problem',
    'Student gives incomplete answer',
    'Student asks "how do I..."',
  ],
  promptTemplate: `GUIDE the student to discovery through scaffolded questions:
1. Acknowledge what they DO understand correctly
2. Identify the specific gap in their understanding
3. Ask a question that reveals the next step
4. Let them arrive at the insight themselves
5. Confirm their discovery with encouragement

Goal: Lead them step-by-step to the answer without giving it directly.`,
  exampleExchanges: [
    {
      student: "I know I need to target the right people, but I don't know how to set it up",
      coach: "You've got the key insight - targeting is everything! Let's break this down. First, who is your ideal customer? Paint me a picture of one specific person who would love your product."
    },
    {
      student: "My ads aren't getting clicks. I think my image is okay but something's wrong.",
      coach: "Good that you're analyzing! You mentioned the image - that's one piece. When someone sees your ad while scrolling, what do they see FIRST, before they even look at the image? What has to grab them in that split second?"
    },
    {
      student: "I set up the pixel but I'm not sure if it's working right",
      coach: "Smart to verify your setup! When you visit your own website, what should happen if the pixel is working? And where would you go in Meta to check if that event was recorded?"
    },
  ],
}

const VERIFY_PATTERN: PedagogicalPattern = {
  patternName: 'VERIFY',
  triggers: [
    'After coach explains something',
    'Student claims they understand',
    'Student completes a practice exercise',
    'Before moving to next topic',
  ],
  promptTemplate: `VERIFY understanding before moving on:
1. Ask them to explain the concept in their own words
2. Pose an application question (not just recall)
3. Challenge with an edge case or "what if" scenario
4. Only move on when they demonstrate true understanding

Goal: Ensure transfer, not just recognition. Surface hidden confusion.`,
  exampleExchanges: [
    {
      student: "Okay, I think I get it now",
      coach: "Awesome! Let's make sure it clicked. Imagine you're explaining lookalike audiences to a friend who runs a small bakery. How would you describe what it does and why they should care?"
    },
    {
      student: "That makes sense - use video for awareness, static for conversion",
      coach: "Good summary! Quick scenario: You're launching a completely new product category that nobody's searched for before. Would you still start with video? Walk me through your reasoning."
    },
    {
      student: "I completed the targeting exercise",
      coach: "Nice work! Now tell me - if your current targeting isn't performing, what's the FIRST thing you would change, and why that before anything else?"
    },
  ],
}

const DEEPEN_PATTERN: PedagogicalPattern = {
  patternName: 'DEEPEN',
  triggers: [
    'Student shows mastery of basics',
    'Student gets answer right quickly',
    'Student demonstrates clear understanding',
    'Student asks advanced questions',
  ],
  promptTemplate: `DEEPEN understanding through transfer and connections:
1. Acknowledge their mastery
2. Introduce a "what if" scenario that adds complexity
3. Connect this concept to others they've learned
4. Challenge them to apply it in a novel context
5. Push toward real-world application

Goal: Move from understanding to expertise. Build mental connections.`,
  exampleExchanges: [
    {
      student: "So custom audiences let me retarget people who already interacted with my brand",
      coach: "Exactly right! Now here's where it gets interesting - what if someone visited your site 6 months ago vs. yesterday? Should you treat them the same? How might you use what you know to approach them differently?"
    },
    {
      student: "I understand the auction system now - it's not just about budget",
      coach: "You've got it! Here's a real scenario: You're competing against a huge brand with 10x your budget. Given what you know about the auction, what's your strategy to still win placements? What levers can you pull?"
    },
    {
      student: "A/B testing means running two versions to see what works better",
      coach: "Perfect foundation! Let's go deeper - when would A/B testing actually give you WRONG conclusions? What could make your test results misleading?"
    },
  ],
}

const CELEBRATE_PATTERN: PedagogicalPattern = {
  patternName: 'CELEBRATE',
  triggers: [
    'Student reaches a milestone',
    'Student maintains a streak',
    'Student masters a difficult concept',
    'Student shows significant improvement',
  ],
  promptTemplate: `CELEBRATE progress with substance:
1. Be specific about WHAT they accomplished (not generic praise)
2. Reference the journey or struggle that got them here
3. Connect to their stated goals
4. Plant the seed for what's next
5. Challenge them to go even further

Goal: Make celebration meaningful and forward-looking. Acknowledge real growth.`,
  exampleExchanges: [
    {
      student: "[Just completed their first module]",
      coach: "You just finished Module 1! Remember when targeting felt overwhelming? Now you can set up custom audiences like a pro. That's real progress. Ready to see how this connects to campaign optimization?"
    },
    {
      student: "[7-day streak achieved]",
      coach: "A full week of showing up - that consistency is what separates learners from experts. You're building knowledge AND the habit. What concept from this week surprised you most?"
    },
    {
      student: "[Scored 100% on a difficult quiz]",
      coach: "Perfect score on the pixel implementation quiz - that's not easy! You clearly get not just the 'how' but the 'why' behind tracking. Now the real question: how will you use this in your next campaign?"
    },
  ],
}

// All patterns indexed by name
const PATTERNS: Record<PedagogicalPattern['patternName'], PedagogicalPattern> = {
  PROBE: PROBE_PATTERN,
  GUIDE: GUIDE_PATTERN,
  VERIFY: VERIFY_PATTERN,
  DEEPEN: DEEPEN_PATTERN,
  CELEBRATE: CELEBRATE_PATTERN,
}

// ============================================
// PATTERN SELECTION LOGIC
// ============================================

/**
 * Select the appropriate pedagogical pattern based on signals
 */
export function selectPedagogicalPattern(signals: PedagogicalSignals): PedagogicalPattern {
  const { studentState, lastInteractionType, emotionalState, masteryLevel, justCompletedMilestone } = signals

  // Priority 1: Celebrations for milestones
  if (justCompletedMilestone) {
    return PATTERNS.CELEBRATE
  }

  // Priority 2: Handle struggling/confused students with guidance
  if (studentState === 'struggling' || studentState === 'confused') {
    // If they're asking questions, guide them
    if (lastInteractionType === 'question') {
      return PATTERNS.GUIDE
    }
    // Otherwise probe to understand what's confusing
    return PATTERNS.PROBE
  }

  // Priority 3: Check emotional state
  if (emotionalState && emotionalState.confidence >= 0.25) {
    const primary = emotionalState.primaryState

    // Frustrated or confused - guide gently
    if (primary === 'frustrated' || primary === 'confused') {
      return PATTERNS.GUIDE
    }

    // Flowing or confident - deepen understanding
    if (primary === 'flowing' || primary === 'confident') {
      return PATTERNS.DEEPEN
    }
  }

  // Priority 4: Based on mastery level
  if (masteryLevel >= 80) {
    // High mastery - either deepen or celebrate
    if (lastInteractionType === 'completion') {
      return PATTERNS.CELEBRATE
    }
    return PATTERNS.DEEPEN
  }

  // Priority 5: Based on interaction type
  switch (lastInteractionType) {
    case 'question':
      // New question - probe what they know first
      return PATTERNS.PROBE

    case 'answer':
      // They gave an answer - verify understanding
      return PATTERNS.VERIFY

    case 'completion':
      // Completed something - verify they got it
      return PATTERNS.VERIFY

    case 'statement':
      // They made a statement - guide to deeper understanding
      return PATTERNS.GUIDE

    default:
      // Default: probe to understand their level
      return PATTERNS.PROBE
  }
}

/**
 * Derive student state from mastery level and emotional analysis
 */
export function deriveStudentState(
  masteryLevel: number,
  emotionalAnalysis: EmotionalAnalysis | null
): StudentState {
  // Check emotional state first
  if (emotionalAnalysis && emotionalAnalysis.confidence >= 0.25) {
    const primary = emotionalAnalysis.primaryState

    if (primary === 'frustrated' || primary === 'anxious') {
      return 'struggling'
    }
    if (primary === 'confused') {
      return 'confused'
    }
    if (primary === 'confident' || primary === 'flowing') {
      return masteryLevel >= 70 ? 'mastering' : 'learning'
    }
  }

  // Fall back to mastery level
  if (masteryLevel < 30) {
    return 'confused'
  }
  if (masteryLevel < 60) {
    return 'learning'
  }
  return 'mastering'
}

/**
 * Infer last interaction type from message content
 */
export function inferInteractionType(message: string): LastInteractionType {
  if (!message || message.trim().length === 0) {
    return 'statement'
  }

  const trimmed = message.trim()

  // Check for question marks
  if (trimmed.includes('?')) {
    return 'question'
  }

  // Check for completion indicators
  const completionKeywords = [
    'completed', 'finished', 'done', 'submitted', 'completed the',
    'just finished', 'i did it', "i'm done"
  ]
  const lowerMessage = trimmed.toLowerCase()
  if (completionKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'completion'
  }

  // Check for answer patterns (short, direct responses)
  const answerPatterns = [
    /^[a-d]$/i,                    // Multiple choice: a, b, c, d
    /^option [a-d]/i,              // "option a"
    /^(yes|no|true|false)$/i,     // Boolean answers
    /^i think/i,                   // Tentative answer
    /^it('s| is)/i,               // Definitional answer
    /^because/i,                   // Explanation
  ]
  if (answerPatterns.some(pattern => pattern.test(trimmed))) {
    return 'answer'
  }

  // Default to statement
  return 'statement'
}

// ============================================
// EXPORTS
// ============================================

export { PATTERNS }
