/**
 * Context String Builder
 *
 * Builds the comprehensive context string for coach system prompts.
 * Formats all context data into a structured prompt.
 */

import {
  buildPersonalityContext,
  type PersonalityState,
} from '@/lib/character/sagePersonality'
import {
  buildRelationshipContextString,
  type RelationshipContext,
} from '@/lib/character/relationshipProgression'
import {
  buildEmotionalContext,
  type EmotionalAnalysis,
} from '@/lib/utils/emotionalIntelligence'
import type { PedagogicalPattern } from '@/lib/ai/pedagogicalPatterns'
import type { UserProfile } from './UserProfileBuilder'
import type { UserPerformance } from './PerformanceAggregator'
import type { LessonContext, AtomContent } from './LessonContextBuilder'
import type { ConversationHistory, ComprehensionState, AdaptiveExplanation } from './ConversationContextBuilder'

// ============================================
// TYPES
// ============================================

export interface ContextStringData {
  user: UserProfile
  performance: UserPerformance
  lesson: LessonContext | null
  currentAtom: AtomContent | null
  conversation: ConversationHistory | null
  masteryLevel: number
  adaptiveDifficulty: 'beginner' | 'intermediate' | 'advanced'
  suggestedApproach: string
  emotionalAnalysis: EmotionalAnalysis | null
  personalityState: PersonalityState | null
  relationshipContext: RelationshipContext | null
  ragContent: string | null
  pedagogicalPattern: PedagogicalPattern | null
  comprehensionState: ComprehensionState | null
  adaptiveExplanation: AdaptiveExplanation | null
  flowContext: string | null
}

// ============================================
// CONTEXT STRING BUILDER
// ============================================

/**
 * Build the comprehensive context string for coach system prompt
 */
