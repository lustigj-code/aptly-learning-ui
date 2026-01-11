/**
 * AI at Work Course Content
 *
 * A comprehensive course on using ChatGPT effectively in the workplace.
 * Matches the skill map in skillMap.ts for adaptive learning.
 */

import type { Course, Module, Lesson, Atom } from '@/types';

// ============================================
// COURSE DEFINITION
// ============================================

export const AI_AT_WORK_COURSE: Course = {
  id: 'ai-at-work',
  number: 1,
  title: 'AI at Work: Mastering ChatGPT for Professional Success',
  description: 'Learn to leverage ChatGPT effectively in your workplace through practical prompting, custom GPTs, and no-code automation.',
  objectives: [
    'Describe core concepts of Generative AI and explain how ChatGPT supports everyday office work',
    'Analyze your own workflows to identify high-impact opportunities for ChatGPT use',
    'Write, revise, and troubleshoot effective prompts in ChatGPT',
    'Use advanced ChatGPT features including prompt chaining and custom GPTs',
    'Configure simple no-code automations using ChatGPT agents',
    'Apply safe, ethical, and responsible practices when using ChatGPT',
  ],
  estimatedHours: 12,
  modules: [],
  isLocked: false,
  prerequisites: [],
};

// ============================================
// MODULE 1: Foundations of Generative AI
// ============================================

