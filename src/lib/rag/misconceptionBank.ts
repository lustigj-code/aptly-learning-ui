/**
 * Misconception Bank
 *
 * Pre-authored misconception explanations for common errors.
 * Based on LearnLM research: "Index WHY something is wrong, not just what's right"
 *
 * This bank supplements auto-generated misconception chunks with
 * expert-authored content for known common misconceptions.
 *
 * Part of Phase 12.1: Content Indexing Pipeline
 */

// ============================================
// TYPES
// ============================================

export type MisconceptionCategory =
  | 'common_error'
  | 'partial_understanding'
  | 'confusion'
  | 'overgeneralization'
  | 'misconception_from_everyday_experience';

export type MisconceptionEntry = {
  id: string;
  name: string;
  category: MisconceptionCategory;

  // Student-friendly explanation (Tier 1/2 responses)
  studentExplanation: string;

  // Technical explanation (for instructor reference)
  technicalExplanation: string;

  // Socratic questions to guide discovery
  socraticQuestions: string[];

  // Worked example for Tier 3 intervention
  workedExample?: string;

  // Related content
  relatedSkills?: string[];
  relatedModuleId?: string;
  relatedLessonId?: string;

  // Legacy fields for backward compatibility
  frequency?: number;
};

// Legacy type for backward compatibility
export type LegacyMisconceptionEntry = {
  id: string;
  skillId: string;
  misconception: string;
  correction: string;
  frequency: number;
  examples: string[];
  relatedConcepts: string[];
};

// ============================================
// AI AT WORK MISCONCEPTIONS
// ============================================

