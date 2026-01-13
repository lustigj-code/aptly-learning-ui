/**
 * Demo Coach API Route
 *
 * Provides mock responses for demo/testing purposes when AI API keys
 * are not configured. This allows the app to function in demo mode.
 *
 * Moved from main coach route to keep production code clean.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type RequestBody = {
  messages: Message[];
  context: {
    userName: string;
    currentCourse: string;
    currentModule: string;
    currentLesson: string;
    currentAtom: string;
    atomType: string;
    atomContent?: string;
    recentPerformance?: string;
    masteryLevel?: number;
    practiceContext?: string;
  };
  type: 'chat' | 'practice_feedback' | 'quiz_help' | 'summary';
  conversationId?: string;
};

// ============================================
// MOCK RESPONSE GENERATOR
// ============================================

function getMockResponse(body: RequestBody): string {
  const { type, context, messages } = body;
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
  const name = context?.userName || 'there';

  if (type === 'summary') {
    return `Here's what I want you to take away from this, ${name}:

**Key Insights:**

1. **Know Your Audience First** - Before any campaign, ask yourself: "Who am I really trying to reach, and what do they care about?"

2. **Quality Over Quantity** - One thoughtful post beats ten rushed ones. What would make someone stop scrolling?

3. **Test and Learn** - The best marketers treat every campaign as an experiment. What's one thing you could test this week?

**Your Challenge:**
Think of a brand you follow on social media. What's ONE thing they do that keeps you engaged? That's your homework - observe and learn!

What resonated most with you from this lesson?`;
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

Take another crack at it with these questions in mind. You're on the right track!`;
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

Which options are you torn between? Let's talk through them!`;
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

Tell me a bit about your goal!`;
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

There are no wrong answers here - I just want to understand where you're at so I can help you break through!`;
  }

  if (lastMessage.includes('what is') || lastMessage.includes('what are') || lastMessage.includes('explain')) {
    return `Good question! But instead of me just telling you, let's build your understanding together.

**First, what do you already know or guess about this topic?**

Even if you're not sure, take a shot. Sometimes our intuition knows more than we realize.

**Then, think about:**
- Have you seen examples of this in the real world?
- What problem do you think this concept solves?

Share your thoughts and we'll build from there!`;
  }

  // Default Socratic response
  return `Interesting thought, ${name}! Let me turn this back to you with a question:

**When you think about this from a user's perspective**, not a marketer's, what would make you engage with this kind of content?

**Consider:**
- What catches YOUR attention when you're scrolling?
- What makes you actually stop and interact with a post?
- What brands do you follow and why?

Your own behavior as a social media user is one of your best resources for understanding marketing. What patterns do you notice?`;
}

// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    // Generate mock response
    const message = getMockResponse(body);

    return NextResponse.json({
      message,
      conversationId: body.conversationId || `demo-${Date.now()}`,
      _demo: true,
      _note: 'This is a demo response. Configure GOOGLE_GENAI_API_KEY for AI-powered coaching.',
    });
  } catch (error) {
    console.error('[Demo Coach API] Error:', error);

    return NextResponse.json(
      {
        message: "I'm having a moment - could you try that again?",
        error: true,
        _demo: true,
      },
      { status: 500 }
    );
  }
}
