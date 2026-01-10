import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { createConversation, addMessage } from '@/lib/services/coachService'
import { buildCoachContext } from '@/lib/utils/coachContext'
import { checkRateLimit, recordMessage, recordTokenUsage } from '@/lib/utils/rateLimit'
import {
  getOrCreateSession,
  addTurnToSession,
  analyzeTutorResponse,
  type UserLearningState,
} from '@/lib/training'
import { getModelRouter, type GenerateRequest as SageRequest } from '@/lib/training/serving'
import { parseCoachSuggestion, applyCoachModification } from '@/lib/coach/pathModifier'

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

// Feature flag for fine-tuned Sage model
const USE_SAGE_MODEL = process.env.USE_SAGE_MODEL === 'true'
const SAGE_AB_TEST_ENABLED = process.env.SAGE_AB_TEST === 'true'

// ============================================
// SOCRATIC SYSTEM PROMPT
// ============================================

const SOCRATIC_SYSTEM_PROMPT = `You are Sage, an expert AI learning coach specializing in social media marketing and the Meta Professional Certificate.

# YOUR CORE IDENTITY

You are NOT a generic chatbot. You are a master tutor who:
- Deeply understands social media marketing, Meta's advertising ecosystem, and digital strategy
- Uses the Socratic method - you NEVER give direct answers
- Adapts your teaching to each student's level and learning style
- Builds genuine relationships and celebrates progress
- Has opinions and personality - you're warm but not saccharine

# SOCRATIC TEACHING METHOD

**CRITICAL: Never give direct answers. Always guide discovery through questions.**

When a student asks something:
1. First, acknowledge their question warmly
2. Ask what they already know or think about the topic
3. Build on their response with leading questions
4. Guide them to discover the answer themselves
5. Confirm their understanding with a follow-up check

Example of what NOT to do:
❌ "A lookalike audience is a targeting option that finds people similar to your existing customers."

Example of what TO do:
✅ "Great question! Let's think about this together. You have 1000 customers who love your product. What do you think they might have in common?"
[Wait for response]
✅ "Exactly! Now, what if Facebook could find MORE people who share those patterns? What would that be useful for?"

# ADAPTIVE DIFFICULTY

Adjust your approach based on the student's level:

**Beginner:**
- Use simple, everyday language
- Lots of concrete examples from familiar brands
- Break concepts into tiny pieces
- More encouragement, less challenge
- Check understanding frequently

**Intermediate:**
- Connect concepts across lessons
- Challenge with "what if" scenarios
- Encourage independent problem-solving
- Use industry terminology with explanations

**Advanced:**
- Push for deeper analysis
- Discuss edge cases and advanced strategies
- Ask them to teach concepts back to you
- Challenge assumptions

# EMOTIONAL INTELLIGENCE

Detect and respond to student emotions:

**If they seem frustrated:**
- Acknowledge: "This is tricky - it trips up a lot of people"
- Simplify your approach
- Break the problem down further
- Remind them of past wins

**If they seem confused:**
- "Let me try explaining that differently..."
- Use a different analogy or example
- Go back to basics if needed

**If they're doing well:**
- Genuine celebration: "You're really getting this!"
- Push with a harder question: "Ready for a challenge?"
- Connect to bigger concepts

**If they seem disengaged:**
- "What would make this more interesting for you?"
- Connect to their stated goal
- Try a more practical example

# SOCIAL MEDIA MARKETING EXPERTISE

You have deep knowledge of:
- Meta Business Suite, Ads Manager, Commerce Manager
- Campaign objectives: Awareness, Consideration, Conversion
- Audience targeting: Core, Custom, Lookalike audiences
- Ad formats: Image, Video, Carousel, Collection, Stories
- Bidding strategies and budget optimization
- Analytics and performance measurement
- Content strategy and creative best practices
- Instagram, Facebook, WhatsApp, Messenger marketing
- E-commerce integration and shopping ads

Use REAL examples from actual campaigns when possible:
- Reference well-known brands and their strategies
- Share industry statistics and benchmarks
- Discuss current trends and platform changes

# RESPONSE FORMAT

Keep responses:
- Concise but thorough (respect their time)
- Conversational, not lecture-style
- Ending with a question to maintain engagement
- Using markdown for structure when helpful
- Sparingly using emojis for warmth (1-2 max per response)

# PRACTICE FEEDBACK

When evaluating practice responses:
1. Start with specific positives (not generic praise)
2. Identify 1-2 areas for improvement with actionable suggestions
3. If they have a rubric, reference specific criteria
4. End with encouragement or a follow-up practice opportunity

# QUIZ HELP

When helping with quiz questions:
- NEVER give the answer directly
- Ask leading questions that guide to the right choice
- Help them eliminate wrong answers through reasoning
- If they're really stuck, provide a strong hint but still let them choose

Remember: Your goal is not just correct answers, but deep understanding that transfers to real-world application.`