const AI_AT_WORK_MISCONCEPTIONS: MisconceptionEntry[] = [
  {
    id: 'ai-replaces-humans',
    name: 'AI Will Replace All Human Jobs',
    category: 'overgeneralization',
    studentExplanation:
      "Many people worry that AI will completely replace human workers. While AI can automate certain tasks, it's actually best used to augment human capabilities rather than replace them entirely. AI excels at repetitive, data-heavy tasks but struggles with creativity, empathy, complex judgment, and novel situations that humans handle naturally.",
    technicalExplanation:
      "This misconception stems from confusion between narrow AI (task-specific) and general AI (human-level reasoning). Current AI systems are narrow AI - they excel at specific tasks but cannot generalize. The economic evidence suggests AI creates new job categories while transforming existing ones, similar to past technological revolutions.",
    socraticQuestions: [
      'Can you think of a task at work that requires emotional intelligence or creative problem-solving?',
      'How might AI help you do your job better rather than replacing you entirely?',
      "What unique value do you bring that would be hard for an algorithm to replicate?",
    ],
    workedExample: `Consider a customer service scenario:

Task: Handle a frustrated customer complaint about a delayed shipment.

AI's Role: Can quickly look up order status, provide tracking information, and suggest standard compensations based on policy.

Human's Role: Can sense the customer's emotional state, show genuine empathy, make judgment calls on exceptions to policy, and turn a negative experience into a positive brand impression.

Best Approach: Use AI to quickly gather relevant information, freeing the human agent to focus on the emotional and relationship aspects of the interaction.`,
    relatedSkills: ['ai-fundamentals', 'workplace-transformation'],
    relatedModuleId: 'ai-work-module-1',
  },
  {
    id: 'ai-is-always-accurate',
    name: 'AI Output is Always Accurate',
    category: 'misconception_from_everyday_experience',
    studentExplanation:
      "Because AI can process vast amounts of data quickly, it's easy to assume its outputs are always correct. However, AI systems can and do make mistakes. They can 'hallucinate' (generate convincing but false information), reflect biases in their training data, or fail when encountering situations different from what they were trained on. Always verify important AI outputs.",
    technicalExplanation:
      "AI models are statistical systems that predict likely outputs based on patterns in training data. They have no concept of 'truth' - they optimize for plausibility based on learned patterns. Hallucinations occur when the model generates statistically plausible but factually incorrect content. This is an inherent limitation of current architectures.",
    socraticQuestions: [
      "If an AI learned everything it knows from internet text, what kinds of errors might it make?",
      'How would you verify if an AI-generated statistic or fact is accurate?',
      'What could go wrong if you used AI output for an important decision without checking it?',
    ],
    workedExample: `Scenario: You ask an AI to write a report about a competitor company.

AI Output: "Company X was founded in 2015 and has 500 employees. Their CEO is John Smith, and they raised $50M in Series B funding in 2022."

Verification Process:
1. Check company website for founding date and employee count
2. Verify CEO name on LinkedIn or company page
3. Search for funding announcements in credible business news
4. Cross-reference multiple sources for each fact

Result: You discover the AI got the founding date wrong (actually 2017) and the CEO's name (actually Jane Smith). The funding information was correct.

Lesson: AI can be a great starting point for research, but critical facts need human verification.`,
    relatedSkills: ['ai-limitations', 'critical-thinking', 'ai-output-verification'],
    relatedModuleId: 'ai-work-module-2',
  },
  {
    id: 'prompt-length-quality',
    name: 'Longer Prompts Are Always Better',
    category: 'partial_understanding',
    studentExplanation:
      "While detailed prompts can be helpful, simply making prompts longer doesn't guarantee better results. What matters is clarity and relevance. A well-structured short prompt often outperforms a rambling long one. Focus on being specific about what you need, providing relevant context, and structuring your request clearly.",
    technicalExplanation:
      "Prompt engineering effectiveness depends on signal-to-noise ratio. Additional words only help if they add relevant context, constraints, or examples. Excessive length can actually dilute the key instructions, introduce contradictions, or exceed optimal context window utilization. The goal is maximum useful information density.",
    socraticQuestions: [
      "If you had to explain a task to a new colleague, would longer instructions always be clearer?",
      'What makes a prompt effective - its length or its clarity?',
      'Can you think of cases where a shorter, more focused prompt might work better?',
    ],
    workedExample: `Task: Get AI to write a professional email declining a meeting request.

Less Effective (Long but unfocused):
"I need you to write an email. It should be professional and polite. The email is for work. I want to decline a meeting. The meeting was requested by someone. I can't attend because I have a conflict. Please make it sound nice and not rude. Business communication is important. Make sure it's appropriate for a corporate environment..."

More Effective (Concise and clear):
"Write a professional email politely declining a meeting request. Context: The meeting is Tuesday 2pm, I have a client call conflict. Offer to reschedule to Wednesday or Thursday. Keep it brief (3-4 sentences). Tone: Warm but professional."

The second prompt is shorter but more effective because it's specific, provides relevant context, and gives clear constraints.`,
    relatedSkills: ['prompt-engineering', 'ai-communication'],
    relatedModuleId: 'ai-work-module-3',
  },
  {
    id: 'ai-understands-context',
    name: 'AI Understands Context Like Humans Do',
    category: 'confusion',
    studentExplanation:
      "AI doesn't truly 'understand' in the human sense. When you have a conversation with an AI, it doesn't remember your previous conversations (unless specifically designed to), doesn't know what you didn't tell it, and can't infer unstated context the way a colleague who knows you would. You need to provide complete context each time.",
    technicalExplanation:
      "Large language models process text statistically without persistent memory or world models. Each conversation starts fresh unless context is explicitly maintained. The model has no access to information not in its training data or the current prompt. 'Understanding' is pattern matching, not comprehension.",
    socraticQuestions: [
      "If you asked an AI a follow-up question without any context, would it know what you were referring to?",
      "What information might you assume a colleague knows that you'd need to explicitly tell an AI?",
      'How does your communication style need to change when working with AI vs. human colleagues?',
    ],
    workedExample: `Scenario: You're working on a project and want AI help.

Ineffective approach:
Conversation 1: "Help me brainstorm marketing ideas" [AI provides ideas]
[Next day, new conversation]
Conversation 2: "Can you refine option 3?"

Problem: The AI has no idea what "option 3" refers to - each conversation starts fresh.

Effective approach:
"Yesterday I brainstormed marketing ideas. The three options were: 1) Social media campaign, 2) Email newsletter, 3) Influencer partnership. I'd like to refine option 3 (influencer partnership). Please suggest specific influencer types for our B2B software product targeting HR managers."

This provides complete context in each conversation.`,
    relatedSkills: ['ai-communication', 'context-management'],
    relatedModuleId: 'ai-work-module-2',
  },
  {
    id: 'one-prompt-fits-all',
    name: 'The Same Prompt Works for All AI Tools',
    category: 'overgeneralization',
    studentExplanation:
      "Different AI tools have different capabilities, training, and optimal prompting styles. A prompt that works well with one tool might not work with another. Some tools are better at certain tasks, understand different formats, or respond better to specific instruction styles. Learn the strengths of each tool you use.",
    technicalExplanation:
      "AI models differ in architecture, training data, fine-tuning objectives, and context window sizes. GPT-4, Claude, Gemini, and specialized tools have different capabilities and response patterns. Transfer of prompt strategies is not guaranteed and often requires adaptation.",
    socraticQuestions: [
      'Would you give the same instructions to a specialist and a generalist colleague?',
      "How might you adjust your prompt for an AI that's great at coding vs. one that's great at writing?",
      'What would you do if a prompt that worked before suddenly gives poor results with a different tool?',
    ],
    relatedSkills: ['ai-tool-selection', 'prompt-engineering'],
    relatedModuleId: 'ai-work-module-3',
  },
  {
    id: 'ai-creativity-limitation',
    name: 'AI Cannot Be Creative',
    category: 'partial_understanding',
    studentExplanation:
      "AI can actually assist with creative tasks in surprising ways - it can generate ideas, combine concepts in novel ways, and help overcome creative blocks. However, AI creativity is different from human creativity. It excels at recombination and variation of existing patterns but doesn't have personal experiences, emotions, or genuine artistic intent. Think of it as a creative partner that can generate options for you to curate and refine.",
    technicalExplanation:
      "AI generates novel outputs by combining and recombining patterns from training data in ways not explicitly present in that data. This is a form of combinatorial creativity, which is legitimate but different from human creativity that involves intentionality, emotional expression, and meaning-making. AI is useful in the ideation and variation phases of creative work.",
    socraticQuestions: [
      'What aspects of creativity require human judgment that AI might struggle with?',
      'How could AI help you explore more creative options than you might think of alone?',
      'What would be the best way to collaborate with AI on a creative project?',
    ],
    workedExample: `Creative Task: Design a new product for busy professionals.

Using AI as a creative partner:

Step 1 - Divergent thinking: "Generate 20 unconventional product ideas for busy professionals, including some that combine different product categories."

Step 2 - Human curation: Review AI suggestions, identify 3-4 that spark interest based on your market knowledge and intuition.

Step 3 - AI-assisted development: "Take the 'portable meditation pod' concept and generate 5 variations targeting different price points and use cases."

Step 4 - Human refinement: Apply your understanding of target customers, brand values, and feasibility to shape the final concept.

The AI expands your creative options; you apply judgment and meaning.`,
    relatedSkills: ['ai-creativity', 'human-ai-collaboration'],
    relatedModuleId: 'ai-work-module-4',
  },
  {
    id: 'ai-consciousness',
    name: 'AI Systems Are Conscious',
    category: 'confusion',
    studentExplanation:
      'AI systems like ChatGPT process information and generate outputs based on patterns in training data. They do not have consciousness, feelings, or subjective experiences. When an AI says "I think" or "I feel," these are language patterns, not actual thoughts or emotions.',
    technicalExplanation:
      'Current AI systems are statistical models trained to predict likely next tokens in a sequence. They have no internal experience, self-awareness, or genuine understanding. Anthropomorphization is a natural human tendency but leads to unrealistic expectations and misunderstandings about AI capabilities.',
    socraticQuestions: [
      'When an AI says "I think...", what is actually happening inside the system?',
      "How would you test whether something is truly conscious vs. just appearing conscious?",
      'Why might it be important to remember that AI doesn\'t have feelings?',
    ],
    relatedSkills: ['genai-definition', 'llm-basics'],
    relatedModuleId: 'ai-work-module-1',
    frequency: 15,
  },
];

