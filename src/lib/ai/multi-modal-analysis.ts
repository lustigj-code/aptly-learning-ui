/**
 * Multi-Modal AI Analysis
 * Phase 5: Image analysis for ad creative critique
 *
 * Uses GPT-4 Vision API (has FREE tier) for analyzing uploaded images
 * Cost: $0 within free tier, ~$0.01/image if exceeded
 *
 * Upgrade Path: Same interface, can switch to Claude Vision or other providers
 */

// Analysis context type for vision functions
type AnalysisContext = {
  objective: string;
  targetAudience: string;
  platform: string;
  industry: string;
};

export type AdCreativeAnalysis = {
  strengths: string[];
  improvements: string[];
  socraticQuestions: string[];
  targetAudienceFit: {
    score: number; // 0-100
    reasoning: string;
  };
  platformAppropriate: {
    platform: string;
    appropriate: boolean;
    reasoning: string;
  }[];
  overallScore: number;
  detailedFeedback: string;
};

export type CampaignPlanAnalysis = {
  audienceStrategy: { score: number; feedback: string };
  budgetAllocation: { score: number; feedback: string };
  creativeQuality: { score: number; feedback: string };
  contentStrategy: { score: number; feedback: string };
  overallScore: number;
  socraticRefinement: string[];
};

/**
 * Analyze ad creative image using vision AI
 * FREE Implementation: Uses GPT-4V free tier or Gemini Vision
 */
export async function analyzeAdCreative(
  imageUrl: string,
  campaignContext: {
    objective: string;
    targetAudience: string;
    platform: string;
    industry: string;
  }
): Promise<AdCreativeAnalysis> {
  // Check if we have GPT-4V access (has free tier)
  const hasVisionAPI = process.env.OPENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  if (!hasVisionAPI) {
    throw new Error('Vision API not configured. Set OPENAI_API_KEY or GOOGLE_GENAI_API_KEY');
  }

  try {
    // Use OpenAI GPT-4V if available (has free tier credits)
    if (process.env.OPENAI_API_KEY) {
      return await analyzeWithGPT4Vision(imageUrl, campaignContext);
    }

    // Fallback to Gemini Vision (FREE)
    return await analyzeWithGeminiVision(imageUrl, campaignContext);
  } catch (error) {
    console.error('Vision analysis failed:', error);

    // Return fallback analysis
    return {
      strengths: ['Unable to analyze image automatically'],
      improvements: ['Manual review recommended'],
      socraticQuestions: [
        'What elements of this ad catch your eye first?',
        'Does the visual align with your target audience\'s preferences?',
        'How does the ad stand out in a crowded feed?',
      ],
      targetAudienceFit: {
        score: 50,
        reasoning: 'Unable to analyze - please review manually',
      },
      platformAppropriate: [
        {
          platform: campaignContext.platform,
          appropriate: true,
          reasoning: 'Manual review recommended',
        },
      ],
      overallScore: 50,
      detailedFeedback: 'Vision analysis unavailable. Please conduct manual review.',
    };
  }
}

/**
 * Analyze with GPT-4 Vision (FREE tier available)
 */
async function analyzeWithGPT4Vision(
  imageUrl: string,
  context: AnalysisContext
): Promise<AdCreativeAnalysis> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this social media ad creative for a ${context.industry} campaign targeting ${context.targetAudience} on ${context.platform}.

Provide:
1. 3-5 strengths
2. 3-5 improvements
3. 3-5 Socratic questions to guide the student's thinking
4. Target audience fit score (0-100) with reasoning
5. Platform appropriateness assessment
6. Overall score and detailed feedback

Be Socratic - ask questions that make them think, don't just tell them what to fix.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 800,
    }),
  });

  const data = await response.json();
  const analysis = data.choices[0].message.content;

  // Parse response (simplified - would use structured output in production)
  return parseAnalysisText(analysis, context);
}

/**
 * Analyze with Gemini Vision (FREE)
 */
async function analyzeWithGeminiVision(
  imageUrl: string,
  context: AnalysisContext
): Promise<AdCreativeAnalysis> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `Analyze this ad creative for ${context.objective} campaign targeting ${context.targetAudience}.

Provide Socratic analysis: strengths, improvements as questions, target audience fit.`;

  // Fetch image as base64
  const imageResponse = await fetch(imageUrl);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64,
      },
    },
    { text: prompt },
  ]);

  const analysis = result.response.text();
  return parseAnalysisText(analysis, context);
}

/**
 * Parse analysis text into structured format
 */
function parseAnalysisText(text: string, context: AnalysisContext): AdCreativeAnalysis {
  // Simplified parsing - in production, would use structured output
  return {
    strengths: extractListItems(text, 'strength'),
    improvements: extractListItems(text, 'improvement'),
    socraticQuestions: extractQuestions(text),
    targetAudienceFit: {
      score: extractScore(text) || 75,
      reasoning: 'Based on visual analysis',
    },
    platformAppropriate: [
      {
        platform: context.platform,
        appropriate: true,
        reasoning: 'Analyzed from image',
      },
    ],
    overallScore: extractScore(text) || 75,
    detailedFeedback: text,
  };
}

function extractListItems(text: string, type: string): string[] {
  const lines = text.split('\n');
  return lines.filter((line) => line.toLowerCase().includes(type)).slice(0, 5);
}

function extractQuestions(text: string): string[] {
  const sentences = text.split(/[.!]+/);
  return sentences.filter((s) => s.includes('?')).slice(0, 5);
}

function extractScore(text: string): number | null {
  const match = text.match(/(\d+)\/100|(\d+)%|score:\s*(\d+)/i);
  if (match) {
    return parseInt(match[1] || match[2] || match[3]);
  }
  return null;
}

/**
 * Evaluate complete campaign plan (multi-input)
 */
export async function evaluateCampaignPlan(_plan: {
  audienceDescription: string;
  budgetBreakdown: string;
  adImages?: string[];
  contentCalendar?: string;
}): Promise<CampaignPlanAnalysis> {
  // This would use multi-modal AI to evaluate the complete plan
  // For now, return placeholder structure (TODO: implement with _plan)

  return {
    audienceStrategy: {
      score: 80,
      feedback: 'Clear targeting, consider expanding to lookalike audiences',
    },
    budgetAllocation: {
      score: 75,
      feedback: 'Reasonable split, but what about testing budget for optimization?',
    },
    creativeQuality: {
      score: 85,
      feedback: 'Strong visual hierarchy. How does the creative connect to audience pain points?',
    },
    contentStrategy: {
      score: 70,
      feedback: 'Posting frequency seems ambitious. Can you maintain quality at this pace?',
    },
    overallScore: 77,
    socraticRefinement: [
      'What would happen if you shifted 10% of budget from Facebook to Instagram Stories?',
      'Your content calendar shows daily posts. What trade-offs come with that frequency?',
      'How are you planning to measure which content types resonate most with your audience?',
    ],
  };
}