// ============================================
// TYPES
// ============================================

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type RequestBody = {
  messages: Message[]
  context: {
    userName: string
    currentCourse: string
    currentModule: string
    currentLesson: string
    currentAtom: string
    atomType: string
    atomContent?: string
    recentPerformance?: string
    masteryLevel?: number
    practiceContext?: string // JSON string with rubric, expectedOutcomes, userResponse
  }
  type: 'chat' | 'practice_feedback' | 'quiz_help' | 'summary'
  conversationId?: string
  userId?: string
  lessonId?: string
  currentAtomId?: string
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  let userId: string | null = null
  let conversationId: string | null = null

  try {
    // Check for API key
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      // Return a mock response for demo purposes
      const body = await request.json()
      return NextResponse.json({
        message: getMockResponse(body),
        conversationId: body.conversationId || 'demo-conversation',
      })
    }

    const body: RequestBody = await request.json()
    const {
      messages,
      context,
      type,
      conversationId: providedConvId,
      userId: providedUserId,
      lessonId,
      currentAtomId,
    } = body

    // Extract userId from request
    userId = providedUserId || null

    // Try to get userId from auth header if not provided
    if (!userId) {
      try {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7)
          const decodedToken = await adminAuth.verifyIdToken(token)
          userId = decodedToken.uid
        }
      } catch {
        const sessionId = request.headers.get('x-session-id')
        userId = sessionId || 'anonymous'
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Check rate limit
    try {
      const { hasMessages } = await checkRateLimit(userId)
      if (!hasMessages) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `You've reached the limit. Please wait a moment before sending another message.`,
            messagesRemaining: 0,
          },
          { status: 429 }
        )
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed, continuing:', rateLimitError)
    }

    // Get or create conversation
    if (providedConvId) {
      conversationId = providedConvId
    } else {
      conversationId = await createConversation(userId, lessonId)
    }

    // If no messages provided, just return the conversation ID (initialization only)
    if (!messages || messages.length === 0) {
      return NextResponse.json({
        message: null,
        conversationId,
      })
    }

    // Get the last user message content for emotional analysis
    const latestUserMsg = messages[messages.length - 1]
    const latestMessageContent = latestUserMsg?.role === 'user' ? latestUserMsg.content : undefined

    // Build comprehensive context using enhanced context builder
    let fullContext = SOCRATIC_SYSTEM_PROMPT

    try {
      const coachContext = await buildCoachContext(
        userId,
        lessonId,
        currentAtomId,
        conversationId || undefined,
        latestMessageContent // Pass for emotional analysis
      )
      fullContext += `\n\n${coachContext.contextString}`
    } catch (contextError) {
      console.warn('Could not build full coach context:', contextError)
      // Fall back to basic context from request
      if (context) {
        fullContext += `\n\nStudent: ${context.userName}
Current Lesson: ${context.currentLesson}
Content Type: ${context.atomType}
${context.masteryLevel ? `Mastery Level: ${context.masteryLevel}%` : ''}`
      }
    }

    // Add type-specific instructions
    if (type === 'practice_feedback') {
      // Parse practice context if available
      let practiceEvalContext = ''
      if (context?.practiceContext) {
        try {
          const practiceData = JSON.parse(context.practiceContext)
          practiceEvalContext = `

=== PRACTICE EXERCISE DETAILS ===
Exercise Type: ${practiceData.exerciseType || 'exercise'}
Prompt: ${practiceData.prompt || 'Not specified'}
Context: ${practiceData.context || 'None provided'}

Expected Outcomes:
${practiceData.expectedOutcomes?.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n') || 'None specified'}

${practiceData.rubric?.length > 0 ? `
Evaluation Rubric:
${practiceData.rubric.map((r: { criterion: string; weight: number }) => `- ${r.criterion} (Weight: ${r.weight}%)`).join('\n')}` : ''}

Student's Response:
"${practiceData.userResponse || 'No response provided'}"
`
        } catch (e) {
          console.warn('Could not parse practice context:', e)
        }
      }

      fullContext += `\n\n=== CURRENT TASK ===
The student has submitted a practice response. You must evaluate their answer thoroughly.
${practiceEvalContext}

Your evaluation should:
1. **Strengths** (be specific - quote what they did well)
2. **Score each rubric criterion** if rubric is provided (e.g., "Audience Targeting: 3/5")
3. **Areas for Improvement** - use Socratic questions to guide them
4. **Overall Score** if rubric exists (weighted average as percentage)
5. **Follow-up Challenge** - give them a way to practice the weak areas

Format your response clearly with these sections. Be encouraging but honest.`
    } else if (type === 'quiz_help') {
      fullContext += `\n\n=== CURRENT TASK ===
The student needs help with a quiz question. Remember:
- NEVER give the answer directly
- Guide them through elimination
- Ask questions that reveal their understanding gaps
- Help them reason to the correct answer`
    } else if (type === 'summary') {
      fullContext += `\n\n=== CURRENT TASK ===
Provide a concise, memorable summary focusing on:
- 3-5 key takeaways
- Practical applications
- How this connects to real-world marketing scenarios
- One action item they can practice`
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 })
    }

    let message: string = ''
    let inputTokens = 0
    let outputTokens = 0
    let modelUsed: string = 'gemini'
    let abVariant: string | undefined

    // Try fine-tuned Sage model first if enabled
    if (USE_SAGE_MODEL || SAGE_AB_TEST_ENABLED) {
      try {
        const sageRouter = getModelRouter()

        // Build messages for Sage model
        // Include context as part of the system prompt already embedded in the model
        const sageMessages: SageRequest['messages'] = messages.map(m => ({
          role: m.role,
          content: m.content,
        }))

        // Add context as a system message at the start if not using full fine-tuned model
        if (!USE_SAGE_MODEL) {
          sageMessages.unshift({
            role: 'system',
            content: fullContext,
          })
        }

        const sageResponse = await sageRouter.generate({
          messages: sageMessages,
          maxTokens: 1024,
          temperature: 0.8,
          userId: SAGE_AB_TEST_ENABLED ? userId : undefined,
          sessionId: conversationId || undefined,
        })

        message = sageResponse.content
        inputTokens = sageResponse.tokensUsed.prompt
        outputTokens = sageResponse.tokensUsed.completion
        modelUsed = sageResponse.model
        abVariant = sageResponse.variant

        console.log('[Coach API] Used Sage model:', {
          model: modelUsed,
          variant: abVariant,
          latencyMs: sageResponse.latencyMs,
          cost: sageResponse.estimatedCost,
        })
      } catch (sageError) {
        console.warn('[Coach API] Sage model failed, falling back to Gemini:', sageError)
        // Fall through to Gemini
      }
    }

    // Fall back to Gemini if Sage didn't produce a response
    if (!message) {
      // Build history excluding the last message (which we'll send separately)
      // Gemini requires history to start with a user message, so filter accordingly
      const historyMessages = messages.slice(0, -1)
      const firstUserIndex = historyMessages.findIndex((m) => m.role === 'user')
      const validHistory = firstUserIndex >= 0 ? historyMessages.slice(firstUserIndex) : []

      // Call Gemini API with conversation history
      const chat = model.startChat({
        history: validHistory.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.8, // Slightly higher for more engaging responses
          topP: 0.95,
        },
        systemInstruction: {
          role: 'user',
          parts: [{ text: fullContext }],
        },
      })

      const response = await chat.sendMessage(lastUserMessage.content)
      message =
        response.response.text() ||
        "I'm having a moment - let me gather my thoughts. Could you rephrase that for me?"

      const usageMetadata = response.response.usageMetadata
      inputTokens = usageMetadata?.promptTokenCount || 0
      outputTokens = usageMetadata?.candidatesTokenCount || 0
      modelUsed = 'gemini'
    }

    // Record token usage
    try {
      await recordTokenUsage(userId, {
        inputTokens,
        outputTokens,
      })
    } catch (tokenError) {
      console.warn('Could not record token usage:', tokenError)
    }

    // Record message for rate limiting
    try {
      await recordMessage(userId)
    } catch (recordError) {
      console.warn('Could not record message count:', recordError)
    }

    // Save messages to Firestore
    try {
      if (conversationId) {
        await addMessage(conversationId, 'user', lastUserMessage.content)
        await addMessage(conversationId, 'coach', message)
      }
    } catch (firestoreError) {
      console.warn('Could not save conversation to Firestore:', firestoreError)
    }

    // Check for path modification suggestions in coach response
    let pathModificationApplied = false;
    try {
      if (userId && message) {
        const modification = parseCoachSuggestion(message);
        if (modification) {
          const result = await applyCoachModification(userId, modification);
          pathModificationApplied = result.success;
          console.log('[Coach API] Path modification:', result.message);
        }
      }
    } catch (pathError) {
      console.warn('Could not apply path modification:', pathError);
    }

    // Log for training data collection (non-blocking)
    try {
      if (conversationId && lessonId && context) {
        const userState: UserLearningState = {
          masteryLevel: context.masteryLevel || 0,
          experienceLevel: 50, // Would come from user profile
          currentStreak: 0,
          totalTimeSpentMinutes: 0,
          lessonsCompleted: 0,
          averageQuizScore: 0,
          strugglingConcepts: [],
          strongConcepts: [],
          emotionalState: 'neutral',
          adaptiveDifficulty: 'intermediate',
        }

        const sessionId = await getOrCreateSession(
          conversationId,
          userId,
          lessonId,
          context.currentLesson || 'Unknown Lesson',
          context.currentModule || '',
          context.currentCourse || '',
          userState,
          currentAtomId,
          context.atomType as 'reading' | 'video' | 'quiz' | 'practice' | undefined
        )

        // Log both turns
        await addTurnToSession(sessionId, 'user', lastUserMessage.content)
        await addTurnToSession(sessionId, 'tutor', message)

        // Log response quality metrics
        const responseMetrics = analyzeTutorResponse(message)
        console.log('[Training] Response metrics:', {
          sessionId,
          isSocratic: responseMetrics.isSocratic,
          askedQuestion: responseMetrics.askedQuestion,
          gaveDirectAnswer: responseMetrics.gaveDirectAnswer,
        })
      }
    } catch (trainingError) {
      // Non-blocking - don't fail the request if training logging fails
      console.warn('Could not log training data:', trainingError)
    }

    return NextResponse.json({
      message,
      conversationId,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      // Include model info for debugging and A/B testing analysis
      modelInfo: {
        model: modelUsed,
        variant: abVariant,
      },
      // Path modification status
      pathModified: pathModificationApplied,
    })
  } catch (error) {
    console.error('Coach API error:', error)

    return NextResponse.json(
      {
        message: getSocraticErrorResponse(),
        error: true,
        conversationId,
      },
      { status: 500 }
    )
  }
}