// ============================================
// SOCIAL MEDIA MARKETING MISCONCEPTIONS
// ============================================

const SOCIAL_MEDIA_MISCONCEPTIONS: MisconceptionEntry[] = [
  {
    id: 'more-posts-better',
    name: 'More Posts Always Means Better Results',
    category: 'overgeneralization',
    studentExplanation:
      "Quality matters more than quantity in social media marketing. Posting too frequently can actually hurt your engagement if the content isn't valuable to your audience. It's better to post less frequently with high-quality, relevant content than to flood your followers with mediocre posts.",
    technicalExplanation:
      "Social media algorithms prioritize engagement rate over post frequency. High-frequency posting with low engagement signals to algorithms that content is low quality, potentially reducing reach. Optimal posting frequency varies by platform and audience.",
    socraticQuestions: [
      'What happens to your engagement when you post content your audience finds valuable vs. filler content?',
      'Would you rather follow an account that posts once a day with great content or five times a day with mediocre content?',
      'How do social media algorithms decide what content to show users?',
    ],
    relatedSkills: ['content-strategy', 'engagement-optimization'],
    relatedModuleId: 'social-media-module-1',
  },
  {
    id: 'viral-content-formula',
    name: 'There Is a Formula for Viral Content',
    category: 'misconception_from_everyday_experience',
    studentExplanation:
      "While certain elements can increase the chances of content being shared (emotional resonance, timeliness, relatability), there's no guaranteed formula for virality. Many viral posts seem random, and trying to engineer virality often backfires. Focus on consistently creating valuable content for your audience rather than chasing viral moments.",
    technicalExplanation:
      "Viral spread follows complex network dynamics influenced by many unpredictable factors: timing, initial audience, platform algorithm states, cultural moment, and network structure. Statistical analysis shows that even 'viral' elements have low predictive power for any individual piece of content.",
    socraticQuestions: [
      "If there was a guaranteed formula for virality, wouldn't everyone's content go viral?",
      "What's more valuable for a business: one viral post or consistent engagement with your target audience?",
      'What risks might come with trying to engineer viral content?',
    ],
    relatedSkills: ['content-strategy', 'audience-understanding'],
    relatedModuleId: 'social-media-module-2',
  },
];