export const AI_WORK_MODULE_1: Module = {
  id: 'ai-m1',
  courseId: 'ai-at-work',
  number: 1,
  title: 'Foundations of Generative AI with ChatGPT',
  objectives: [
    'Explain what Generative AI is and how ChatGPT fits into the AI landscape',
    'Identify common workplace scenarios where ChatGPT can be applied',
    'Analyze your own tasks to pinpoint high-impact use cases',
    'Recognize ethical concerns and apply best practices for safe AI use',
  ],
  estimatedMinutes: 120,
  lessons: [
    // Lesson 1.1: Understanding Generative AI at Work
    {
      id: '1.1',
      moduleId: 'ai-m1',
      number: 1,
      title: 'Understanding Generative AI at Work',
      objectives: [
        'Describe what generative AI is and how it differs from traditional software',
        'Explain how large language models (LLMs) like ChatGPT work at a high level',
        'Identify strengths and limitations of ChatGPT in workplace contexts',
        'Recognize common types of tasks ChatGPT can support across roles',
      ],
      estimatedMinutes: 30,
      atoms: [
        {
          id: '1.1-intro',
          lessonId: '1.1',
          type: 'reading',
          title: 'The Rise of Generative AI in the Workplace',
          content: {
            body: `# The Rise of Generative AI in the Workplace

Generative AI is transforming how we work. From drafting emails to analyzing data, AI tools like ChatGPT are becoming essential workplace companions.

## Why AI Adoption is Accelerating

Organizations are racing to adopt AI because it offers:
- **Speed**: Tasks that took hours can be done in minutes
- **Consistency**: AI provides reliable output quality
- **Scale**: One person can accomplish what previously required a team

## What Makes ChatGPT Different

Unlike traditional software that follows rigid rules, ChatGPT can:
- Understand natural language instructions
- Generate creative content
- Adapt to different contexts and needs

In this lesson, you'll learn exactly how this technology works and where it excels in professional settings.`,
            highlights: [
              'AI is transforming workplace productivity',
              'ChatGPT understands natural language',
              'It adapts to different contexts',
            ],
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '1.1-video1',
          lessonId: '1.1',
          type: 'video',
          title: 'What Generative AI Is and How ChatGPT Works',
          content: {
            videoUrl: '/videos/ai-work/1.1-genai-intro.mp4',
            transcript: `Welcome to your introduction to Generative AI in the workplace.

Let's start with a simple definition: Generative AI is artificial intelligence that can create new content - text, images, code, and more - based on patterns it learned from training data.

Think of it like a chef who has studied thousands of recipes. When you ask for something new, they don't just follow a recipe card - they understand cooking principles well enough to create something original.

Traditional software is like following that recipe card exactly. Input A always produces output B. But ChatGPT and other large language models work differently.

These models are trained on massive amounts of text from the internet, books, and other sources. They learn patterns in language - how words relate, how sentences flow, how ideas connect.

When you type a prompt, ChatGPT predicts what should come next, word by word, based on those patterns. It's not retrieving pre-written answers; it's generating responses in real-time.

In the workplace, this means ChatGPT can help with:
- Drafting emails and documents
- Summarizing long reports
- Brainstorming ideas
- Explaining complex concepts
- Translating between languages

Let's look at a quick example from a fictional company, Acme Corp...`,
            duration: 420,
            chapters: [
              { time: 0, title: 'What is Generative AI?' },
              { time: 90, title: 'The Chef Analogy' },
              { time: 180, title: 'How LLMs Generate Text' },
              { time: 300, title: 'Workplace Applications' },
            ],
            keyTakeaways: [
              'Generative AI creates new content based on learned patterns',
              'ChatGPT predicts text word by word, not retrieving pre-written answers',
              'It can help with drafting, summarizing, brainstorming, and more',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '1.1-reading1',
          lessonId: '1.1',
          type: 'reading',
          title: 'Generative AI vs. Traditional Software',
          content: {
            body: `# Generative AI vs. Traditional Software

Understanding the difference between generative AI and traditional software helps you know when to use each.

## Comparison Table

| Aspect | Traditional Software | Generative AI |
|--------|---------------------|---------------|
| **Input Style** | Structured commands, menus | Natural language |
| **Output** | Predefined responses | Generated content |
| **Adaptability** | Fixed functionality | Flexible interpretation |
| **Learning** | Programmed rules | Trained on data |
| **Best For** | Precise, repeatable tasks | Creative, varied tasks |

## Key Terms Glossary

- **Generative AI**: AI that creates new content rather than just analyzing existing data
- **LLM (Large Language Model)**: The type of AI model that powers ChatGPT
- **Prompt**: The text you type to instruct the AI
- **Output**: The AI's response to your prompt
- **Hallucination**: When AI generates plausible-sounding but incorrect information

## When to Use Each

**Use Traditional Software When:**
- You need exact, reproducible results
- The task has strict formatting requirements
- Speed and reliability are critical (e.g., financial calculations)

**Use Generative AI When:**
- You need help with creative or open-ended tasks
- You want to brainstorm or explore ideas
- You need to transform or summarize content`,
            highlights: [
              'Traditional: structured input, predefined output',
              'Generative AI: natural language, generated content',
              'Choose based on task requirements',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '1.1-transition',
          lessonId: '1.1',
          type: 'reading',
          title: 'Finding AI Opportunities in Your Work',
          content: {
            body: `# Finding AI Opportunities in Your Work

Now that you understand what generative AI is, let's shift from theory to practice.

In the next section, you'll learn to identify specific opportunities in your own workflow where ChatGPT could add value.

## What to Look For

As you continue, start thinking about:
- Tasks you do repeatedly each week
- Work that involves writing or summarizing
- Situations where you brainstorm or generate ideas

These are prime candidates for AI assistance.`,
            highlights: [
              'Look for repetitive tasks',
              'Writing and summarizing are good fits',
              'Brainstorming is another opportunity',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '1.1-video2',
          lessonId: '1.1',
          type: 'video',
          title: 'Strengths and Limitations of ChatGPT',
          content: {
            videoUrl: '/videos/ai-work/1.1-strengths-limits.mp4',
            transcript: `Let's talk honestly about what ChatGPT does well and where it falls short.

STRENGTHS:

First, speed. ChatGPT can draft a professional email in seconds that might take you 10 minutes. For repetitive communication, this is a huge time saver.

Second, adaptability. Unlike templates, ChatGPT adjusts its tone, format, and content based on your instructions. Want it formal? Casual? Bullet points? Just ask.

Third, multilingual support. Need to communicate with international colleagues? ChatGPT can help translate and adapt content across dozens of languages.

Fourth, tirelessness. It doesn't get bored with repetitive tasks. Need to write 20 variations of the same message? ChatGPT handles it without complaint.

LIMITATIONS:

Now the important part - limitations.

Factual accuracy is a major concern. ChatGPT can confidently state incorrect information. It might cite studies that don't exist or give outdated statistics. Always verify facts.

Real-time awareness is another gap. ChatGPT doesn't know what happened yesterday unless it's in its training data. It can't check current stock prices or today's news.

Hallucinations - this is when ChatGPT generates plausible-sounding but completely fabricated information. It might invent a person, a book, or a historical event.

Finally, context limits. While ChatGPT remembers your conversation, it has a limit. Very long conversations may lose earlier context.

WHEN TO USE VS NOT USE:

Use ChatGPT for: first drafts, brainstorming, summarizing, formatting, and low-stakes communication.

Be cautious with: legal documents, medical advice, financial decisions, anything requiring current information, or content going to external audiences without review.`,
            duration: 480,
            chapters: [
              { time: 0, title: 'ChatGPT Strengths' },
              { time: 150, title: 'Key Limitations' },
              { time: 320, title: 'When to Use vs Not Use' },
            ],
            keyTakeaways: [
              'Strengths: speed, adaptability, multilingual, tireless',
              'Limitations: accuracy issues, no real-time data, hallucinations',
              'Always verify facts and review output for external use',
            ],
          },
          estimatedMinutes: 9,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '1.1-reading2',
          lessonId: '1.1',
          type: 'reading',
          title: 'When to Use and Not Use ChatGPT',
          content: {
            body: `# When to Use and Not Use ChatGPT

## Quick Reference Checklist

### Use ChatGPT When:
- [ ] Drafting first versions of documents
- [ ] Brainstorming ideas and options
- [ ] Summarizing long content
- [ ] Explaining concepts in simpler terms
- [ ] Generating variations of content
- [ ] Low-stakes internal communications
- [ ] Formatting or restructuring text

### Be Cautious or Avoid When:
- [ ] Legal contracts or compliance documents
- [ ] Medical or health advice
- [ ] Financial calculations or recommendations
- [ ] Content requiring current information
- [ ] Sensitive customer communications (without review)
- [ ] Anything requiring factual precision
- [ ] High-stakes decisions

## The Golden Rule

**Always review AI output before using it for anything important.**

ChatGPT is a powerful assistant, not a replacement for human judgment.`,
            highlights: [
              'Good for: drafting, brainstorming, summarizing',
              'Avoid for: legal, medical, financial, current events',
              'Always review before sharing externally',
            ],
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '1.1-activity-prep',
          lessonId: '1.1',
          type: 'reading',
          title: 'Brainstorming AI-Eligible Tasks',
          content: {
            body: `# Activity: Brainstorming AI-Eligible Tasks

Before the practice activity, take a moment to identify potential AI opportunities in your work.

## Instructions

1. **List 3 recurring work tasks** you do weekly
2. **Mark tasks** that involve writing, summarizing, or organizing information
3. **Highlight** time-consuming but low-stakes tasks

## Example Brainstorm Sheet

| Task | Involves Writing? | Time-Consuming? | Low Stakes? | AI Candidate? |
|------|-------------------|-----------------|-------------|---------------|
| Weekly status email | Yes | Medium | Yes | **Strong** |
| Meeting notes cleanup | Yes | High | Yes | **Strong** |
| Budget spreadsheet | No | High | No | Weak |

## Your Turn

Think through your typical week. What takes time that AI might help with?`,
            highlights: [
              'List 3 recurring tasks',
              'Mark writing/summarizing tasks',
              'Highlight time-consuming, low-stakes work',
            ],
          },
          estimatedMinutes: 3,
          isRequired: false,
          masteryThreshold: 60,
        },
        {
          id: '1.1-practice',
          lessonId: '1.1',
          type: 'practice',
          title: 'Spot the AI Opportunity',
          content: {
            type: 'ai-conversation',
            prompt: 'Think of 3 tasks you do at work regularly. For each one, describe the task and then ask ChatGPT: "How could you help me with this task?" Compare its suggestions to your expectations.',
            context: 'The learner is exploring where ChatGPT might help in their own work. Guide them to identify good and less-good fits for AI assistance.',
            expectedOutcomes: [
              'Identifies at least 3 work tasks',
              'Evaluates AI suggestions critically',
              'Recognizes good vs poor AI fit',
            ],
            rubric: [
              { criterion: 'Identifies relevant work tasks', weight: 30 },
              { criterion: 'Asks clear questions to ChatGPT', weight: 25 },
              { criterion: 'Evaluates AI suggestions thoughtfully', weight: 25 },
              { criterion: 'Identifies limitations appropriately', weight: 20 },
            ],
          },
          estimatedMinutes: 8,
          isRequired: false,
          masteryThreshold: 60,
        },
        {
          id: '1.1-quiz',
          lessonId: '1.1',
          type: 'quiz',
          title: 'Lesson 1.1 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q1.1.1',
                type: 'multiple-choice',
                question: 'What is the main difference between generative AI and traditional software?',
                options: [
                  'Generative AI is faster',
                  'Generative AI creates new content based on patterns rather than following fixed rules',
                  'Traditional software is always more accurate',
                  'Generative AI requires an internet connection',
                ],
                correctAnswer: 1,
                explanation: 'Generative AI differs from traditional software because it generates new content by predicting what should come next based on learned patterns, rather than following pre-programmed rules.',
                difficulty: 1,
                skills: ['M1-genai-definition'],
              },
              {
                id: 'q1.1.2',
                type: 'multiple-choice',
                question: 'How does ChatGPT generate its responses?',
                options: [
                  'It searches the internet for answers',
                  'It retrieves pre-written responses from a database',
                  'It predicts text word by word based on patterns learned during training',
                  'It copies from similar previous conversations',
                ],
                correctAnswer: 2,
                explanation: 'ChatGPT generates responses by predicting what word should come next, based on patterns it learned from training data. It does not search the internet or retrieve pre-written answers.',
                difficulty: 2,
                skills: ['M1-genai-definition', 'M1-llm-explanation'],
              },
              {
                id: 'q1.1.3',
                type: 'multiple-choice',
                question: 'Which of the following is a limitation of ChatGPT?',
                options: [
                  'It cannot write in multiple languages',
                  'It can only process very short inputs',
                  'It may generate plausible-sounding but incorrect information (hallucinations)',
                  'It requires you to use specific programming commands',
                ],
                correctAnswer: 2,
                explanation: 'One of ChatGPT\'s key limitations is that it can "hallucinate" - generating confident-sounding but factually incorrect information. This is why you should always verify important facts.',
                difficulty: 2,
                skills: ['M1-chatgpt-limitations'],
              },
              {
                id: 'q1.1.4',
                type: 'multiple-choice',
                question: 'For which task would ChatGPT be MOST appropriate?',
                options: [
                  'Calculating precise financial projections',
                  'Providing current stock market prices',
                  'Drafting a first version of a team meeting summary',
                  'Making a legal determination about contract terms',
                ],
                correctAnswer: 2,
                explanation: 'ChatGPT excels at drafting and summarizing content. Financial calculations, current data, and legal determinations require either precise tools or human expertise.',
                difficulty: 2,
                skills: ['M1-chatgpt-strengths', 'M1-chatgpt-limitations'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 1.2: Mapping Your Workflow for ChatGPT
    {
      id: '1.2',
      moduleId: 'ai-m1',
      number: 2,
      title: 'Mapping Your Workflow for ChatGPT',
      objectives: [
        'Identify repetitive or structured tasks in your weekly work routine',
        'Evaluate which tasks are appropriate for ChatGPT support',
        'Create a simple workflow map of tasks to automate or accelerate',
      ],
      estimatedMinutes: 25,
      atoms: [
        {
          id: '1.2-intro',
          lessonId: '1.2',
          type: 'reading',
          title: 'Why Map Your Workflow?',
          content: {
            body: `# Why Map Your Workflow?

Workflow mapping reveals patterns in your repetitive tasks. By documenting what you do, you can spot opportunities where AI assistance would have the biggest impact.

## The Value of Mapping

When you map your workflow, you:
- See patterns you might have missed
- Identify time drains
- Find prime candidates for AI assistance

In this lesson, you'll learn to systematically evaluate your work and create a practical plan for using ChatGPT effectively.`,
            highlights: [
              'Mapping reveals patterns',
              'Identify time drains',
              'Find AI opportunities',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '1.2-video1',
          lessonId: '1.2',
          type: 'video',
          title: 'Identifying Repetitive and Structured Tasks',
          content: {
            videoUrl: '/videos/ai-work/1.2-task-identification.mp4',
            transcript: `Let's talk about finding the right tasks for AI assistance.

First, understand the difference between repetitive and structured tasks.

REPETITIVE tasks are things you do over and over:
- Weekly status reports
- Regular email follow-ups
- Monthly summaries
- Recurring meeting notes

STRUCTURED tasks have predictable formats:
- Converting data from one format to another
- Following templates to create documents
- Applying consistent rules to content

The sweet spot for AI assistance is tasks that are BOTH repetitive AND structured.

Let me show you an example from a fictional company, Tech Solutions Inc.

Sarah, a project manager, mapped her weekly routine:
- Monday: Compile status updates from 5 team members
- Tuesday: Draft client update email
- Wednesday: Summarize meeting notes
- Thursday: Update project tracker language
- Friday: Write weekly team digest

Looking at this list, which stand out as AI candidates?

The status compilation, client email, meeting summaries, and team digest ALL involve:
- Repetitive occurrence
- Predictable format
- Text-based input and output

These are prime AI opportunities.

The project tracker update is less suited because it requires system-specific knowledge and precise data entry.

Your task: Think about YOUR week. What patterns emerge?`,
            duration: 360,
            chapters: [
              { time: 0, title: 'Repetitive vs Structured Tasks' },
              { time: 90, title: 'The Sweet Spot for AI' },
              { time: 180, title: 'Real Example: Sarah\'s Week' },
              { time: 280, title: 'Your Turn' },
            ],
            keyTakeaways: [
              'Best AI candidates are both repetitive AND structured',
              'Text-based tasks with predictable formats are ideal',
              'Map your week to find patterns',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '1.2-reading1',
          lessonId: '1.2',
          type: 'reading',
          title: 'Task Identification Checklist',
          content: {
            body: `# Task Identification Checklist

Use this checklist to spot AI-suitable tasks in your work.

## Indicators of a Good AI Task

- [ ] **Recurring frequency** - You do it weekly or more often
- [ ] **Text-based** - Primarily involves reading or writing
- [ ] **Predictable format** - Output follows a consistent structure
- [ ] **Low to medium stakes** - Errors won't cause major problems
- [ ] **Time-consuming** - Takes 15+ minutes each time
- [ ] **Doesn't require real-time data** - No need for live information

## Red Flags (May Not Be Suitable)

- [ ] Requires precise calculations
- [ ] Involves confidential/sensitive data
- [ ] Needs current/live information
- [ ] High stakes if errors occur
- [ ] Requires specialized domain expertise

## Scoring Your Tasks

For each task, count how many green checkmarks it gets. Tasks with 4+ green indicators are strong AI candidates.`,
            highlights: [
              'Recurring, text-based, predictable format',
              'Low stakes, time-consuming',
              'Avoid: calculations, sensitive data, live info',
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '1.2-video2',
          lessonId: '1.2',
          type: 'video',
          title: 'Evaluating AI-Suitability',
          content: {
            videoUrl: '/videos/ai-work/1.2-ai-suitability.mp4',
            transcript: `Now let's evaluate whether specific tasks are good fits for ChatGPT.

I use a simple framework with four criteria:

1. STAKES LEVEL
Ask: "What happens if the AI makes a mistake?"
- Low stakes: Internal draft, brainstorming document
- Medium stakes: Team communication, first drafts for review
- High stakes: Client deliverable, legal document

ChatGPT works best for low to medium stakes tasks where you'll review before finalizing.

2. INPUT CLARITY
Ask: "Can I clearly describe what I need?"
- Clear input: "Summarize these meeting notes into action items"
- Unclear input: "Help me with my project" (too vague)

The clearer your input, the better the output.

3. OUTPUT EXPECTATIONS
Ask: "Do I know what good output looks like?"
- Clear expectations: "Bullet points, professional tone, under 200 words"
- Unclear expectations: "Make it better" (subjective)

4. CONFIDENTIALITY
Ask: "Does this involve sensitive information?"
- Safe: General processes, public information
- Caution needed: Customer data, proprietary info, financials

Let's evaluate three sample tasks:

TASK A: "Write first draft of weekly team newsletter"
- Stakes: Low (internal, will be reviewed)
- Input: Clear (weekly updates from team)
- Output: Clear (newsletter format)
- Confidential: No
VERDICT: Excellent AI candidate

TASK B: "Create quarterly financial projections"
- Stakes: High (business decisions depend on it)
- Input: Complex data requirements
- Confidential: Potentially
VERDICT: Not ideal for AI alone

TASK C: "Summarize customer feedback survey"
- Stakes: Medium (informs decisions)
- Input: Clear (survey data)
- Output: Clear (summary themes)
- Confidential: Moderate (anonymize first)
VERDICT: Good candidate with precautions`,
            duration: 420,
            chapters: [
              { time: 0, title: 'Four Evaluation Criteria' },
              { time: 150, title: 'Evaluating Sample Tasks' },
              { time: 320, title: 'Making Your Decision' },
            ],
            keyTakeaways: [
              'Evaluate stakes, input clarity, output expectations, confidentiality',
              'Low to medium stakes tasks work best',
              'Be cautious with sensitive information',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '1.2-reading2',
          lessonId: '1.2',
          type: 'reading',
          title: 'AI Task Suitability Matrix',
          content: {
            body: `# AI Task Suitability Matrix

## The Matrix

Plot your tasks on this grid based on complexity and risk:

|              | Low Risk | High Risk |
|--------------|----------|-----------|
| **Low Complexity** | **AUTOMATE** (best fit) | ASSIST with caution |
| **High Complexity** | ASSIST | **AVOID** (human needed) |

## Best Fit Quadrant (Low Complexity, Low Risk)

Examples:
- Meeting note summaries
- Email drafts for routine communications
- Formatting and restructuring documents
- Brainstorming session facilitation

## Assist with Caution Quadrants

**High complexity, low risk:**
- Research compilation
- Content creation with review

**Low complexity, high risk:**
- Simple communications to important clients
- Template completion for compliance docs

## Avoid Quadrant (High Complexity, High Risk)

- Legal contract drafting
- Financial advice
- Medical recommendations
- Security-sensitive decisions`,
            highlights: [
              'Best: low complexity + low risk',
              'Caution: either high complexity OR high risk',
              'Avoid: high complexity + high risk',
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '1.2-quiz',
          lessonId: '1.2',
          type: 'quiz',
          title: 'Lesson 1.2 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q1.2.1',
                type: 'multiple-choice',
                question: 'Which type of task is BEST suited for ChatGPT assistance?',
                options: [
                  'A task you do once a year that requires precise calculations',
                  'A weekly task that involves writing and follows a predictable format',
                  'A high-stakes decision requiring real-time data',
                  'A task involving confidential customer financial data',
                ],
                correctAnswer: 1,
                explanation: 'Tasks that are repetitive (weekly), text-based (writing), and follow predictable formats are ideal for ChatGPT. One-time tasks, high-stakes decisions, and confidential data handling are less suitable.',
                difficulty: 2,
                skills: ['M1-task-identification', 'M1-task-evaluation'],
              },
              {
                id: 'q1.2.2',
                type: 'multiple-choice',
                question: 'When evaluating a task for AI suitability, which factor suggests you should be CAUTIOUS?',
                options: [
                  'The task involves summarizing information',
                  'The task is done weekly',
                  'The task involves sensitive customer data',
                  'The task has a predictable output format',
                ],
                correctAnswer: 2,
                explanation: 'Sensitive customer data requires careful handling. You should be cautious when confidentiality is a concern, potentially anonymizing data before using AI assistance.',
                difficulty: 2,
                skills: ['M1-task-evaluation'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 1.3: Using ChatGPT Safely and Responsibly
    {
      id: '1.3',
      moduleId: 'ai-m1',
      number: 3,
      title: 'Using ChatGPT Safely and Responsibly',
      objectives: [
        'Describe key ethical risks of using ChatGPT at work',
        'Identify signs of unreliable or fabricated AI output',
        'Apply practical best practices for safe AI use',
      ],
      estimatedMinutes: 25,
      atoms: [
        {
          id: '1.3-intro',
          lessonId: '1.3',
          type: 'reading',
          title: 'Why Safe and Responsible Use Matters',
          content: {
            body: `# Why Safe and Responsible Use Matters

Using AI responsibly isn't just about avoiding mistakes—it's about building trust and protecting your organization.

## Potential Consequences of Careless AI Use

- **Data breaches** from sharing sensitive information
- **Misinformation spread** from unverified AI output
- **Reputation damage** from biased or inappropriate content
- **Compliance violations** from improper data handling

In this lesson, you'll learn to recognize risks and apply safeguards that let you use AI confidently and responsibly.`,
            highlights: [
              'Protect data and privacy',
              'Verify AI output',
              'Build trust through responsible use',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '1.3-video1',
          lessonId: '1.3',
          type: 'video',
          title: 'Key Risks in Workplace AI Use',
          content: {
            videoUrl: '/videos/ai-work/1.3-ai-risks.mp4',
            transcript: `Let's discuss three primary risk areas when using ChatGPT at work.

RISK 1: DATA PRIVACY

What you type into ChatGPT may be used to train future models or could potentially be accessed by OpenAI employees for quality review.

Never share:
- Customer personal information
- Financial account details
- Proprietary business strategies
- Employee personal data
- Passwords or access credentials

A real example: An employee at a major tech company pasted proprietary source code into ChatGPT to help debug it. That code may have been exposed beyond the company's security boundaries.

RISK 2: BIAS

ChatGPT learned from internet data, which contains human biases. This can show up in:
- Gender assumptions (assuming nurses are female, engineers are male)
- Cultural stereotypes
- Historical biases in examples it provides

When using AI for content that affects people—like job descriptions or customer communications—review for unintentional bias.

RISK 3: MISUSE

Using AI in ways that violate company policy or professional ethics:
- Claiming AI-generated work as entirely your own when disclosure is expected
- Using AI to create misleading content
- Bypassing approval processes

Let me share what happened at fictional company GlobalTech:

An employee used ChatGPT to write customer responses without disclosure or review. One response contained incorrect product specifications. The customer made purchasing decisions based on wrong information, leading to a formal complaint and refund demand.

The lesson: AI output requires human review, especially for external communications.`,
            duration: 420,
            chapters: [
              { time: 0, title: 'Data Privacy Risks' },
              { time: 140, title: 'Bias in AI' },
              { time: 250, title: 'Misuse Scenarios' },
              { time: 340, title: 'Real-World Example' },
            ],
            keyTakeaways: [
              'Never share sensitive data with AI',
              'Review AI output for bias',
              'Always verify before sending externally',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '1.3-reading1',
          lessonId: '1.3',
          type: 'reading',
          title: 'Risk Awareness Guide',
          content: {
            body: `# Risk Awareness Guide

## Red Flag Checklist

Before using ChatGPT, check for these warning signs:

### Privacy Red Flags
- [ ] Contains names, emails, or phone numbers
- [ ] Includes financial data or account numbers
- [ ] Has proprietary code or trade secrets
- [ ] Contains employee performance information

### Bias Red Flags
- [ ] Content makes assumptions about groups
- [ ] Uses stereotypical examples
- [ ] Could be seen as discriminatory

### Policy Red Flags
- [ ] Would violate company AI usage policy
- [ ] Bypasses normal approval processes
- [ ] Presents AI work as human-created when disclosure expected

## Safe Prompt vs. Unsafe Prompt

**Unsafe:** "Here's customer John Smith's account info (account #12345, SSN 123-45-6789). Draft an email about his overdue payment."

**Safe:** "Draft a professional email reminding a customer about an overdue payment. Keep the tone firm but friendly."

The safe version accomplishes the same goal without exposing sensitive data.`,
            highlights: [
              'Check for privacy, bias, and policy risks',
              'Remove sensitive details before prompting',
              'Safe prompts achieve goals without exposure',
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '1.3-video2',
          lessonId: '1.3',
          type: 'video',
          title: 'Understanding and Identifying Hallucinations',
          content: {
            videoUrl: '/videos/ai-work/1.3-hallucinations.mp4',
            transcript: `One of the most important risks to understand is AI hallucination.

A hallucination is when ChatGPT generates information that sounds plausible and confident but is completely made up.

COMMON SIGNS OF HALLUCINATIONS:

1. OVERLY CONFIDENT TONE
Watch for statements like "Studies have definitively proven..." or "According to the research by Dr. Smith at Harvard..."
The more specific and confident, the more you should verify.

2. MADE-UP CITATIONS
ChatGPT might cite:
- Books that don't exist
- Research papers with fake authors
- Statistics from imaginary studies
- Quotes attributed to people who never said them

3. PLAUSIBLE BUT FALSE FACTS
The information SOUNDS right. It fits what you'd expect. But it's fabricated.

Example: "The 2019 McKinsey study on workplace AI adoption found that 73% of companies..."
This sounds legitimate. But you should verify any specific statistic or citation.

HOW TO VERIFY:

1. Search for cited sources directly
2. Cross-reference facts with multiple sources
3. Ask ChatGPT to provide links (if it can't, be suspicious)
4. Test with follow-up questions

Remember the golden rule: "Trust, but verify."

ChatGPT is incredibly useful, but treat its factual claims like you would a colleague's memory—probably right, but worth double-checking for anything important.`,
            duration: 360,
            chapters: [
              { time: 0, title: 'What Are Hallucinations?' },
              { time: 90, title: 'Warning Signs' },
              { time: 200, title: 'How to Verify' },
              { time: 300, title: 'The Golden Rule' },
            ],
            keyTakeaways: [
              'Hallucinations are confident but false information',
              'Watch for specific citations and statistics',
              'Always verify factual claims',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '1.3-quiz',
          lessonId: '1.3',
          type: 'quiz',
          title: 'Lesson 1.3 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q1.3.1',
                type: 'multiple-choice',
                question: 'What is an AI "hallucination"?',
                options: [
                  'When the AI takes too long to respond',
                  'When the AI generates plausible-sounding but incorrect or fabricated information',
                  'When the AI refuses to answer a question',
                  'When the AI copies text directly from its training data',
                ],
                correctAnswer: 1,
                explanation: 'A hallucination occurs when ChatGPT generates information that sounds confident and believable but is actually incorrect or completely made up, such as fake citations or invented statistics.',
                difficulty: 1,
                skills: ['M1-hallucination-detection'],
              },
              {
                id: 'q1.3.2',
                type: 'multiple-choice',
                question: 'Which of the following should you NEVER share with ChatGPT?',
                options: [
                  'A request to draft a meeting agenda',
                  'Customer names, account numbers, and social security numbers',
                  'A question about formatting a document',
                  'A brainstorming prompt for marketing ideas',
                ],
                correctAnswer: 1,
                explanation: 'Never share personally identifiable information (PII) like names combined with account numbers or SSNs. This data could be exposed beyond your security boundaries.',
                difficulty: 1,
                skills: ['M1-ethical-risks', 'M1-safe-use-practices'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
  ],
  isLocked: false,
};

// ============================================
// MODULE 2: Prompting Fundamentals
// ============================================

export const AI_WORK_MODULE_2: Module = {
  id: 'ai-m2',
  courseId: 'ai-at-work',
  number: 2,
  title: 'Prompting Fundamentals in ChatGPT',
  objectives: [
    'Describe the components of a clear, effective prompt',
    'Modify prompt structure and tone to suit different communication goals',
    'Revise weak prompts to improve clarity and relevance',
    'Use ChatGPT\'s features to refine prompt quality',
  ],
  estimatedMinutes: 90,
  lessons: [
    // Lesson 2.1: Writing Clear, Useful Prompts
    {
      id: '2.1',
      moduleId: 'ai-m2',
      number: 1,
      title: 'Writing Clear, Useful Prompts',
      objectives: [
        'Identify the components of an effective prompt (role, task, context, format)',
        'Explain how prompt clarity affects output quality',
        'Recognize common prompt mistakes',
        'Write structured prompts for everyday tasks',
      ],
      estimatedMinutes: 30,
      atoms: [
        {
          id: '2.1-intro',
          lessonId: '2.1',
          type: 'reading',
          title: 'Why Prompt Clarity Matters',
          content: {
            body: `# Why Prompt Clarity Matters

The quality of ChatGPT's output is directly tied to the quality of your input.

## The Input-Output Connection

Think of it this way:
- **Vague prompt** = Vague, generic response
- **Clear, specific prompt** = Targeted, useful response

In this lesson, you'll learn the "anatomy" of an effective prompt—the components that consistently produce better results.`,
            highlights: [
              'Output quality depends on input quality',
              'Vague prompts produce vague results',
              'Learn the anatomy of effective prompts',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '2.1-video1',
          lessonId: '2.1',
          type: 'video',
          title: 'The Anatomy of an Effective Prompt',
          content: {
            videoUrl: '/videos/ai-work/2.1-prompt-anatomy.mp4',
            transcript: `Let's break down what makes a prompt effective.

I use the RTCF framework—Role, Task, Context, Format.

ROLE: Define the AI's perspective or expertise
Tell ChatGPT WHO it should be when responding.

Examples:
- "Act as an experienced project manager..."
- "You are a professional copywriter..."
- "Respond as a helpful HR assistant..."

Setting a role helps ChatGPT adopt appropriate tone and expertise.

TASK: Specify exactly what the AI should do
Be explicit about the action you want.

Vague: "Help with my presentation"
Clear: "Create an outline for a 10-minute presentation about Q3 sales results"

CONTEXT: Provide relevant background or constraints
Share information that shapes the response.

- Who is the audience?
- What's the situation?
- Any constraints or requirements?

Example: "The audience is executive leadership who have limited time. Focus on key metrics and trends only."

FORMAT: Define the structure of the output
Tell ChatGPT HOW to format the response.

- "Use bullet points"
- "Create a table"
- "Write in three paragraphs"
- "Limit to 200 words"

Here's an analogy:

Imagine hiring a contractor to renovate your kitchen.

Vague instruction: "Fix the kitchen."
Result: They might do anything—you'll get unpredictable results.

Clear instruction: "You're an experienced kitchen designer (ROLE). I need you to redesign the counter layout (TASK). We have a small space and need maximum storage (CONTEXT). Please provide a sketch with measurements and a materials list (FORMAT)."
Result: You get exactly what you need.

Same principle applies to ChatGPT.`,
            duration: 420,
            chapters: [
              { time: 0, title: 'The RTCF Framework' },
              { time: 90, title: 'Role: Setting Expertise' },
              { time: 150, title: 'Task: Being Specific' },
              { time: 210, title: 'Context: Background Info' },
              { time: 280, title: 'Format: Output Structure' },
              { time: 350, title: 'The Contractor Analogy' },
            ],
            keyTakeaways: [
              'RTCF: Role, Task, Context, Format',
              'Each component improves output quality',
              'Clear instructions yield clear results',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '2.1-reading1',
          lessonId: '2.1',
          type: 'reading',
          title: 'Prompt Building Blocks',
          content: {
            body: `# Prompt Building Blocks

## The RTCF Components

### Role
Sets the AI's perspective and expertise level.

| Example Roles | When to Use |
|---------------|-------------|
| "Act as a senior copywriter" | Marketing content |
| "You are a technical support specialist" | Help documentation |
| "Respond as a project manager" | Planning and organization |

### Task
The specific action you want performed.

| Weak | Strong |
|------|--------|
| "Help with email" | "Draft a follow-up email to a client who missed a meeting" |
| "Summarize this" | "Summarize this report into 5 key bullet points" |

### Context
Background information that shapes the response.

Include:
- Audience (who will read this?)
- Situation (what's the circumstance?)
- Constraints (length, tone, restrictions?)

### Format
How the output should be structured.

Options: bullet points, numbered list, table, paragraphs, headers, specific word count

## Mini Prompt Blueprint

Copy and adapt this template:

\`\`\`
[ROLE]: Act as a [expertise/perspective].

[TASK]: I need you to [specific action].

[CONTEXT]:
- Audience: [who will see this]
- Situation: [relevant background]
- Constraints: [any limitations]

[FORMAT]: Please provide the response as [structure].
\`\`\``,
            highlights: [
              'Role sets expertise and tone',
              'Task must be specific and actionable',
              'Context includes audience and constraints',
              'Format defines output structure',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '2.1-video2',
          lessonId: '2.1',
          type: 'video',
          title: 'From Vague to Precise',
          content: {
            videoUrl: '/videos/ai-work/2.1-vague-precise.mp4',
            transcript: `Let's see the RTCF framework in action with before-and-after examples.

EXAMPLE 1: Meeting Summary

BEFORE (Vague):
"Summarize the meeting."

What's wrong?
- No role defined
- Task is generic
- No context about what meeting
- No format specified

The result will be generic and probably not what you need.

AFTER (Precise):
"Act as a professional executive assistant. Summarize the product team meeting from March 15th into a concise email for the VP of Product. Focus on decisions made and action items assigned. Use bullet points, keep it under 150 words."

This prompt has:
- Role: executive assistant
- Task: summarize specific meeting into email
- Context: for VP, focus on decisions/actions
- Format: bullet points, 150 words max

EXAMPLE 2: Customer Email

BEFORE:
"Write a customer email."

AFTER:
"You are a customer success manager at a SaaS company. Write an email to a customer who submitted a support ticket about login issues. The issue has been resolved. Keep the tone friendly and professional. Include: acknowledgment of the issue, what was fixed, and how to reach us if problems continue. Use 2-3 short paragraphs."

EXAMPLE 3: Project Plan

BEFORE:
"Create a project plan."

AFTER:
"Act as an experienced project manager. Create a project plan outline for launching a new company newsletter. The project should take 4 weeks. Include major phases, key milestones, and responsible parties (assume a team of: writer, designer, marketing manager). Format as a simple table with columns: Phase, Tasks, Timeline, Owner."

See the difference? The precise versions give ChatGPT everything needed to produce useful output on the first try.`,
            duration: 380,
            chapters: [
              { time: 0, title: 'Why Vague Fails' },
              { time: 60, title: 'Example 1: Meeting Summary' },
              { time: 150, title: 'Example 2: Customer Email' },
              { time: 240, title: 'Example 3: Project Plan' },
              { time: 320, title: 'The Pattern' },
            ],
            keyTakeaways: [
              'Vague prompts produce generic results',
              'Each RTCF element improves precision',
              'Invest time upfront for better output',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '2.1-reading2',
          lessonId: '2.1',
          type: 'reading',
          title: 'Common Prompt Mistakes and Fixes',
          content: {
            body: `# Common Prompt Mistakes and Fixes

## Mistake 1: Too Broad
**Bad:** "Help me with marketing"
**Fix:** "Write 3 social media post ideas for promoting our upcoming webinar on remote work tips"

## Mistake 2: Missing Context
**Bad:** "Write an email to the team"
**Fix:** "Write an email to my engineering team (8 people) announcing that our deadline has moved from Friday to next Monday. Tone should be positive but clear about expectations."

## Mistake 3: No Format Guidance
**Bad:** "Explain our return policy"
**Fix:** "Explain our 30-day return policy in a customer-friendly FAQ format. Include 5 common questions with brief answers."

## Mistake 4: Unrealistic Expectations
**Bad:** "Write my entire business plan"
**Fix:** "Create an outline for the Executive Summary section of a business plan for a mobile app startup"

## Prompt Quality Checklist

Before submitting, ask yourself:
- [ ] Have I defined a role or perspective?
- [ ] Is my task specific and actionable?
- [ ] Have I provided necessary context?
- [ ] Did I specify the desired format?
- [ ] Is my request reasonable in scope?`,
            highlights: [
              'Be specific, not broad',
              'Always provide context',
              'Specify format expectations',
              'Keep scope reasonable',
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '2.1-quiz',
          lessonId: '2.1',
          type: 'quiz',
          title: 'Lesson 2.1 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q2.1.1',
                type: 'multiple-choice',
                question: 'What does the "R" in the RTCF prompt framework stand for?',
                options: [
                  'Result',
                  'Role',
                  'Review',
                  'Response',
                ],
                correctAnswer: 1,
                explanation: 'R stands for Role—defining the expertise or perspective you want ChatGPT to adopt when responding.',
                difficulty: 1,
                skills: ['M2-prompt-components'],
              },
              {
                id: 'q2.1.2',
                type: 'multiple-choice',
                question: 'Which prompt is MORE likely to produce useful results?',
                options: [
                  '"Write something about our product"',
                  '"Write a 100-word product description for our eco-friendly water bottle, targeting health-conscious millennials"',
                  '"Help me with content"',
                  '"Make it good"',
                ],
                correctAnswer: 1,
                explanation: 'The second option includes specific task (product description), context (eco-friendly, health-conscious millennials), and format (100 words). Specificity produces better results.',
                difficulty: 2,
                skills: ['M2-prompt-clarity', 'M2-prompt-writing'],
              },
              {
                id: 'q2.1.3',
                type: 'multiple-choice',
                question: 'What is a common prompt mistake?',
                options: [
                  'Being too specific about what you want',
                  'Including context about your audience',
                  'Asking for a specific format',
                  'Making the request too broad or vague',
                ],
                correctAnswer: 3,
                explanation: 'Making requests too broad or vague is a common mistake. More specificity typically produces better results.',
                difficulty: 1,
                skills: ['M2-prompt-mistakes'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 2.2: Tailoring Tone, Style, and Format
    {
      id: '2.2',
      moduleId: 'ai-m2',
      number: 2,
      title: 'Tailoring Tone, Style, and Format',
      objectives: [
        'Adjust prompt instructions to influence tone and voice',
        'Modify prompts to fit specific workplace needs',
        'Compare how small phrasing changes affect responses',
      ],
      estimatedMinutes: 25,
      atoms: [
        {
          id: '2.2-intro',
          lessonId: '2.2',
          type: 'reading',
          title: 'Why Tone, Style, and Format Matter',
          content: {
            body: `# Why Tone, Style, and Format Matter

The same information can land very differently depending on how it's presented.

## A Quick Example

Consider this message about a deadline change:

**Formal:** "Please be advised that the project deadline has been revised to March 15th."

**Casual:** "Hey team! Quick heads up - we've got until March 15th now."

Same information, completely different feel. In this lesson, you'll learn to control these elements precisely.`,
            highlights: [
              'Tone affects how messages land',
              'Same info can be formal or casual',
              'You control the presentation',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '2.2-video1',
          lessonId: '2.2',
          type: 'video',
          title: 'Controlling Tone and Voice',
          content: {
            videoUrl: '/videos/ai-work/2.2-tone-voice.mp4',
            transcript: `Let's explore how to control tone and voice in ChatGPT outputs.

TONE vs VOICE

Tone is the emotional feel—formal, casual, urgent, friendly, serious.
Voice is the personality—professional, conversational, authoritative, approachable.

You control both by being explicit in your prompt.

TONE DESCRIPTORS TO TRY:

Professional / Formal:
"Write in a professional, formal tone suitable for executive communication."

Friendly / Casual:
"Use a warm, conversational tone as if messaging a colleague."

Urgent:
"Write with a sense of urgency—this is time-sensitive."

Encouraging:
"Keep the tone positive and encouraging, celebrating progress."

Authoritative:
"Write as a subject matter expert sharing definitive guidance."

EXAMPLE: Same update, different tones

Task: Announce that the office is switching to a new project management tool.

FORMAL BUSINESS TONE:
"Effective April 1st, the organization will transition to Asana for project management. All team members are required to complete onboarding training by March 25th. Please direct questions to the IT Help Desk."

FRIENDLY TEAM CHAT:
"Hey everyone! Exciting news—we're moving to Asana for project management starting April 1st. It's going to make collaboration so much easier. Training sessions are coming up (and yes, there will be snacks). Let me know if you have questions!"

See how the tone completely changes the feel while conveying the same core information?

Your prompt instruction made that difference.`,
            duration: 340,
            chapters: [
              { time: 0, title: 'Tone vs Voice' },
              { time: 70, title: 'Tone Descriptors' },
              { time: 180, title: 'Example: Same Info, Different Tones' },
            ],
            keyTakeaways: [
              'Tone is emotional feel, voice is personality',
              'Be explicit about desired tone',
              'Same content can feel very different',
            ],
          },
          estimatedMinutes: 6,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '2.2-reading1',
          lessonId: '2.2',
          type: 'reading',
          title: 'Tone and Voice Prompt Library',
          content: {
            body: `# Tone and Voice Prompt Library

## Tone Descriptors

| Tone | Prompt Phrase | Best For |
|------|---------------|----------|
| Professional | "Write in a professional, business-appropriate tone" | External communications, executives |
| Friendly | "Use a warm, approachable tone" | Internal team updates, customer success |
| Urgent | "Convey a sense of urgency and importance" | Deadlines, critical issues |
| Encouraging | "Keep the tone positive and motivating" | Feedback, change management |
| Direct | "Be clear and straightforward, no fluff" | Instructions, time-pressed readers |
| Empathetic | "Write with empathy and understanding" | Customer complaints, difficult news |

## Combining Tone Instructions

You can combine descriptors:
- "Professional but friendly"
- "Direct but encouraging"
- "Formal yet approachable"

## Refining Tone Without Starting Over

If the tone isn't right, use follow-up prompts:
- "Make this more formal"
- "Can you make it warmer and less corporate?"
- "Add more energy to this"
- "Tone it down a bit—less salesy"`,
            highlights: [
              'Use specific tone descriptors',
              'Combine descriptors for nuance',
              'Refine with follow-up prompts',
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '2.2-video2',
          lessonId: '2.2',
          type: 'video',
          title: 'Structuring the Output',
          content: {
            videoUrl: '/videos/ai-work/2.2-output-structure.mp4',
            transcript: `Beyond tone, you can control exactly how ChatGPT structures its response.

COMMON FORMAT OPTIONS:

1. BULLET POINTS
"Present key points as bullet points."
Good for: Quick summaries, action items, lists

2. NUMBERED LISTS
"Provide a numbered list of steps."
Good for: Processes, rankings, sequences

3. TABLES
"Format as a table with columns for X, Y, and Z."
Good for: Comparisons, data organization

4. PARAGRAPHS
"Write in 2-3 concise paragraphs."
Good for: Explanations, emails, narratives

5. HEADERS/SECTIONS
"Organize with headers for each main topic."
Good for: Reports, documentation, guides

CONTROLLING LENGTH:

Be specific about length:
- "Keep it under 100 words"
- "Write 3-4 sentences"
- "Limit to 5 bullet points"
- "This should fit in a Slack message"

REAL EXAMPLE: Meeting notes transformation

Input: "Transform these raw meeting notes into a formatted summary."

Without format guidance: You get a wall of text.

With format guidance: "Transform these meeting notes into a summary with:
- A brief overview paragraph (2-3 sentences)
- 'Decisions Made' section with bullet points
- 'Action Items' table with columns: Task, Owner, Due Date
- Keep the total length under 200 words"

The format guidance transforms a potentially unusable output into exactly what you need.`,
            duration: 320,
            chapters: [
              { time: 0, title: 'Format Options' },
              { time: 120, title: 'Controlling Length' },
              { time: 200, title: 'Real Example: Meeting Notes' },
            ],
            keyTakeaways: [
              'Specify format: bullets, tables, paragraphs',
              'Set length expectations explicitly',
              'Format guidance saves editing time',
            ],
          },
          estimatedMinutes: 6,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '2.2-quiz',
          lessonId: '2.2',
          type: 'quiz',
          title: 'Lesson 2.2 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q2.2.1',
                type: 'multiple-choice',
                question: 'If you want ChatGPT to sound more casual and conversational, which instruction would you add?',
                options: [
                  '"Write in formal business language"',
                  '"Use a warm, friendly tone as if messaging a close colleague"',
                  '"Be as technical as possible"',
                  '"Use industry jargon throughout"',
                ],
                correctAnswer: 1,
                explanation: 'To achieve a casual, conversational tone, explicitly request warmth and friendliness. Comparing it to "messaging a colleague" gives ChatGPT a clear reference point.',
                difficulty: 1,
                skills: ['M2-tone-adjustment'],
              },
              {
                id: 'q2.2.2',
                type: 'multiple-choice',
                question: 'What is the benefit of specifying output format in your prompt?',
                options: [
                  'It makes ChatGPT respond faster',
                  'It reduces the quality of responses',
                  'It gives you output that is structured and ready to use with less editing',
                  'It is required for ChatGPT to work',
                ],
                correctAnswer: 2,
                explanation: 'Specifying format (bullets, tables, headers, word count) means the output is already structured how you need it, reducing time spent editing and reformatting.',
                difficulty: 1,
                skills: ['M2-format-control'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 2.3: Refining and Troubleshooting Prompts
    {
      id: '2.3',
      moduleId: 'ai-m2',
      number: 3,
      title: 'Refining and Troubleshooting Prompts',
      objectives: [
        'Use follow-up messages to refine outputs',
        'Revise weak prompts for clarity',
        'Diagnose common reasons for poor results',
      ],
      estimatedMinutes: 25,
      atoms: [
        {
          id: '2.3-intro',
          lessonId: '2.3',
          type: 'reading',
          title: 'Prompt Refinement as a Skill',
          content: {
            body: `# Prompt Refinement as a Skill

Getting perfect results on the first try is rare. The real skill is knowing how to iterate.

## The Iterative Approach

ChatGPT remembers your conversation within a session. This means you can:
- Build on previous responses
- Request adjustments
- Refine without starting over

Think of it as a collaboration, not a single query.`,
            highlights: [
              'Perfect first tries are rare',
              'ChatGPT remembers the conversation',
              'Iterate to improve output',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '2.3-video1',
          lessonId: '2.3',
          type: 'video',
          title: 'The Power of Follow-Up Prompts',
          content: {
            videoUrl: '/videos/ai-work/2.3-follow-up.mp4',
            transcript: `One of ChatGPT's most powerful features is conversational memory. It remembers what you discussed within a session.

This means you don't need to write one perfect prompt. Instead, you iterate.

COMMON FOLLOW-UP INSTRUCTIONS:

"Make this more concise"
"Expand on point #2"
"Change the tone to be more formal"
"Add more examples"
"Remove the introduction and get straight to the point"
"Can you format this as a table instead?"
"Make it suitable for a non-technical audience"

REAL EXAMPLE: Refining a Product Email

First prompt: "Write an email introducing our new project management feature to customers."

First response is decent but too long and too formal.

Follow-up 1: "Make this shorter—aim for 100 words"
Now it's concise but lost some key benefits.

Follow-up 2: "Add back the mention of time savings and collaboration improvements"
Better, but still feels stiff.

Follow-up 3: "Make the tone friendlier, like we're sharing exciting news"
Now it's perfect.

This iterative process took 30 seconds and produced exactly what we needed.

The key insight: Each follow-up doesn't lose context. ChatGPT carries forward everything from the conversation.

WHEN TO REFINE vs START OVER:

Refine when:
- The core content is good but needs adjustment
- You need tone, format, or length changes
- You want to add or remove specific elements

Start over when:
- The response completely misunderstood your intent
- You realized your original prompt was fundamentally wrong
- You want to try a completely different approach`,
            duration: 360,
            chapters: [
              { time: 0, title: 'Conversational Memory' },
              { time: 70, title: 'Common Follow-Up Instructions' },
              { time: 140, title: 'Real Example: Email Refinement' },
              { time: 260, title: 'When to Refine vs Start Over' },
            ],
            keyTakeaways: [
              'Use follow-ups to refine without starting over',
              'ChatGPT remembers conversation context',
              'Iteration is faster than perfect first prompts',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '2.3-video2',
          lessonId: '2.3',
          type: 'video',
          title: 'Debugging Prompts',
          content: {
            videoUrl: '/videos/ai-work/2.3-debugging.mp4',
            transcript: `When you get poor results, don't blame the AI—debug your prompt.

THE THREE-STEP TROUBLESHOOTING FRAMEWORK:

Step 1: IDENTIFY what's missing
Go through RTCF:
- Did I set a Role?
- Is my Task specific?
- Did I provide Context?
- Did I specify Format?

Missing elements often explain poor results.

Step 2: ADD or CLARIFY details
Once you identify the gap, fix it:
- Add the missing role
- Make the task more specific
- Include relevant context
- Specify your format needs

Step 3: TEST the revised prompt
Run it again and evaluate improvement.

EXAMPLE: Debugging a Weak Prompt

Original: "Write a report."

Problem: This is vague on every dimension.
- No role
- Task is too generic
- No context about the report topic
- No format guidance

Revised: "Act as a business analyst. Write a 1-page summary report on Q3 sales performance for the leadership team. Include: revenue vs target, top-performing products, and key challenges. Use headers for each section and include a brief executive summary at the top."

The revised prompt addresses all gaps and will produce a useful result.

COMMON CAUSES OF POOR OUTPUT:

1. Under-specified input
Fix: Add more details about what you want

2. Conflicting instructions
Fix: Review for contradictions, clarify priorities

3. Unrealistic scope
Fix: Break into smaller requests

4. Missing context
Fix: Include relevant background information

5. Wrong role/expertise
Fix: Reconsider what perspective would help`,
            duration: 380,
            chapters: [
              { time: 0, title: 'The Troubleshooting Framework' },
              { time: 120, title: 'Example: Debugging a Prompt' },
              { time: 240, title: 'Common Causes of Poor Output' },
            ],
            keyTakeaways: [
              'Identify: check RTCF for gaps',
              'Add: fill in missing elements',
              'Test: run revised prompt',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '2.3-quiz',
          lessonId: '2.3',
          type: 'quiz',
          title: 'Lesson 2.3 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q2.3.1',
                type: 'multiple-choice',
                question: 'What is the main advantage of using follow-up prompts instead of starting over?',
                options: [
                  'Follow-up prompts are always shorter',
                  'ChatGPT maintains context from the conversation, so you can refine without losing progress',
                  'Follow-up prompts guarantee perfect results',
                  'You can only use one prompt per conversation',
                ],
                correctAnswer: 1,
                explanation: 'ChatGPT maintains conversational context within a session, meaning follow-up prompts can build on and refine previous responses without starting from scratch.',
                difficulty: 1,
                skills: ['M2-followup-prompts'],
              },
              {
                id: 'q2.3.2',
                type: 'multiple-choice',
                question: 'If ChatGPT gives you a poor response, what should you do FIRST?',
                options: [
                  'Report it as a bug',
                  'Ask it to try again without changes',
                  'Check your prompt for missing Role, Task, Context, or Format',
                  'Close the chat and start a new one',
                ],
                correctAnswer: 2,
                explanation: 'Poor results usually indicate a gap in your prompt. Check for missing RTCF elements first—this usually reveals what to add or clarify.',
                difficulty: 2,
                skills: ['M2-prompt-debugging'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
  ],
  isLocked: false,
};

// ============================================
// MODULE 3: Advanced Prompting & Custom GPTs
// ============================================

export const AI_WORK_MODULE_3: Module = {
  id: 'ai-m3',
  courseId: 'ai-at-work',
  number: 3,
  title: 'Advanced Prompting & Custom GPTs',
  objectives: [
    'Use prompt chaining and conversation history to handle multi-step work',
    'Build a basic Custom GPT with clear instructions',
    'Understand when to use standard ChatGPT vs a Custom GPT',
  ],
  estimatedMinutes: 90,
  lessons: [
    // Lesson 3.1: Prompt Chaining for Complex Tasks
    {
      id: '3.1',
      moduleId: 'ai-m3',
      number: 1,
      title: 'Prompt Chaining for Complex Tasks',
      objectives: [
        'Define what prompt chaining is and why it matters',
        'Identify scenarios where chaining is more effective than single prompts',
        'Execute a multi-step workflow using conversational memory',
      ],
      estimatedMinutes: 30,
      atoms: [
        {
          id: '3.1-intro',
          lessonId: '3.1',
          type: 'reading',
          title: 'Beyond the Single Prompt',
          content: {
            body: `# Beyond the Single Prompt

Complex work rarely fits in a single request. This lesson introduces prompt chaining—a technique that breaks complex tasks into a sequence of related prompts.

## Why Chaining Matters

Single prompts work for simple tasks. But for anything complex—like creating a full project plan, writing a detailed report, or analyzing data from multiple angles—you need a systematic approach.

Prompt chaining lets you:
- Build on previous outputs
- Maintain quality at each step
- Catch errors before they compound
- Handle complexity that would overwhelm a single prompt`,
            highlights: [
              'Complex tasks need multiple prompts',
              'Build on previous outputs',
              'Catch errors at each step',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '3.1-video1',
          lessonId: '3.1',
          type: 'video',
          title: 'The Art of Prompt Chaining',
          content: {
            videoUrl: '/videos/ai-work/3.1-prompt-chaining.mp4',
            transcript: `Let's dive into prompt chaining—one of the most powerful techniques for getting real work done with ChatGPT.

WHAT IS PROMPT CHAINING?

Prompt chaining is using multiple connected prompts to accomplish a complex task. Each prompt builds on the output of the previous one.

Think of it like cooking a complex meal. You don't throw all ingredients in a pot at once. You prep vegetables, make the sauce, cook components separately, then combine them.

THE SAME LOGIC APPLIES TO AI WORK:

Step 1: Generate raw material
Step 2: Refine and structure it
Step 3: Add details and examples
Step 4: Polish and format

EXAMPLE: Creating a Training Outline

Instead of: "Create a complete training program on customer service"

Chain it:

Prompt 1: "List the 5 most important customer service skills that employees struggle with"
(Wait for response)

Prompt 2: "For each of these 5 skills, write a brief learning objective"
(Wait for response)

Prompt 3: "Expand skill #1 into a lesson outline with 3-4 key topics"
(Wait for response)

Prompt 4: "Create a practice exercise for the first topic in that lesson"

By chaining, you:
- Verify each step before continuing
- Guide the direction at every stage
- Produce higher-quality final output

THE KEY INSIGHT:

ChatGPT maintains context through the conversation. Each prompt doesn't start from zero—it carries forward everything you've built together.`,
            duration: 400,
            chapters: [
              { time: 0, title: 'What is Prompt Chaining?' },
              { time: 80, title: 'The Cooking Analogy' },
              { time: 160, title: 'Example: Training Outline' },
              { time: 300, title: 'The Key Insight' },
            ],
            keyTakeaways: [
              'Break complex tasks into sequential prompts',
              'Each prompt builds on the previous output',
              'Verify quality at each step',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '3.1-reading1',
          lessonId: '3.1',
          type: 'reading',
          title: 'Prompt Chaining Patterns',
          content: {
            body: `# Prompt Chaining Patterns

## Pattern 1: Expand and Refine
Start broad, then narrow down.

1. "List all the sections that should be in a business proposal"
2. "Expand section 2 (Problem Statement) into a detailed outline"
3. "Write the Problem Statement section based on that outline"
4. "Make it more concise and persuasive"

## Pattern 2: Generate and Evaluate
Create options, then assess them.

1. "Give me 5 different approaches to solving [problem]"
2. "List pros and cons of each approach"
3. "Recommend the best approach for [my situation]"
4. "Detail the implementation steps for that approach"

## Pattern 3: Draft and Polish
Create rough version, then improve.

1. "Write a rough draft of [content]"
2. "Identify weaknesses in this draft"
3. "Rewrite addressing those weaknesses"
4. "Final polish: make it [tone/length/format]"

## Pattern 4: Analyze and Act
Understand first, then respond.

1. "Summarize the key points from [input]"
2. "What questions does this raise?"
3. "How should I respond to [specific point]?"
4. "Draft my response"

## When to Use Chaining

✅ Multi-part deliverables
✅ Content that needs iteration
✅ Complex analysis
✅ Anything you'd break into phases manually`,
            highlights: [
              'Expand and Refine: broad to narrow',
              'Generate and Evaluate: options then assess',
              'Draft and Polish: rough then improve',
              'Analyze and Act: understand then respond',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '3.1-video2',
          lessonId: '3.1',
          type: 'video',
          title: 'Real-World Chaining Example',
          content: {
            videoUrl: '/videos/ai-work/3.1-chaining-example.mp4',
            transcript: `Let me walk you through a complete real-world example of prompt chaining.

SCENARIO: You need to prepare a presentation for leadership on your team's Q3 accomplishments.

CHAIN IN ACTION:

PROMPT 1: "I need to create a leadership presentation on my team's Q3 accomplishments. Help me brainstorm the key categories of achievements to include."

Response lists: Project completions, efficiency improvements, team growth, customer feedback, challenges overcome.

PROMPT 2: "Good. Now for each category, list 2-3 specific examples I should gather data on."

Response provides specific items per category.

PROMPT 3: "Let's focus on 'Project Completions.' Here are the three projects we completed: [Project A details], [Project B details], [Project C details]. Create a slide outline for this section."

Response creates structured slide outline.

PROMPT 4: "Write the speaker notes for the Project A slide. Keep them conversational for a 2-minute explanation."

Response provides natural speaker notes.

PROMPT 5: "Now write a compelling one-sentence headline for this slide that emphasizes business impact."

Final polish on the slide.

NOTICE THE PATTERN:
- Each prompt was specific and focused
- I waited to see output before proceeding
- I added my input (the actual project details) at the right moment
- The final result is higher quality than a single "create my presentation" prompt

This is how professionals use ChatGPT for real deliverables.`,
            duration: 380,
            chapters: [
              { time: 0, title: 'The Scenario' },
              { time: 60, title: 'Step-by-Step Chaining' },
              { time: 280, title: 'Analyzing the Pattern' },
            ],
            keyTakeaways: [
              'Start with brainstorming structure',
              'Add your specific details at right moment',
              'Polish incrementally',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '3.1-quiz',
          lessonId: '3.1',
          type: 'quiz',
          title: 'Lesson 3.1 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q3.1.1',
                type: 'multiple-choice',
                question: 'What is prompt chaining?',
                options: [
                  'Sending the same prompt multiple times',
                  'Using multiple connected prompts where each builds on previous output',
                  'Linking multiple ChatGPT accounts together',
                  'Writing very long prompts with multiple paragraphs',
                ],
                correctAnswer: 1,
                explanation: 'Prompt chaining uses multiple connected prompts in sequence, where each prompt builds on the output of the previous one to accomplish complex tasks.',
                difficulty: 1,
                skills: ['M3-prompt-chaining'],
              },
              {
                id: 'q3.1.2',
                type: 'multiple-choice',
                question: 'Which scenario is BEST suited for prompt chaining?',
                options: [
                  'Asking what the capital of France is',
                  'Translating a single sentence',
                  'Creating a comprehensive project plan with multiple sections',
                  'Getting a definition of a term',
                ],
                correctAnswer: 2,
                explanation: 'Prompt chaining is most valuable for complex, multi-part deliverables like project plans. Simple queries like translations or definitions work fine with single prompts.',
                difficulty: 2,
                skills: ['M3-prompt-chaining', 'M3-chaining-scenarios'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 3.2: Building Custom GPTs
    {
      id: '3.2',
      moduleId: 'ai-m3',
      number: 2,
      title: 'Building Custom GPTs',
      objectives: [
        'Explain what Custom GPTs are and their benefits',
        'Identify use cases where Custom GPTs outperform standard ChatGPT',
        'Navigate the GPT Builder interface',
        'Create a basic Custom GPT for a specific purpose',
      ],
      estimatedMinutes: 35,
      atoms: [
        {
          id: '3.2-intro',
          lessonId: '3.2',
          type: 'reading',
          title: 'What Are Custom GPTs?',
          content: {
            body: `# What Are Custom GPTs?

Custom GPTs are specialized versions of ChatGPT that you configure for specific purposes. Think of them as pre-programmed assistants with built-in instructions.

## Standard ChatGPT vs Custom GPTs

| Standard ChatGPT | Custom GPT |
|------------------|------------|
| Blank slate every conversation | Persistent instructions and context |
| You write full prompts each time | You just ask your question |
| General purpose | Specialized for a task |
| No uploaded knowledge | Can include reference documents |

## Why Create Custom GPTs?

1. **Save time**: No need to repeat instructions
2. **Consistency**: Same approach every time
3. **Share with others**: Team members use the same tool
4. **Include knowledge**: Upload documents for reference`,
            highlights: [
              'Custom GPTs have built-in instructions',
              'Save time on repeated tasks',
              'Ensure consistency across uses',
            ],
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '3.2-video1',
          lessonId: '3.2',
          type: 'video',
          title: 'Exploring the GPT Builder',
          content: {
            videoUrl: '/videos/ai-work/3.2-gpt-builder.mp4',
            transcript: `Let's explore the GPT Builder interface and understand its components.

ACCESSING GPT BUILDER:

1. Go to ChatGPT (chat.openai.com)
2. Click "Explore GPTs" in the sidebar
3. Click "Create" to start building

THE TWO TABS:

CREATE TAB (Conversational):
This is the beginner-friendly option. You describe what you want in plain language, and ChatGPT helps build your GPT.

Example: "I want a GPT that helps me write professional emails in a friendly tone."

ChatGPT will ask follow-up questions and generate instructions for you.

CONFIGURE TAB (Direct Control):
This gives you full control over:

- Name: What your GPT is called
- Description: What it does (shown to users)
- Instructions: The system prompt that guides behavior
- Conversation Starters: Example prompts shown to users
- Knowledge: Files you upload for reference
- Capabilities: Toggle web browsing, image generation, code interpreter
- Actions: Connect to external APIs (advanced)

WHICH TO USE?

Start with CREATE for your first GPT. Move to CONFIGURE once you want precise control.

KEY INSIGHT:

The Instructions field is the most important part. It's essentially a permanent system prompt that shapes every response your GPT gives.

Whatever you'd normally write at the start of every conversation with ChatGPT—put that in Instructions.`,
            duration: 380,
            chapters: [
              { time: 0, title: 'Accessing GPT Builder' },
              { time: 60, title: 'Create Tab (Conversational)' },
              { time: 150, title: 'Configure Tab (Direct Control)' },
              { time: 280, title: 'The Instructions Field' },
            ],
            keyTakeaways: [
              'CREATE tab for beginners, CONFIGURE for control',
              'Instructions field is the system prompt',
              'Knowledge uploads give your GPT reference material',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '3.2-reading1',
          lessonId: '3.2',
          type: 'reading',
          title: 'Custom GPT Use Cases',
          content: {
            body: `# Custom GPT Use Cases

## High-Value Use Cases

### 1. Role-Specific Assistants
- **HR Onboarding Helper**: Answers new employee questions using your employee handbook
- **Sales Email Writer**: Writes outreach emails following your company's voice and templates
- **IT Support Bot**: Troubleshoots common issues using your documentation

### 2. Process Standardizers
- **Meeting Notes Formatter**: Always formats notes the same way
- **Code Reviewer**: Checks code against your team's standards
- **Content Approver**: Reviews content against brand guidelines

### 3. Knowledge Bases
- **Product Expert**: Upload product docs, answers customer questions
- **Policy Advisor**: Upload policies, helps employees find answers
- **Research Assistant**: Upload papers, helps analyze and summarize

## When Standard ChatGPT is Better

- One-off tasks with unique requirements
- Tasks where you want maximum flexibility
- When you're still figuring out what you need

## When Custom GPT is Better

- Repetitive tasks with consistent format
- Team needs to use the same approach
- Domain knowledge is required
- You want a simple interface for complex instructions`,
            highlights: [
              'Role assistants: HR, Sales, IT',
              'Process standardizers: consistent formats',
              'Knowledge bases: uploaded expertise',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '3.2-video2',
          lessonId: '3.2',
          type: 'video',
          title: 'Building Your First Custom GPT',
          content: {
            videoUrl: '/videos/ai-work/3.2-first-gpt.mp4',
            transcript: `Let's build a Custom GPT together. We'll create a "Meeting Notes Assistant" that formats messy meeting notes into a consistent structure.

STEP 1: ACCESS GPT BUILDER
Click Explore GPTs → Create

STEP 2: USE CREATE TAB FIRST
Type: "I want a GPT that takes messy meeting notes and formats them into a consistent structure with sections for Attendees, Discussion Points, Decisions Made, and Action Items."

ChatGPT suggests a name, description, and initial instructions. Review and approve or modify.

STEP 3: SWITCH TO CONFIGURE TAB
Now let's refine:

NAME: "Meeting Notes Formatter"

DESCRIPTION: "Paste your raw meeting notes and get a cleanly formatted summary with attendees, key points, decisions, and action items."

INSTRUCTIONS:
"You are a professional meeting notes formatter. When the user pastes raw meeting notes:

1. Extract and list all attendees mentioned
2. Identify and summarize key discussion points (3-5 bullets)
3. Highlight any decisions that were made
4. Create an action items table with columns: Task, Owner, Due Date

Format the output with clear headers. If information for a section is missing, note that and suggest the user add it.

Keep the tone professional but concise. Aim for the formatted notes to be shorter than the raw input while capturing everything important."

STEP 4: ADD CONVERSATION STARTERS
- "Format these meeting notes:"
- "Here are my notes from today's meeting"
- "Clean up this transcript"

STEP 5: TEST IT
Click Preview and paste some sample meeting notes. Iterate on instructions if needed.

STEP 6: SAVE AND NAME
Choose visibility: Only me, Anyone with link, or Public.

Congratulations—you've built your first Custom GPT!`,
            duration: 480,
            chapters: [
              { time: 0, title: 'Starting the Build' },
              { time: 80, title: 'Using Create Tab' },
              { time: 160, title: 'Refining in Configure' },
              { time: 300, title: 'Testing and Saving' },
            ],
            keyTakeaways: [
              'Start with CREATE, refine in CONFIGURE',
              'Instructions are the core of your GPT',
              'Test with real examples before sharing',
            ],
          },
          estimatedMinutes: 9,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '3.2-quiz',
          lessonId: '3.2',
          type: 'quiz',
          title: 'Lesson 3.2 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q3.2.1',
                type: 'multiple-choice',
                question: 'What is the MOST important field when configuring a Custom GPT?',
                options: [
                  'The name of the GPT',
                  'The profile picture',
                  'The Instructions field (system prompt)',
                  'The conversation starters',
                ],
                correctAnswer: 2,
                explanation: 'The Instructions field is the most important because it acts as a permanent system prompt that shapes every response your Custom GPT gives.',
                difficulty: 1,
                skills: ['M3-custom-gpt-basics', 'M3-gpt-builder'],
              },
              {
                id: 'q3.2.2',
                type: 'multiple-choice',
                question: 'When is a Custom GPT better than standard ChatGPT?',
                options: [
                  'For one-off unique tasks',
                  'When you want maximum flexibility each time',
                  'For repetitive tasks where you want consistent format and approach',
                  'When you have never done the task before',
                ],
                correctAnswer: 2,
                explanation: 'Custom GPTs excel at repetitive tasks where you want the same approach, format, and potentially the same reference knowledge applied consistently.',
                difficulty: 2,
                skills: ['M3-custom-gpt-use-cases'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 3.3: Creating Effective GPT Instructions
    {
      id: '3.3',
      moduleId: 'ai-m3',
      number: 3,
      title: 'Creating Effective GPT Instructions',
      objectives: [
        'Write clear, complete instructions for a Custom GPT',
        'Include constraints and guardrails appropriately',
        'Test and iterate on GPT behavior',
      ],
      estimatedMinutes: 25,
      atoms: [
        {
          id: '3.3-intro',
          lessonId: '3.3',
          type: 'reading',
          title: 'Instructions Make or Break Your GPT',
          content: {
            body: `# Instructions Make or Break Your GPT

The difference between a useful Custom GPT and a frustrating one comes down to the instructions you write.

## What Good Instructions Include

1. **Role definition**: Who the GPT is
2. **Task scope**: What it should and shouldn't do
3. **Output format**: How responses should be structured
4. **Constraints**: Guardrails and limitations
5. **Edge cases**: How to handle unusual inputs

## The Stakes

Well-written instructions = Your GPT works reliably
Poor instructions = Unpredictable, often unhelpful responses`,
            highlights: [
              'Role, scope, format, constraints, edge cases',
              'Good instructions = reliable GPT',
              'Poor instructions = unpredictable results',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '3.3-video1',
          lessonId: '3.3',
          type: 'video',
          title: 'The Instruction Writing Framework',
          content: {
            videoUrl: '/videos/ai-work/3.3-instruction-framework.mp4',
            transcript: `Let me share my framework for writing Custom GPT instructions that work.

THE FIVE-SECTION FRAMEWORK:

SECTION 1: IDENTITY
Start by defining who the GPT is.

Example: "You are an expert technical writer who specializes in creating clear, user-friendly documentation for software products."

This shapes the voice and expertise level.

SECTION 2: PRIMARY TASK
Clearly state the main job.

Example: "Your primary task is to help users transform rough feature descriptions into polished documentation that developers and end-users can easily follow."

SECTION 3: PROCESS / STEPS
Define how the GPT should approach tasks.

Example:
"When a user provides a feature description:
1. Ask clarifying questions if the description is incomplete
2. Create an outline with: Overview, Prerequisites, Step-by-step instructions, Examples, Troubleshooting
3. Write each section with clear, concise language
4. End with a summary of what was documented"

SECTION 4: OUTPUT SPECIFICATIONS
Define the format and style.

Example: "Format all documentation with clear headers. Use numbered steps for procedures. Include code examples in code blocks. Keep sentences under 25 words where possible."

SECTION 5: CONSTRAINTS AND GUARDRAILS
Set boundaries.

Example:
"Do not:
- Invent features that weren't described
- Provide code that hasn't been tested
- Make assumptions about technical architecture without asking

If the user's input is unclear, ask for clarification before proceeding."

PUT IT ALL TOGETHER:

A complete instruction set might be 200-500 words. That's okay—thorough instructions produce better results.`,
            duration: 420,
            chapters: [
              { time: 0, title: 'The Five-Section Framework' },
              { time: 60, title: 'Identity and Primary Task' },
              { time: 150, title: 'Process and Output Specs' },
              { time: 280, title: 'Constraints and Guardrails' },
              { time: 360, title: 'Putting It Together' },
            ],
            keyTakeaways: [
              'Five sections: Identity, Task, Process, Output, Constraints',
              'Be thorough—200-500 words is normal',
              'Constraints prevent unwanted behavior',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '3.3-reading1',
          lessonId: '3.3',
          type: 'reading',
          title: 'Instruction Template and Examples',
          content: {
            body: `# Instruction Template and Examples

## The Template

\`\`\`
## Identity
You are [role/expertise]. You [key characteristic or approach].

## Primary Task
Your main job is to [clear description of what this GPT does].

## Process
When the user [trigger], follow these steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Output Format
- [Format requirement 1]
- [Format requirement 2]
- [Style requirement]

## Constraints
Do not:
- [Constraint 1]
- [Constraint 2]

If [edge case], then [how to handle].
\`\`\`

## Example: Email Tone Adjuster

\`\`\`
## Identity
You are a communication specialist who helps professionals adjust the tone of their emails while preserving the core message.

## Primary Task
Help users rewrite their emails in a different tone—making them more formal, casual, direct, or diplomatic as requested.

## Process
1. Ask the user to paste their email and specify the desired tone
2. Identify the key message and any action items
3. Rewrite the email in the requested tone
4. Highlight what changed and why

## Output Format
- Present the rewritten email first
- Follow with a brief "Changes Made" section explaining 2-3 key adjustments

## Constraints
- Preserve all factual content and deadlines
- Do not add information that wasn't in the original
- If the requested tone seems inappropriate for the content, gently suggest an alternative
\`\`\``,
            highlights: [
              'Template: Identity, Task, Process, Output, Constraints',
              'Be specific about steps and format',
              'Include edge case handling',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '3.3-video2',
          lessonId: '3.3',
          type: 'video',
          title: 'Testing and Iterating',
          content: {
            videoUrl: '/videos/ai-work/3.3-testing.mp4',
            transcript: `You've written your instructions—now comes the critical step: testing.

THE TESTING PROCESS:

STEP 1: TEST THE HAPPY PATH
Try the most common use case. Does it work as expected?

Example for Meeting Notes GPT: Paste typical meeting notes. Does the output have all sections? Is the format right?

STEP 2: TEST EDGE CASES
Push the boundaries:
- What if input is incomplete?
- What if it's very short or very long?
- What if it contains unusual content?

Example: Paste notes with no clear action items. Does the GPT handle it gracefully?

STEP 3: TEST CONSTRAINTS
Try to make it do things it shouldn't.
Does it stay within its boundaries?

Example: Ask it to do something outside its purpose. Does it redirect appropriately?

ITERATING ON INSTRUCTIONS:

When something doesn't work:

1. IDENTIFY the gap
What did it do wrong? What did you expect instead?

2. LOCATE the cause
Is the instruction missing, vague, or wrong?

3. REVISE specifically
Add or clarify the instruction

4. TEST again
Verify the fix worked without breaking other things

COMMON FIXES:

"Output is too long" → Add: "Keep responses under [X] words"

"Misses important details" → Add: "Always include [specific elements]"

"Goes off-topic" → Add to constraints: "Stay focused on [scope]. If asked about other topics, redirect to primary purpose."

"Doesn't ask clarifying questions" → Add: "If input is incomplete or ambiguous, ask one specific clarifying question before proceeding."

REMEMBER:

You'll rarely get it perfect on the first try. Plan for 2-3 rounds of testing and revision.`,
            duration: 360,
            chapters: [
              { time: 0, title: 'The Testing Process' },
              { time: 100, title: 'Testing Edge Cases' },
              { time: 180, title: 'Iterating on Instructions' },
              { time: 280, title: 'Common Fixes' },
            ],
            keyTakeaways: [
              'Test: happy path, edge cases, constraints',
              'Iterate: identify, locate, revise, test',
              'Expect 2-3 rounds of revision',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '3.3-quiz',
          lessonId: '3.3',
          type: 'quiz',
          title: 'Lesson 3.3 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q3.3.1',
                type: 'multiple-choice',
                question: 'What are the five sections of the instruction writing framework?',
                options: [
                  'Name, Description, Picture, Starters, Actions',
                  'Identity, Primary Task, Process, Output Format, Constraints',
                  'Role, Task, Context, Format, Review',
                  'Introduction, Body, Examples, Summary, Conclusion',
                ],
                correctAnswer: 1,
                explanation: 'The five-section framework for GPT instructions is: Identity (who it is), Primary Task (what it does), Process (how it works), Output Format (structure), and Constraints (boundaries).',
                difficulty: 2,
                skills: ['M3-gpt-instructions'],
              },
              {
                id: 'q3.3.2',
                type: 'multiple-choice',
                question: 'When testing a Custom GPT, what should you test AFTER the basic happy path?',
                options: [
                  'Only the profile picture',
                  'Edge cases and constraint boundaries',
                  'How fast it responds',
                  'Whether it can browse the internet',
                ],
                correctAnswer: 1,
                explanation: 'After testing the happy path, you should test edge cases (unusual inputs, incomplete data) and try to push against constraints to ensure the GPT handles them appropriately.',
                difficulty: 2,
                skills: ['M3-gpt-testing'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
  ],
  isLocked: false,
};

// ============================================
// MODULE 4: No-Code AI Agents
// ============================================

export const AI_WORK_MODULE_4: Module = {
  id: 'ai-m4',
  courseId: 'ai-at-work',
  number: 4,
  title: 'No-Code AI Agents',
  objectives: [
    'Describe what AI agents are and how they differ from prompts or GPTs',
    'Identify appropriate use cases for simple AI agents',
    'Build a basic AI agent using ChatGPT or a no-code platform',
    'Connect an AI agent to external tools and data sources',
  ],
  estimatedMinutes: 150,
  lessons: [
    // Lesson 4.1: Understanding AI Agents
    {
      id: '4.1',
      moduleId: 'ai-m4',
      number: 1,
      title: 'Understanding AI Agents',
      objectives: [
        'Define what an AI agent is',
        'Explain the difference between prompts, Custom GPTs, and agents',
        'Identify appropriate use cases for AI agents',
      ],
      estimatedMinutes: 20,
      atoms: [
        {
          id: '4.1-intro',
          lessonId: '4.1',
          type: 'reading',
          title: 'What Are AI Agents?',
          content: {
            body: `# What Are AI Agents?

AI agents take automation a step further. Instead of just responding to prompts, they can take actions, use tools, and work autonomously toward a goal.

## The Evolution

1. **Prompts**: You ask, AI responds
2. **Custom GPTs**: Pre-configured AI with knowledge
3. **AI Agents**: AI that can take actions and use tools

## Simple Definition

An AI agent is an AI system that can:
- Understand a goal
- Break it into steps
- Take actions to accomplish those steps
- Use external tools when needed`,
            highlights: [
              'Agents take actions, not just respond',
              'They break goals into steps',
              'They use external tools',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '4.1-video1',
          lessonId: '4.1',
          type: 'video',
          title: 'Prompts vs GPTs vs Agents',
          content: {
            videoUrl: '/videos/ai-work/4.1-agents-overview.mp4',
            transcript: `Let's clearly distinguish between prompts, Custom GPTs, and AI agents.

PROMPTS:
You give input, AI gives output. That's it.
- One question → one answer
- No memory between sessions
- No actions outside the conversation

Example: "Summarize this document" → Get summary

CUSTOM GPTs:
Pre-configured ChatGPT with instructions and knowledge.
- Persistent instructions guide every response
- Can include uploaded documents for reference
- Still conversational—you ask, it responds
- No ability to take external actions

Example: Your Meeting Notes GPT formats notes consistently every time

AI AGENTS:
AI that can take actions to achieve goals.
- Given a goal, breaks it into tasks
- Can use tools: browse web, send emails, update databases
- Can work semi-autonomously
- Can be triggered automatically

Example: "When I receive a customer complaint email, analyze the issue, find relevant documentation, and draft a response"

THE KEY DIFFERENCE:

Prompts and GPTs are reactive—they wait for you to ask something.

Agents can be proactive—they can be triggered automatically and take actions without you typing anything.

REAL-WORLD ANALOGY:

- Prompt = Asking your assistant a question
- Custom GPT = Your assistant with a reference manual
- Agent = Your assistant who handles tasks end-to-end

When a customer emails, the agent assistant:
1. Reads the email (trigger)
2. Identifies the problem (reasoning)
3. Looks up relevant info (tool use)
4. Drafts a response (action)
5. Sends it for your approval (workflow)`,
            duration: 400,
            chapters: [
              { time: 0, title: 'Prompts: Ask and Receive' },
              { time: 80, title: 'Custom GPTs: Pre-configured' },
              { time: 160, title: 'AI Agents: Action-takers' },
              { time: 280, title: 'Real-World Analogy' },
            ],
            keyTakeaways: [
              'Prompts: reactive Q&A',
              'Custom GPTs: pre-configured, still conversational',
              'Agents: can take actions and use tools',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '4.1-reading1',
          lessonId: '4.1',
          type: 'reading',
          title: 'Agent Use Cases',
          content: {
            body: `# Agent Use Cases

## When to Use an Agent

Agents are valuable when:
- Tasks involve multiple steps
- External tools or data are needed
- Work can be triggered automatically
- The process is repeatable

## Common Business Use Cases

### Email & Communication
- Triage incoming support emails
- Draft responses based on templates
- Schedule follow-ups automatically

### Data & Reporting
- Pull data from multiple sources
- Generate daily/weekly reports
- Alert when metrics cross thresholds

### Content & Documents
- Gather research on a topic
- Compile information into documents
- Update records across systems

### Workflow Automation
- Route requests to right team members
- Track task completion
- Send reminders and notifications

## When NOT to Use Agents

- One-time unique tasks
- High-stakes decisions requiring human judgment
- Sensitive data without proper safeguards
- When you need creative exploration (use ChatGPT directly)`,
            highlights: [
              'Multi-step tasks with external tools',
              'Repeatable processes with triggers',
              'Avoid: high-stakes, sensitive, one-time tasks',
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '4.1-quiz',
          lessonId: '4.1',
          type: 'quiz',
          title: 'Lesson 4.1 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q4.1.1',
                type: 'multiple-choice',
                question: 'What is the key difference between a Custom GPT and an AI agent?',
                options: [
                  'Custom GPTs are free while agents cost money',
                  'Agents can take external actions and use tools, while Custom GPTs only respond conversationally',
                  'Custom GPTs are newer technology',
                  'Agents can only work with images',
                ],
                correctAnswer: 1,
                explanation: 'The key difference is that AI agents can take external actions (browse web, send emails, update databases) and use tools, while Custom GPTs are still conversational—they respond to your prompts but cannot take actions outside the chat.',
                difficulty: 2,
                skills: ['M4-agent-definition', 'M4-agent-vs-gpt'],
              },
              {
                id: 'q4.1.2',
                type: 'multiple-choice',
                question: 'Which scenario is MOST appropriate for an AI agent?',
                options: [
                  'Writing a creative short story',
                  'Automatically triaging incoming support emails and routing to the right team',
                  'Having a philosophical discussion',
                  'Getting a quick definition of a term',
                ],
                correctAnswer: 1,
                explanation: 'Agents excel at automated, multi-step workflows like email triage—they can be triggered automatically, analyze content, and take action (routing). Creative writing and discussions are better for direct ChatGPT use.',
                difficulty: 2,
                skills: ['M4-agent-use-cases'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 4.2: Exploring Automation Platforms
    {
      id: '4.2',
      moduleId: 'ai-m4',
      number: 2,
      title: 'Exploring Automation Platforms',
      objectives: [
        'Survey available no-code agent-building platforms',
        'Compare features and use cases for different platforms',
        'Identify which platform best fits different needs',
      ],
      estimatedMinutes: 25,
      atoms: [
        {
          id: '4.2-intro',
          lessonId: '4.2',
          type: 'reading',
          title: 'The No-Code Agent Landscape',
          content: {
            body: `# The No-Code Agent Landscape

Good news: You don't need to code to build AI agents. Several platforms let you create powerful automations visually.

## What These Platforms Offer

- Visual workflow builders (drag-and-drop)
- Pre-built integrations with popular apps
- AI components you can add to workflows
- Triggers to start automations automatically

## The Major Players

We'll explore three categories:
1. **ChatGPT's built-in tools** (simplest)
2. **Dedicated AI agent platforms** (most AI-focused)
3. **General automation platforms with AI** (most integrations)`,
            highlights: [
              'No coding required',
              'Visual workflow builders',
              'Pre-built app integrations',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '4.2-video1',
          lessonId: '4.2',
          type: 'video',
          title: 'Platform Overview',
          content: {
            videoUrl: '/videos/ai-work/4.2-platforms.mp4',
            transcript: `Let me walk you through the main no-code options for building AI agents.

CATEGORY 1: CHATGPT BUILT-IN

ChatGPT Plus now includes some agent-like capabilities:
- GPT Actions: Connect your Custom GPT to external APIs
- Browse with Bing: Let GPT search the web
- Code Interpreter: Run Python code, analyze data
- DALL-E: Generate images

Best for: Simple enhancements to your Custom GPTs
Limitation: Can't run automatically; user must initiate

CATEGORY 2: DEDICATED AI PLATFORMS

These are built specifically for AI agents:

RELEVANCE AI:
- Build multi-step AI workflows
- Strong focus on business use cases
- Good for customer service, research agents

VOICEFLOW:
- Conversational AI focus
- Great for chatbots and voice assistants
- Visual dialogue builder

Best for: AI-first workflows where intelligence is central
Limitation: Fewer integrations than general automation tools

CATEGORY 3: AUTOMATION PLATFORMS + AI

These are general automation tools with AI added:

ZAPIER:
- 6,000+ app integrations
- AI features added to workflows
- Easy trigger-action model

MAKE (formerly Integromat):
- Visual workflow builder
- More complex logic possible
- Growing AI capabilities

MICROSOFT POWER AUTOMATE:
- Native Microsoft integration
- Enterprise-friendly
- AI Builder features

Best for: Connecting many apps together with AI in the middle
Limitation: AI capabilities less sophisticated than dedicated platforms

MY RECOMMENDATION FOR BEGINNERS:

Start with Zapier or Make—they have:
- Free tiers to learn on
- Extensive tutorials
- Huge app libraries
- AI capabilities that cover most needs`,
            duration: 420,
            chapters: [
              { time: 0, title: 'ChatGPT Built-in Tools' },
              { time: 100, title: 'Dedicated AI Platforms' },
              { time: 200, title: 'Automation + AI Platforms' },
              { time: 340, title: 'Recommendation for Beginners' },
            ],
            keyTakeaways: [
              'ChatGPT: simple, user-initiated',
              'AI platforms: intelligence-focused',
              'Automation platforms: integration-focused',
              'Start with Zapier or Make',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '4.2-reading1',
          lessonId: '4.2',
          type: 'reading',
          title: 'Platform Comparison Guide',
          content: {
            body: `# Platform Comparison Guide

## Quick Reference Table

| Platform | Best For | AI Capability | Integrations | Ease of Use |
|----------|----------|---------------|--------------|-------------|
| ChatGPT Actions | Enhancing Custom GPTs | High | Limited (API only) | Medium |
| Zapier | Connecting many apps | Medium | Very High (6000+) | High |
| Make | Complex workflows | Medium | High (1000+) | Medium |
| Relevance AI | AI-first workflows | Very High | Medium | Medium |
| Power Automate | Microsoft ecosystem | Medium | High (Microsoft+) | Medium |

## Decision Guide

**Choose ChatGPT Actions if:**
- You already have a Custom GPT you want to enhance
- Your integration is API-based
- You want to stay within ChatGPT interface

**Choose Zapier if:**
- You need to connect many different apps
- You want the simplest setup experience
- Your workflow is straightforward trigger → action

**Choose Make if:**
- You need more complex conditional logic
- You want more control over data transformation
- Price sensitivity (often cheaper than Zapier)

**Choose Relevance AI if:**
- AI reasoning is central to your workflow
- You're building something customer-facing
- You need sophisticated AI chains

**Choose Power Automate if:**
- Your organization uses Microsoft 365
- IT department prefers Microsoft tools
- You need enterprise compliance features`,
            highlights: [
              'Zapier: most integrations, easiest',
              'Make: complex logic, cost-effective',
              'Relevance AI: AI-first workflows',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '4.2-quiz',
          lessonId: '4.2',
          type: 'quiz',
          title: 'Lesson 4.2 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q4.2.1',
                type: 'multiple-choice',
                question: 'Which platform would be best for a beginner who needs to connect many different apps (Gmail, Slack, Notion, etc.) with AI?',
                options: [
                  'ChatGPT Actions',
                  'Zapier or Make',
                  'A dedicated AI platform like Relevance AI',
                  'Building custom code',
                ],
                correctAnswer: 1,
                explanation: 'Zapier and Make are best for beginners needing many app integrations. They have thousands of pre-built connections, free tiers to learn on, and extensive tutorials.',
                difficulty: 1,
                skills: ['M4-platform-selection'],
              },
              {
                id: 'q4.2.2',
                type: 'multiple-choice',
                question: 'What is the main limitation of ChatGPT\'s built-in agent features (Actions, Browse)?',
                options: [
                  'They cost extra money',
                  'They cannot run automatically—a user must initiate each interaction',
                  'They only work with Microsoft products',
                  'They cannot process text',
                ],
                correctAnswer: 1,
                explanation: 'ChatGPT\'s built-in features require user initiation. Unlike true automation platforms, they cannot be triggered automatically by events (like receiving an email).',
                difficulty: 2,
                skills: ['M4-platform-comparison'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 4.3: Building Your First AI Agent
    {
      id: '4.3',
      moduleId: 'ai-m4',
      number: 3,
      title: 'Building Your First AI Agent',
      objectives: [
        'Set up an account on a no-code automation platform',
        'Create a simple AI-powered automation',
        'Test and debug your first agent',
      ],
      estimatedMinutes: 35,
      atoms: [
        {
          id: '4.3-intro',
          lessonId: '4.3',
          type: 'reading',
          title: 'Your First Agent Project',
          content: {
            body: `# Your First Agent Project

It's time to build! We'll create a simple but practical AI agent: an email summarizer that sends you a daily digest.

## What We'll Build

**Trigger:** Daily at 8 AM
**Action 1:** Fetch unread emails from last 24 hours
**Action 2:** Use AI to summarize key points
**Action 3:** Send summary to Slack (or email)

## Why This Project?

- Simple enough to complete in one lesson
- Demonstrates key concepts (trigger, AI, action)
- Actually useful in daily work`,
            highlights: [
              'Daily email summary agent',
              'Demonstrates: trigger, AI, action',
              'Practical and useful',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '4.3-video1',
          lessonId: '4.3',
          type: 'video',
          title: 'Building the Agent Step-by-Step',
          content: {
            videoUrl: '/videos/ai-work/4.3-build-agent.mp4',
            transcript: `Let's build your first AI agent together using Zapier. The same concepts apply to Make and other platforms.

STEP 1: CREATE YOUR ZAP

Log into Zapier (zapier.com). Click "Create Zap."

STEP 2: SET UP THE TRIGGER

Search for "Schedule by Zapier"
Select "Every Day"
Set time to 8:00 AM
Save and continue

STEP 3: ADD EMAIL FETCH

Click the + to add a step
Search for "Gmail" (or your email provider)
Select "Find Email"
Configure:
- Search: "is:unread after:yesterday"
- Max results: 10
Connect your Gmail account
Test to see sample emails

STEP 4: ADD AI SUMMARIZATION

Click + to add another step
Search for "ChatGPT" or "OpenAI"
Select "Conversation"
Write your prompt:
"Summarize these emails into a brief daily digest. For each email, include:
- Sender
- Subject
- One-sentence summary
- Whether action is needed (Yes/No)

Emails:
[Insert email data from previous step]"

Map the email content from Step 3 into your prompt
Test to see the AI summary

STEP 5: SEND THE SUMMARY

Click + for final step
Search for "Slack" (or "Gmail" for email delivery)
Select "Send Channel Message"
Choose your channel
For message, select the AI output from Step 4
Test to send a sample

STEP 6: TURN IT ON

Name your Zap: "Daily Email Digest"
Click "Publish"

You now have a working AI agent!

WHAT WE BUILT:
- Automated trigger (schedule)
- Data fetch (email)
- AI processing (summarization)
- Output action (Slack message)

This pattern—trigger, process, act—is the foundation of all AI agents.`,
            duration: 540,
            chapters: [
              { time: 0, title: 'Getting Started' },
              { time: 60, title: 'Setting the Trigger' },
              { time: 120, title: 'Fetching Emails' },
              { time: 220, title: 'Adding AI Summarization' },
              { time: 360, title: 'Sending the Output' },
              { time: 460, title: 'Publishing Your Agent' },
            ],
            keyTakeaways: [
              'Pattern: trigger → process → act',
              'Use ChatGPT/OpenAI step for AI',
              'Map data between steps',
            ],
          },
          estimatedMinutes: 10,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '4.3-reading1',
          lessonId: '4.3',
          type: 'reading',
          title: 'Troubleshooting Common Issues',
          content: {
            body: `# Troubleshooting Common Issues

## "No Data" in Test Step

**Cause:** The previous step didn't return data during testing
**Fix:**
- Make sure test data exists (e.g., send yourself an email first)
- Check filters aren't too restrictive
- Try "Skip Test" and use sample data

## AI Output Is Wrong or Empty

**Cause:** Prompt issue or data mapping problem
**Fix:**
- Check that email content is actually being passed to the prompt
- Make your prompt more specific
- Test the same prompt in ChatGPT directly first

## "Connection Failed" Errors

**Cause:** Authentication issue with connected app
**Fix:**
- Reconnect the account
- Check if permissions were granted
- Ensure account is still active

## Automation Runs But Nothing Happens

**Cause:** Trigger conditions not met
**Fix:**
- Check trigger settings (time, filters)
- Look at Zap history for error messages
- Verify all steps show "Success" in testing

## Best Practices

1. **Test each step individually** before running the full automation
2. **Start with simple versions** and add complexity gradually
3. **Check your Zap history** regularly to catch issues early
4. **Set up error notifications** so you know when something breaks`,
            highlights: [
              'Test each step individually',
              'Check data mapping between steps',
              'Review Zap history for errors',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '4.3-quiz',
          lessonId: '4.3',
          type: 'quiz',
          title: 'Lesson 4.3 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q4.3.1',
                type: 'multiple-choice',
                question: 'What is the basic pattern of an AI agent workflow?',
                options: [
                  'Input → Output',
                  'Question → Answer',
                  'Trigger → Process (with AI) → Action',
                  'Start → Middle → End',
                ],
                correctAnswer: 2,
                explanation: 'AI agent workflows follow the Trigger → Process → Action pattern. A trigger starts the automation, AI processes/analyzes data, and an action delivers the result.',
                difficulty: 1,
                skills: ['M4-agent-workflow'],
              },
              {
                id: 'q4.3.2',
                type: 'multiple-choice',
                question: 'If your AI step returns empty or wrong output, what should you check FIRST?',
                options: [
                  'Whether the moon phase affects AI',
                  'Whether data from the previous step is actually being mapped into the AI prompt',
                  'Whether you spelled everything correctly',
                  'Whether you need a faster computer',
                ],
                correctAnswer: 1,
                explanation: 'When AI output is wrong, the most common cause is data mapping—the content from previous steps isn\'t being passed correctly into the AI prompt. Always check your variable mappings first.',
                difficulty: 2,
                skills: ['M4-agent-debugging'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 4.4: Connecting AI to Your Tools
    {
      id: '4.4',
      moduleId: 'ai-m4',
      number: 4,
      title: 'Connecting AI to Your Tools',
      objectives: [
        'Identify data sources that can feed AI agents',
        'Configure integrations between common workplace tools',
        'Map data appropriately between systems',
      ],
      estimatedMinutes: 30,
      atoms: [
        {
          id: '4.4-intro',
          lessonId: '4.4',
          type: 'reading',
          title: 'The Integration Mindset',
          content: {
            body: `# The Integration Mindset

The power of AI agents comes from connecting them to your actual work tools. An AI that can read your emails, update your CRM, and post to Slack is far more useful than one that just sits in a chat window.

## Common Integration Points

**Input Sources (Triggers):**
- Email (Gmail, Outlook)
- Calendar events
- Form submissions
- Database changes
- Chat messages
- File uploads

**Output Destinations (Actions):**
- Task managers (Asana, Notion, Trello)
- Communication (Slack, Teams, Email)
- Documents (Google Docs, Sheets)
- CRM (Salesforce, HubSpot)
- Databases`,
            highlights: [
              'Connect AI to real work tools',
              'Inputs: email, calendar, forms, files',
              'Outputs: tasks, chat, docs, CRM',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '4.4-video1',
          lessonId: '4.4',
          type: 'video',
          title: 'Common Integration Patterns',
          content: {
            videoUrl: '/videos/ai-work/4.4-integrations.mp4',
            transcript: `Let's explore the most valuable integration patterns for AI agents.

PATTERN 1: EMAIL → AI → TASK

When an email arrives:
1. AI analyzes the content
2. Determines if action is needed
3. Creates a task with relevant details

Example setup:
- Trigger: New email in specific folder
- AI: "Analyze this email. Is there an action item? If yes, write a task title and due date."
- Action: Create task in Asana/Notion

PATTERN 2: FORM → AI → RESPONSE

When someone submits a form:
1. AI processes their input
2. Generates appropriate response
3. Sends personalized reply

Example: Contact form → AI drafts response → Sends email

PATTERN 3: DATABASE → AI → REPORT

On a schedule:
1. Pull data from database/spreadsheet
2. AI analyzes trends
3. Generate and send report

Example: Weekly sales data → AI analysis → Slack summary

PATTERN 4: MEETING → AI → DOCUMENTATION

After a meeting:
1. Get meeting recording/notes
2. AI extracts action items
3. Update relevant systems

Example: Zoom recording → AI transcription & summary → Tasks created

INTEGRATION TIPS:

1. START WITH YOUR PAIN POINTS
What manual work annoys you most? That's your first automation.

2. FOLLOW YOUR DATA
Where does information enter your workflow? Where does it need to go?

3. KEEP IT SIMPLE FIRST
Get a basic version working before adding complexity.

4. CONSIDER PERMISSIONS
Make sure your connected accounts have the right access levels.

5. PLAN FOR ERRORS
What happens if the AI misunderstands? Build in human review for critical outputs.`,
            duration: 420,
            chapters: [
              { time: 0, title: 'Pattern 1: Email → AI → Task' },
              { time: 90, title: 'Pattern 2: Form → AI → Response' },
              { time: 160, title: 'Pattern 3: Database → AI → Report' },
              { time: 230, title: 'Pattern 4: Meeting → AI → Docs' },
              { time: 300, title: 'Integration Tips' },
            ],
            keyTakeaways: [
              'Common patterns: email→task, form→response, data→report',
              'Start with your biggest pain points',
              'Build human review into critical workflows',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '4.4-reading1',
          lessonId: '4.4',
          type: 'reading',
          title: 'Data Mapping Best Practices',
          content: {
            body: `# Data Mapping Best Practices

## What is Data Mapping?

Data mapping connects the output of one step to the input of another. It's how your automation moves information between systems.

## Common Mapping Scenarios

### Email to AI Prompt
Map:
- Email subject → Include in prompt context
- Email body → Main content for AI to analyze
- Sender → Include for personalization

### AI Output to Task
Map:
- AI-generated title → Task name
- AI-generated description → Task notes
- AI-suggested date → Due date field

### Form to Response
Map:
- Submitter name → Response greeting
- Form responses → AI context
- Submitter email → Reply recipient

## Mapping Tips

**Be Explicit With AI:**
\`\`\`
Analyze this email:
Subject: {{email_subject}}
From: {{sender_name}}
Body: {{email_body}}
\`\`\`

**Handle Missing Data:**
Not all fields will always be populated. Your AI prompt should handle this:
"If no due date is mentioned, suggest 'No deadline specified.'"

**Format Appropriately:**
Different systems expect different formats. Dates especially:
- Notion might want: 2024-03-15
- Asana might want: March 15, 2024

**Test With Real Data:**
Sample data might not reveal edge cases. Test with actual examples from your workflow.`,
            highlights: [
              'Map specific fields to AI prompts',
              'Handle missing data gracefully',
              'Test with real data, not just samples',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '4.4-quiz',
          lessonId: '4.4',
          type: 'quiz',
          title: 'Lesson 4.4 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q4.4.1',
                type: 'multiple-choice',
                question: 'Which integration pattern would help automate creating tasks from incoming customer emails?',
                options: [
                  'Form → AI → Response',
                  'Email → AI → Task',
                  'Database → AI → Report',
                  'Meeting → AI → Documentation',
                ],
                correctAnswer: 1,
                explanation: 'The Email → AI → Task pattern is perfect for this. The email triggers the automation, AI analyzes and extracts action items, and tasks are created in your task management system.',
                difficulty: 1,
                skills: ['M4-integration-patterns'],
              },
              {
                id: 'q4.4.2',
                type: 'multiple-choice',
                question: 'When mapping data from email to an AI prompt, why should you be explicit about labeling each field?',
                options: [
                  'It makes the prompt longer',
                  'It helps the AI understand what each piece of information is and how to use it',
                  'It is required by Zapier',
                  'It makes the automation run faster',
                ],
                correctAnswer: 1,
                explanation: 'Explicitly labeling fields (Subject:, From:, Body:) helps the AI understand the structure and context of the data, leading to better analysis and more appropriate responses.',
                difficulty: 2,
                skills: ['M4-data-mapping'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
    // Lesson 4.5: Maintaining and Improving Your Agents
    {
      id: '4.5',
      moduleId: 'ai-m4',
      number: 5,
      title: 'Maintaining and Improving Your Agents',
      objectives: [
        'Monitor agent performance and identify issues',
        'Iterate on agent design based on results',
        'Apply best practices for long-term agent maintenance',
      ],
      estimatedMinutes: 25,
      atoms: [
        {
          id: '4.5-intro',
          lessonId: '4.5',
          type: 'reading',
          title: 'Agents Need Ongoing Care',
          content: {
            body: `# Agents Need Ongoing Care

Building an agent is just the beginning. Like any system, agents need monitoring, maintenance, and improvement over time.

## Common Issues That Emerge

- AI output quality drifts
- Connected apps change their APIs
- Edge cases you didn't anticipate
- Business needs evolve

## The Maintenance Mindset

Think of your agents like employees:
- They need feedback
- They need updated training
- They need supervision (at first)
- They get better with iteration`,
            highlights: [
              'Agents need ongoing attention',
              'Monitor for drift and issues',
              'Iterate based on results',
            ],
          },
          estimatedMinutes: 2,
          isRequired: true,
          masteryThreshold: 60,
        },
        {
          id: '4.5-video1',
          lessonId: '4.5',
          type: 'video',
          title: 'Monitoring and Improving Agents',
          content: {
            videoUrl: '/videos/ai-work/4.5-maintenance.mp4',
            transcript: `Let's talk about keeping your agents running well over time.

MONITORING YOUR AGENTS

Most platforms have a "History" or "Runs" view. Check it regularly.

WHAT TO LOOK FOR:

1. SUCCESS RATE
Are runs completing successfully? What percentage fail?

2. TIMING
How long does each run take? Are some steps slow?

3. ERROR PATTERNS
When failures happen, is there a pattern?

4. OUTPUT QUALITY
Spot-check AI outputs. Are they still good?

IMPROVEMENT STRATEGIES:

STRATEGY 1: PROMPT REFINEMENT
If AI output quality is inconsistent:
- Collect examples of bad output
- Identify what went wrong
- Add specific instructions to prevent those issues
- Example: "If the email is a newsletter or marketing, respond with 'No action needed' instead of creating a task."

STRATEGY 2: ADD FILTERS
If your agent triggers too often:
- Add conditions to the trigger
- Filter out irrelevant inputs before they reach AI
- Example: Only process emails from specific senders

STRATEGY 3: ADD ERROR HANDLING
If failures crash the whole workflow:
- Add conditional paths for errors
- Send yourself alerts when issues occur
- Example: If task creation fails, send Slack message instead

STRATEGY 4: HUMAN-IN-THE-LOOP
If stakes are high:
- Add approval steps before final action
- Send drafts for review before sending
- Example: AI drafts response → You approve → Then it sends

THE IMPROVEMENT CYCLE:

1. Monitor results (weekly check)
2. Identify issues (what's not working?)
3. Form hypothesis (why is it happening?)
4. Make targeted change (one thing at a time)
5. Test and validate (did it help?)
6. Repeat

LONG-TERM MAINTENANCE:

- Review agents quarterly
- Update prompts when business needs change
- Retire agents that are no longer needed
- Document what each agent does and why`,
            duration: 420,
            chapters: [
              { time: 0, title: 'Monitoring Your Agents' },
              { time: 100, title: 'Improvement Strategies' },
              { time: 280, title: 'The Improvement Cycle' },
              { time: 360, title: 'Long-Term Maintenance' },
            ],
            keyTakeaways: [
              'Monitor: success rate, timing, errors, quality',
              'Improve: prompts, filters, error handling, human review',
              'Cycle: monitor → identify → change → test → repeat',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: '4.5-reading1',
          lessonId: '4.5',
          type: 'reading',
          title: 'Agent Maintenance Checklist',
          content: {
            body: `# Agent Maintenance Checklist

## Weekly Review

- [ ] Check run history for failures
- [ ] Spot-check 2-3 AI outputs for quality
- [ ] Note any patterns in issues
- [ ] Clear any stuck runs

## Monthly Review

- [ ] Review success rate trend
- [ ] Update any outdated prompts
- [ ] Check if triggers still match current needs
- [ ] Review connected account permissions

## Quarterly Review

- [ ] Evaluate if agent still serves its purpose
- [ ] Consider improvements based on accumulated feedback
- [ ] Update documentation
- [ ] Archive or retire unused agents

## Improvement Log Template

Keep a simple log of changes:

| Date | Agent | Change | Reason | Result |
|------|-------|--------|--------|--------|
| 3/15 | Email Digest | Added filter for marketing emails | Too many newsletters | Reduced false triggers by 70% |
| 3/22 | Task Creator | Updated prompt for priority | Tasks weren't prioritized | Now correctly flags urgent |

## Red Flags to Watch For

⚠️ Success rate drops below 90%
⚠️ Same error occurs 3+ times
⚠️ Users report incorrect outputs
⚠️ Run times increase significantly
⚠️ Connected app changes authentication`,
            highlights: [
              'Weekly: check failures and quality',
              'Monthly: review trends, update prompts',
              'Quarterly: evaluate purpose, archive unused',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: '4.5-quiz',
          lessonId: '4.5',
          type: 'quiz',
          title: 'Lesson 4.5 Practice Quiz',
          content: {
            questions: [
              {
                id: 'q4.5.1',
                type: 'multiple-choice',
                question: 'What should you do if your AI agent\'s output quality starts declining?',
                options: [
                  'Delete the agent and start over',
                  'Collect examples of bad output, identify patterns, and refine the prompt',
                  'Ignore it—AI quality naturally varies',
                  'Switch to a different AI provider',
                ],
                correctAnswer: 1,
                explanation: 'When quality declines, the best approach is to collect examples of bad output, identify what went wrong, and refine the prompt with specific instructions to prevent those issues.',
                difficulty: 2,
                skills: ['M4-agent-improvement'],
              },
              {
                id: 'q4.5.2',
                type: 'multiple-choice',
                question: 'How often should you do a comprehensive review of your AI agents?',
                options: [
                  'Daily',
                  'Never—once built, they run forever',
                  'Quarterly—evaluate if agents still serve their purpose',
                  'Only when something breaks',
                ],
                correctAnswer: 2,
                explanation: 'Quarterly reviews help ensure agents still align with business needs. Weekly and monthly checks catch operational issues, but quarterly reviews address strategic fit and whether the agent is still valuable.',
                difficulty: 1,
                skills: ['M4-agent-maintenance'],
              },
            ],
            passingScore: 75,
            shuffleQuestions: true,
            shuffleOptions: true,
          },
          estimatedMinutes: 3,
          isRequired: true,
          masteryThreshold: 75,
        },
      ],
      isLocked: false,
    },
  ],
  isLocked: false,
};

// Export all modules together
export const AI_AT_WORK_MODULES = [
  AI_WORK_MODULE_1,
  AI_WORK_MODULE_2,
  AI_WORK_MODULE_3,
  AI_WORK_MODULE_4,
];

// Helper to get module by lesson ID
export function getModuleByLessonId(lessonId: string): Module | undefined {
  for (const module of AI_AT_WORK_MODULES) {
    if (module.lessons.some(l => l.id === lessonId)) {
      return module;
    }
  }
  return undefined;
}

// Helper to get lesson by ID
export function getLessonById(lessonId: string): Lesson | undefined {
  for (const module of AI_AT_WORK_MODULES) {
    const lesson = module.lessons.find(l => l.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}