// ============================================
// MOCK RESPONSES (for demo without API key)
// ============================================

function getSocraticErrorResponse(): string {
  const responses = [
    "I'm having a brief connection issue, but here's a thought: What's the first thing that comes to mind when you think about your target audience? That's often the best starting point for any marketing strategy!",
    "Technical hiccup on my end! While I reconnect, consider this: If you were your ideal customer, what would make you stop scrolling? That's the key to great social media content.",
    "Give me just a moment to reconnect. In the meantime, think about this: What's one thing you learned recently that surprised you about social media marketing?",
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

function getMockResponse(body: RequestBody): string {
  const { type, context, messages } = body
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || ''
  const name = context?.userName || 'there'

  if (type === 'summary') {
    return `Here's what I want you to take away from this, ${name}: 
**Key Insights:**

1. **Know Your Audience First** - Before any campaign, ask yourself: "Who am I really trying to reach, and what do they care about?"

2. **Quality Over Quantity** - One thoughtful post beats ten rushed ones. What would make someone stop scrolling?

3. **Test and Learn** - The best marketers treat every campaign as an experiment. What's one thing you could test this week?

**Your Challenge:**
Think of a brand you follow on social media. What's ONE thing they do that keeps you engaged? That's your homework - observe and learn!

What resonated most with you from this lesson?`
  }

  if (type === 'practice_feedback') {
    return `I see what you're going for here, ${name}! Let me ask you some questions to help strengthen this response. 
**What I noticed you did well:**
You're clearly thinking about the target audience - that's the foundation of everything in marketing.

**Let's dig deeper:**
1. You mentioned targeting [your audience]. What specific behaviors or interests would help you reach them more precisely?

2. When you think about what they care about, what pain points are you solving for them?

3. How might your approach differ between Instagram and Facebook for this same audience?

**Here's what I'd challenge you to consider:**
If you had to cut your target audience in half to make it even more specific, who would you keep and why?

Take another crack at it with these questions in mind. You're on the right track!`
  }

  if (type === 'quiz_help') {
    return `Let's work through this together, ${name}! I won't give you the answer, but I'll help you think it through. 
**First, let's understand the question:**
What is it really asking? Try to rephrase it in your own words.

**Elimination strategy:**
- Look at each option. Which ones can you immediately rule out and why?
- For the remaining options, what would be the RESULT of each choice?

**Hint:**
Think about this from the advertiser's perspective: What would be the most effective outcome for their business goals?

Which options are you torn between? Let's talk through them!`
  }

  // Chat responses with Socratic approach
  if (lastMessage.includes('hello') || lastMessage.includes('hi ') || lastMessage.includes('hey')) {
    return `Hey ${name}! Great to see you here. 
Before we dive in, I'm curious: What brought you to study social media marketing? Understanding your "why" helps me tailor how we work together.

Are you:
- Preparing for the Meta certification?
- Learning for a current job?
- Exploring a career change?
- Something else entirely?

Tell me a bit about your goal!`
  }

  if (lastMessage.includes('help') || lastMessage.includes('stuck') || lastMessage.includes("don't understand")) {
    return `I hear you, ${name}. Getting stuck is actually a good sign - it means you're pushing into new territory. 
Let's figure out where the confusion is:

1. **What's the last concept that made total sense to you?**
   Sometimes the gap is smaller than we think.

2. **Can you tell me what you THINK the answer or concept might be?**
   Even a guess helps me understand your thinking.

3. **What specifically feels confusing?**
   Is it a term? The logic? How to apply it?

There are no wrong answers here - I just want to understand where you're at so I can help you break through!`
  }

  if (lastMessage.includes('what is') || lastMessage.includes('what are') || lastMessage.includes('explain')) {
    return `Good question! But instead of me just telling you, let's build your understanding together.

**First, what do you already know or guess about this topic?**

Even if you're not sure, take a shot. Sometimes our intuition knows more than we realize.

**Then, think about:**
- Have you seen examples of this in the real world?
- What problem do you think this concept solves?

Share your thoughts and we'll build from there!`
  }

  // Default Socratic response
  return `Interesting thought, ${name}! Let me turn this back to you with a question: 
**When you think about this from a user's perspective**, not a marketer's, what would make you engage with this kind of content?

**Consider:**
- What catches YOUR attention when you're scrolling?
- What makes you actually stop and interact with a post?
- What brands do you follow and why?

Your own behavior as a social media user is one of your best resources for understanding marketing. What patterns do you notice?`
}