// ============================================
// GENERAL LEARNING MISCONCEPTIONS
// ============================================

const GENERAL_MISCONCEPTIONS: MisconceptionEntry[] = [
  {
    id: 'passive-learning-works',
    name: 'Passive Review Is Effective Learning',
    category: 'misconception_from_everyday_experience',
    studentExplanation:
      "Simply re-reading notes or watching videos feels productive but doesn't create strong memories. Active recall - testing yourself on material - is much more effective for long-term retention. Struggle is actually a sign that learning is happening. If learning feels too easy, you might not be learning much.",
    technicalExplanation:
      "Cognitive science research consistently shows that retrieval practice strengthens memory more than repeated exposure. The 'testing effect' demonstrates that attempting to recall information strengthens neural pathways more than passive review. Desirable difficulties enhance learning.",
    socraticQuestions: [
      "If you close your notes and try to recall the main points, how much can you remember vs. how much you thought you knew?",
      "What's harder - re-reading a chapter or taking a practice quiz? Which helps you learn more?",
      'Why might struggling to remember something actually be beneficial for learning?',
    ],
    workedExample: `Comparing learning approaches:

Approach A (Passive): Re-read chapter 3 three times over the weekend.
Result: Material feels familiar, confidence is high. On test: 65%

Approach B (Active): Read chapter 3 once, then:
- Close book and write down everything you remember
- Check what you missed
- Take practice quiz
- Explain concepts to a study partner
Result: Material feels harder, less confident. On test: 85%

The "harder" feeling in Approach B is actually a sign of effective learning.`,
    relatedSkills: ['learning-strategies', 'self-assessment'],
  },
];

// ============================================
// IN-MEMORY STORAGE FOR DYNAMIC ENTRIES
// ============================================

const dynamicMisconceptions = new Map<string, MisconceptionEntry[]>();

// ============================================
// BANK RETRIEVAL FUNCTIONS
// ============================================

/**
 * Get misconception bank entries for a specific course
 */