export function buildContextString(data: ContextStringData): string {
  const sections: string[] = []

  // Personality Context (Sage's character)
  if (data.personalityState) {
    sections.push(buildPersonalityContext(data.personalityState))
  }

  // Relationship Context (history with student)
  if (data.relationshipContext) {
    sections.push(buildRelationshipContextString(data.relationshipContext))
  }

  // Emotional State Section (prioritize if detected with confidence)
  if (data.emotionalAnalysis && data.emotionalAnalysis.confidence >= 0.25) {
    sections.push(buildEmotionalContext(data.emotionalAnalysis))
  }

  // User Profile Section
  sections.push(`
=== STUDENT PROFILE ===
Name: ${data.user.name}
Goal: ${data.user.goal || 'Not specified'}
Experience Level: ${data.user.experienceLevel}% (${data.adaptiveDifficulty})
Learning Preference: ${data.user.learningStyle === 'video' ? 'Prefers video content' : data.user.learningStyle === 'reading' ? 'Prefers reading' : 'Mixed'}
Daily Goal: ${data.user.dailyGoalMinutes} minutes`)

  // Performance Section
  sections.push(`
=== PERFORMANCE DATA ===
Overall Progress: ${data.performance.overallProgress}%
Current Mastery Level: ${data.masteryLevel}%
XP Earned: ${data.performance.xp.toLocaleString()}
Current Streak: ${data.performance.currentStreak} days
Average Quiz Score: ${Math.round(data.performance.averageQuizScore)}%
Total Study Time: ${data.performance.totalTimeSpentMinutes} minutes

Lessons Completed: ${data.performance.lessonsCompleted.length}
Atoms Completed: ${data.performance.atomsCompleted.length}`)

  // Struggling/Strong Areas
  if (data.performance.strugglingConcepts.length > 0) {
    sections.push(`
Areas Needing Attention: ${data.performance.strugglingConcepts.join(', ')}`)
  }
  if (data.performance.strongConcepts.length > 0) {
    sections.push(`
Strong Areas: ${data.performance.strongConcepts.join(', ')}`)
  }

  // Current Lesson Section
  if (data.lesson) {
    sections.push(`
=== CURRENT LESSON ===
Course: ${data.lesson.courseName || data.lesson.courseId}
Module: ${data.lesson.moduleName || data.lesson.moduleId}
Lesson: ${data.lesson.title}
Objectives:
${data.lesson.objectives.map((o) => `  - ${o}`).join('\n')}
Estimated Time: ${data.lesson.estimatedMinutes} minutes`)
  }

  // Current Atom Section (if applicable)
  if (data.currentAtom) {
    sections.push(`
=== CURRENT CONTENT ===
Type: ${data.currentAtom.type}
Title: ${data.currentAtom.title}`)

    if (data.currentAtom.keyPoints && data.currentAtom.keyPoints.length > 0) {
      sections.push(`Key Points:
${data.currentAtom.keyPoints.map((k) => `  - ${k}`).join('\n')}`)
    }

    if (data.currentAtom.type === 'practice' && data.currentAtom.expectedOutcomes) {
      sections.push(`Expected Outcomes:
${data.currentAtom.expectedOutcomes.map((o) => `  - ${o}`).join('\n')}`)
    }

    if (data.currentAtom.type === 'practice' && data.currentAtom.rubric) {
      sections.push(`Evaluation Rubric:
${data.currentAtom.rubric.map((r) => `  - ${r.criterion} (${Math.round(r.weight * 100)}%)`).join('\n')}`)
    }

    // Include actual content for reading atoms (truncated if long)
    if (data.currentAtom.type === 'reading' && typeof data.currentAtom.content === 'string') {
      const truncatedContent =
        data.currentAtom.content.length > 2000
          ? data.currentAtom.content.substring(0, 2000) + '...[truncated]'
          : data.currentAtom.content
      sections.push(`
Content Being Studied:
${truncatedContent}`)
    }
  }

  // RAG Content Section (relevant curriculum material for the user's question)
  if (data.ragContent) {
    sections.push(`
=== RELEVANT COURSE MATERIAL ===
The following content from the FSM curriculum is relevant to the student's question:

${data.ragContent}

Use this content to inform your response, but remember:
- Don't quote directly unless teaching a specific concept
- Guide the student to discover insights through questions
- Reference the source lesson when helpful`)
  }

  // Verification Needed Section (when unverified concepts accumulate)
  if (data.comprehensionState?.shouldTriggerVerification) {
    sections.push(`
=== VERIFICATION NEEDED ===
Before continuing, verify the student's understanding of these concepts:
${data.comprehensionState.unverifiedConcepts.join(', ')}

Use the VERIFY pattern: Ask them to explain one concept in their own words,
or apply it to a scenario. Don't just ask "do you understand?" - that's useless.

If they demonstrate understanding, acknowledge it specifically.
If they struggle, don't re-explain yet - ask a simpler question to find the gap.`)
  }

  // Adaptive Explanation Section (when student is confused)
  if (data.adaptiveExplanation?.isConfused) {
    const { confusedAbout, triedStrategies, suggestedStrategy, strategyGuidance } = data.adaptiveExplanation
    sections.push(`
=== STUDENT NEEDS DIFFERENT APPROACH ===
The student seems confused${confusedAbout ? ` about: ${confusedAbout}` : ''}.

Already tried: ${triedStrategies.length > 0 ? triedStrategies.join(', ') : 'nothing yet'}

Try this strategy: ${suggestedStrategy.toUpperCase()}
${strategyGuidance}

DO NOT repeat the same explanation. If the first approach didn't work, a different
angle is needed. Acknowledge their struggle and try the new approach.`)
  }

  // Learning Flow State Section (coach awareness of session state)
  if (data.flowContext) {
    sections.push(`
${data.flowContext}`)
  }

  // Conversation History Section
  if (data.conversation && data.conversation.messages.length > 0) {
    sections.push(`
=== CONVERSATION CONTEXT ===
Session Goal: ${data.conversation.sessionGoal || 'General learning support'}
Previous Messages in This Session: ${data.conversation.messages.length}

Recent Conversation:
${data.conversation.messages
  .slice(-5)
  .map((m) => `[${m.role.toUpperCase()}]: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
  .join('\n')}`)
  }

  // Pedagogical Pattern Section (specific teaching approach for this interaction)
  if (data.pedagogicalPattern) {
    const pattern = data.pedagogicalPattern
    const exampleExchange = pattern.exampleExchanges[0] // Use first example
    sections.push(`
=== PEDAGOGICAL APPROACH ===
For this interaction, use the ${pattern.patternName} pattern:
${pattern.promptTemplate}

Example of this pattern in action:
Student: "${exampleExchange.student}"
Coach: "${exampleExchange.coach}"`)
  }

  // Teaching Approach Section
  sections.push(`
=== TEACHING APPROACH ===
${data.suggestedApproach}

IMPORTANT INSTRUCTIONS:
1. NEVER give direct answers - use Socratic questioning to guide discovery
2. Adapt complexity to the student's ${data.adaptiveDifficulty} level
3. Connect new concepts to their existing knowledge
4. Celebrate progress and acknowledge challenges
5. Be concise but thorough - respect their time
6. If they seem frustrated, acknowledge it and simplify
7. Always check understanding with follow-up questions`)

  return sections.join('\n')
}