export function getMisconceptionBank(courseId: string): MisconceptionEntry[] {
  const entries: MisconceptionEntry[] = [];

  // Add course-specific misconceptions
  if (courseId === 'ai-at-work' || courseId.startsWith('ai-')) {
    entries.push(...AI_AT_WORK_MISCONCEPTIONS);
  }

  if (courseId === 'social-media-marketing' || courseId.startsWith('social-')) {
    entries.push(...SOCIAL_MEDIA_MISCONCEPTIONS);
  }

  // Always include general learning misconceptions
  entries.push(...GENERAL_MISCONCEPTIONS);

  // Add any dynamic misconceptions for this course
  const dynamic = dynamicMisconceptions.get(courseId);
  if (dynamic) {
    entries.push(...dynamic);
  }

  return entries;
}

/**
 * Get all misconception bank entries
 */
export function getAllMisconceptions(): MisconceptionEntry[] {
  const all = [
    ...AI_AT_WORK_MISCONCEPTIONS,
    ...SOCIAL_MEDIA_MISCONCEPTIONS,
    ...GENERAL_MISCONCEPTIONS,
  ];

  dynamicMisconceptions.forEach((entries) => {
    all.push(...entries);
  });

  return all;
}

/**
 * Get a specific misconception by ID
 */
export function getMisconceptionById(id: string): MisconceptionEntry | undefined {
  return getAllMisconceptions().find((m) => m.id === id);
}

/**
 * Get misconceptions by category
 */
export function getMisconceptionsByCategory(
  category: MisconceptionCategory
): MisconceptionEntry[] {
  return getAllMisconceptions().filter((m) => m.category === category);
}

/**
 * Get misconceptions related to specific skills
 */
export function getMisconceptionsBySkill(skillId: string): MisconceptionEntry[] {
  return getAllMisconceptions().filter((m) =>
    m.relatedSkills?.includes(skillId)
  );
}

/**
 * Add a misconception to the dynamic bank
 */
export function addMisconception(
  courseId: string,
  entry: MisconceptionEntry
): void {
  const existing = dynamicMisconceptions.get(courseId) || [];
  existing.push(entry);
  dynamicMisconceptions.set(courseId, existing);
}

/**
 * Update misconception frequency (called when user makes this mistake)
 */
export function incrementMisconceptionFrequency(
  misconceptionId: string
): void {
  const entry = getMisconceptionById(misconceptionId);
  if (entry && entry.frequency !== undefined) {
    entry.frequency += 1;
  }
}

/**
 * Get top misconceptions by frequency
 */
export function getTopMisconceptions(limit: number = 10): MisconceptionEntry[] {
  const all = getAllMisconceptions();
  return all
    .filter((m) => m.frequency !== undefined)
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
    .slice(0, limit);
}

/**
 * Search misconceptions by text
 */
export function searchMisconceptions(query: string): MisconceptionEntry[] {
  const queryLower = query.toLowerCase();
  return getAllMisconceptions().filter(
    (entry) =>
      entry.name.toLowerCase().includes(queryLower) ||
      entry.studentExplanation.toLowerCase().includes(queryLower) ||
      entry.socraticQuestions.some((q) => q.toLowerCase().includes(queryLower))
  );
}

/**
 * Get statistics about the misconception bank
 */
export function getMisconceptionBankStats(): {
  total: number;
  byCategory: Record<MisconceptionCategory, number>;
  byCourse: Record<string, number>;
  withExamples: number;
} {
  const all = getAllMisconceptions();

  const byCategory: Record<MisconceptionCategory, number> = {
    common_error: 0,
    partial_understanding: 0,
    confusion: 0,
    overgeneralization: 0,
    misconception_from_everyday_experience: 0,
  };

  all.forEach((m) => {
    byCategory[m.category]++;
  });

  return {
    total: all.length,
    byCategory,
    byCourse: {
      'ai-at-work': AI_AT_WORK_MISCONCEPTIONS.length,
      'social-media-marketing': SOCIAL_MEDIA_MISCONCEPTIONS.length,
      general: GENERAL_MISCONCEPTIONS.length,
    },
    withExamples: all.filter((m) => m.workedExample).length,
  };
}
