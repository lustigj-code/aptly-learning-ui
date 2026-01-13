import type { Course, Module, Lesson, Atom, Badge, User, StreakData, UserProgress, UserPreferences } from '@/types';
import {
  AI_AT_WORK_COURSE,
  AI_AT_WORK_MODULES,
  AI_WORK_MODULE_1,
  AI_WORK_MODULE_2,
  AI_WORK_MODULE_3,
  AI_WORK_MODULE_4,
  getLessonById as getAIWorkLessonById,
} from './aiAtWorkCourse';

// ============================================
// BADGES
// ============================================

export const BADGES: Badge[] = [
  {
    id: 'first-lesson',
    type: 'milestone',
    title: 'First Steps',
    description: 'Completed your first lesson',
    icon: 'check',
    rarity: 'common',
    criteria: { type: 'completion', threshold: 1 },
  },
  {
    id: 'streak-7',
    type: 'streak',
    title: 'Week Warrior',
    description: 'Maintained a 7-day streak',
    icon: 'flame',
    rarity: 'uncommon',
    criteria: { type: 'streak', threshold: 7 },
  },
  {
    id: 'streak-30',
    type: 'streak',
    title: 'Monthly Master',
    description: 'Maintained a 30-day streak',
    icon: 'flame',
    rarity: 'rare',
    criteria: { type: 'streak', threshold: 30 },
  },
  {
    id: 'streak-90',
    type: 'streak',
    title: '90 Day Legend',
    description: 'Maintained a 90-day streak',
    icon: 'flame',
    rarity: 'legendary',
    criteria: { type: 'streak', threshold: 90 },
  },
  {
    id: 'course-1-complete',
    type: 'skill',
    title: 'Social Media Foundations',
    description: 'Mastered Course 1: Introduction to Social Media Marketing',
    icon: 'award',
    rarity: 'uncommon',
    criteria: { type: 'completion', threshold: 1, relatedEntityId: 'course-1' },
  },
  {
    id: 'course-2-complete',
    type: 'skill',
    title: 'Content Creator',
    description: 'Mastered Course 2: Social Media Management',
    icon: 'award',
    rarity: 'uncommon',
    criteria: { type: 'completion', threshold: 1, relatedEntityId: 'course-2' },
  },
  {
    id: 'perfect-quiz',
    type: 'special',
    title: 'Perfectionist',
    description: 'Scored 100% on a quiz',
    icon: 'star',
    rarity: 'rare',
    criteria: { type: 'score', threshold: 100 },
  },
  {
    id: 'comeback-kid',
    type: 'special',
    title: 'Comeback Kid',
    description: 'Mastered a concept after struggling',
    icon: 'zap',
    rarity: 'rare',
    criteria: { type: 'custom', threshold: 3 },
  },
  {
    id: 'early-bird',
    type: 'special',
    title: 'Early Bird',
    description: 'Completed 5 lessons before 9 AM',
    icon: 'star',
    rarity: 'uncommon',
    criteria: { type: 'custom', threshold: 5 },
  },
  {
    id: 'exam-ready',
    type: 'milestone',
    title: 'Certification Ready',
    description: 'Completed all courses and ready for the Meta exam',
    icon: 'trophy',
    rarity: 'legendary',
    criteria: { type: 'completion', threshold: 5 },
  },
];

// ============================================
// COURSE CONTENT
// ============================================

export const COURSES: Course[] = [
  {
    id: 'course-1',
    number: 1,
    title: 'Introduction to Social Media Marketing',
    description: 'Learn the foundations of social media marketing and establish your presence across platforms.',
    objectives: [
      'Understand the social media landscape',
      'Create a social media marketing strategy',
      'Set up business accounts on major platforms',
      'Identify your target audience',
    ],
    estimatedHours: 18,
    modules: [],
    isLocked: false,
    prerequisites: [],
  },
  {
    id: 'course-2',
    number: 2,
    title: 'Social Media Management',
    description: 'Master content creation, scheduling, and community management.',
    objectives: [
      'Create engaging social media content',
      'Develop a content calendar',
      'Manage online communities effectively',
      'Handle customer service on social',
    ],
    estimatedHours: 20,
    modules: [],
    isLocked: false,
    prerequisites: ['course-1'],
  },
  {
    id: 'course-3',
    number: 3,
    title: 'Social Media Advertising with Meta',
    description: 'Learn to create and manage paid advertising campaigns on Facebook and Instagram.',
    objectives: [
      'Set up Meta Ads Manager',
      'Create effective ad campaigns',
      'Target the right audiences',
      'Manage advertising budgets',
    ],
    estimatedHours: 24,
    modules: [],
    isLocked: false,
    prerequisites: ['course-2'],
  },
  {
    id: 'course-4',
    number: 4,
    title: 'Measure and Optimize Social Media Marketing',
    description: 'Learn to measure results, analyze data, and optimize your campaigns for better performance.',
    objectives: [
      'Understand key marketing metrics',
      'Calculate ROI and ROAS',
      'Implement A/B testing',
      'Use attribution models',
    ],
    estimatedHours: 22,
    modules: [],
    isLocked: true,
    prerequisites: ['course-3'],
  },
  {
    id: 'course-5',
    number: 5,
    title: 'Create a Campaign Strategy',
    description: 'Bring it all together with a comprehensive campaign strategy and final project.',
    objectives: [
      'Develop an integrated campaign strategy',
      'Present campaign results effectively',
      'Prepare for the Meta certification exam',
    ],
    estimatedHours: 18,
    modules: [],
    isLocked: true,
    prerequisites: ['course-4'],
  },
];

// Sample detailed module for Course 3
export const COURSE_3_MODULE_1: Module = {
  id: 'c3-m1',
  courseId: 'course-3',
  number: 1,
  title: 'Getting Started with Meta Ads',
  objectives: [
    'Navigate Meta Ads Manager',
    'Understand campaign structure',
    'Set up your first campaign',
  ],
  estimatedMinutes: 90,
  lessons: [
    {
      id: 'c3-m1-l1',
      moduleId: 'c3-m1',
      number: 1,
      title: 'Introduction to Meta Ads Manager',
      objectives: ['Navigate the Ads Manager interface'],
      estimatedMinutes: 15,
      atoms: [
        {
          id: 'c3-m1-l1-a1',
          lessonId: 'c3-m1-l1',
          type: 'video',
          title: 'Tour of Meta Ads Manager',
          content: {
            videoUrl: '/videos/fsm/campaign-budget.mp4',
            transcript: 'Welcome to Meta Ads Manager, the powerful tool that will help you create and manage your advertising campaigns...',
            duration: 312,
            chapters: [
              { time: 0, title: 'Introduction' },
              { time: 60, title: 'Navigation Overview' },
              { time: 180, title: 'Key Features' },
            ],
            keyTakeaways: [
              'Ads Manager is your central hub for all Meta advertising',
              'The interface has three main sections: Campaigns, Ad Sets, and Ads',
              'You can access performance data and insights from the dashboard',
            ],
          },
          estimatedMinutes: 6,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: 'c3-m1-l1-a2',
          lessonId: 'c3-m1-l1',
          type: 'reading',
          title: 'Campaign Structure Basics',
          content: {
            body: `# Understanding Campaign Structure

Meta ads are organized in a three-tier hierarchy:

## 1. Campaign Level
This is where you set your marketing objective. Your objective tells Meta what you want to achieve with your ads.

**Common objectives include:**
- Awareness (reach new people)
- Traffic (drive visits to your website)
- Engagement (get more interactions)
- Leads (collect contact information)
- Sales (drive purchases)

## 2. Ad Set Level
This is where you define:
- **Audience:** Who sees your ads
- **Placement:** Where your ads appear
- **Budget:** How much you spend
- **Schedule:** When your ads run

## 3. Ad Level
This is the creative—the actual content people see:
- Images or videos
- Headlines and descriptions
- Call-to-action buttons

> **Pro Tip:** Think of it like a tree: the Campaign is the trunk, Ad Sets are branches, and Ads are the leaves.`,
            highlights: [
              'Campaign = Objective',
              'Ad Set = Audience + Budget + Schedule',
              'Ad = Creative content',
            ],
            relatedResources: [
              { title: 'Meta Ads Help Center', url: 'https://www.facebook.com/business/help', type: 'article' },
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: 'c3-m1-l1-a3',
          lessonId: 'c3-m1-l1',
          type: 'practice',
          title: 'Describe the Campaign Structure',
          content: {
            type: 'ai-conversation',
            prompt: "In your own words, explain the three levels of Meta's campaign structure and what you define at each level.",
            context: 'The learner just read about campaign structure. Assess their understanding and correct any misconceptions gently.',
            expectedOutcomes: [
              'Correctly identifies Campaign, Ad Set, and Ad levels',
              'Explains what is set at each level',
            ],
            rubric: [
              { criterion: 'Identifies all three levels', weight: 30 },
              { criterion: 'Correctly describes Campaign level (objectives)', weight: 25 },
              { criterion: 'Correctly describes Ad Set level (audience, budget, schedule)', weight: 25 },
              { criterion: 'Correctly describes Ad level (creative)', weight: 20 },
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 60,
        },
      ],
      isLocked: false,
    },
    {
      id: 'c3-m1-l2',
      moduleId: 'c3-m1',
      number: 2,
      title: 'Setting Your Campaign Objective',
      objectives: ['Choose the right objective for your goals'],
      estimatedMinutes: 20,
      atoms: [
        {
          id: 'c3-m1-l2-a1',
          lessonId: 'c3-m1-l2',
          type: 'video',
          title: 'Choosing the Right Objective',
          content: {
            videoUrl: '/videos/fsm/campaign-objectives.mp4',
            transcript: 'Your campaign objective is the most important decision you make when setting up ads...',
            duration: 420,
            chapters: [
              { time: 0, title: 'Why Objectives Matter' },
              { time: 90, title: 'Awareness Objectives' },
              { time: 180, title: 'Consideration Objectives' },
              { time: 300, title: 'Conversion Objectives' },
            ],
            keyTakeaways: [
              'Your objective determines how Meta optimizes your ads',
              'Choose based on your actual business goal, not what sounds impressive',
              'Match your objective to where customers are in the funnel',
            ],
          },
          estimatedMinutes: 8,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: 'c3-m1-l2-a2',
          lessonId: 'c3-m1-l2',
          type: 'quiz',
          title: 'Objective Selection Quiz',
          content: {
            questions: [
              {
                id: 'q1',
                type: 'multiple-choice',
                question: 'A local bakery wants more people in their area to know about their new location. Which objective should they choose?',
                options: [
                  'Sales',
                  'Awareness',
                  'Leads',
                  'Traffic',
                ],
                correctAnswer: 1,
                explanation: 'Awareness is the right choice when your goal is to reach new people and build brand recognition. Since the bakery is new to the area, they first need people to know they exist.',
                difficulty: 2,
                skills: ['objective-selection'],
              },
              {
                id: 'q2',
                type: 'multiple-choice',
                question: 'An e-commerce store wants to drive purchases on their website. Which objective should they use?',
                options: [
                  'Awareness',
                  'Traffic',
                  'Sales',
                  'Engagement',
                ],
                correctAnswer: 2,
                explanation: 'Sales (or Conversions) is the right objective when you want to drive specific actions on your website like purchases. Meta will optimize to show your ads to people most likely to buy.',
                difficulty: 2,
                skills: ['objective-selection'],
              },
              {
                id: 'q3',
                type: 'true-false',
                question: 'You should always choose the "Sales" objective because it sounds like the best business outcome.',
                options: ['True', 'False'],
                correctAnswer: 1,
                explanation: 'False! The objective should match where your customers are in their journey. If people don\'t know your brand yet, awareness objectives might perform better than jumping straight to sales.',
                difficulty: 3,
                skills: ['objective-selection', 'funnel-understanding'],
              },
            ],
            passingScore: 70,
            allowRetakes: true,
            maxAttempts: 3,
          },
          estimatedMinutes: 6,
          isRequired: true,
          masteryThreshold: 70,
        },
      ],
      isLocked: false,
    },
  ],
  isLocked: false,
};

// Add module to course 3
COURSES[2].modules = [COURSE_3_MODULE_1];

// Sample detailed module for Course 1 (for new users)
export const COURSE_1_MODULE_1: Module = {
  id: 'c1-m1',
  courseId: 'course-1',
  number: 1,
  title: 'Welcome to Social Media Marketing',
  objectives: [
    'Understand why social media marketing matters',
    'Learn the key social media platforms',
    'Define your marketing goals',
  ],
  estimatedMinutes: 45,
  lessons: [
    {
      id: 'c1-m1-l1',
      moduleId: 'c1-m1',
      number: 1,
      title: 'Introduction to Social Media Marketing',
      objectives: ['Understand the power of social media marketing'],
      estimatedMinutes: 15,
      atoms: [
        {
          id: 'c1-m1-l1-a1',
          lessonId: 'c1-m1-l1',
          type: 'video',
          title: 'Why Social Media Marketing Matters',
          content: {
            videoUrl: '/videos/fsm/history-of-facebook.mp4',
            transcript: 'Welcome to your journey into social media marketing! In this course, you will learn how to harness the power of social platforms to grow brands and connect with audiences...',
            duration: 240,
            chapters: [
              { time: 0, title: 'Welcome!' },
              { time: 45, title: 'The Social Media Landscape' },
              { time: 120, title: 'Why It Matters for Business' },
              { time: 180, title: 'What You Will Learn' },
            ],
            keyTakeaways: [
              'Over 4.9 billion people use social media worldwide',
              'Social media marketing is essential for modern businesses',
              'You will learn to create, manage, and measure social campaigns',
            ],
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: 'c1-m1-l1-a2',
          lessonId: 'c1-m1-l1',
          type: 'reading',
          title: 'The Social Media Marketing Landscape',
          content: {
            body: `# The Social Media Marketing Landscape

Welcome to the exciting world of social media marketing! Let's explore what makes it so powerful.

## What is Social Media Marketing?

Social media marketing is the use of social platforms to connect with your audience, build your brand, drive website traffic, and increase sales.

**The main platforms you'll master:**
- Facebook & Instagram (Meta)
- TikTok
- LinkedIn
- X (Twitter)
- YouTube
- Pinterest

## Why It's Essential Today

> "If you're not on social media, you're invisible to half your potential customers."

Social media marketing offers:
- **Direct connection** to billions of potential customers
- **Precise targeting** to reach exactly who you want
- **Measurable results** to prove your ROI
- **Cost-effective** compared to traditional advertising

## Your Journey Ahead

In this certification program, you will:
- Learn to create compelling content
- Master paid advertising on Meta
- Measure and optimize your campaigns
- Build a complete marketing strategy

Let's get started!`,
            highlights: [
              '4.9 billion social media users worldwide',
              'Direct, targeted, measurable marketing',
              'You will master Meta advertising',
            ],
            relatedResources: [
              { title: 'Meta for Business', url: 'https://www.facebook.com/business', type: 'article' },
            ],
          },
          estimatedMinutes: 6,
          isRequired: true,
          masteryThreshold: 70,
        },
        {
          id: 'c1-m1-l1-a3',
          lessonId: 'c1-m1-l1',
          type: 'practice',
          title: 'Why Does Social Media Marketing Matter?',
          content: {
            type: 'ai-conversation',
            prompt: 'In your own words, explain why social media marketing is important for businesses today. What advantages does it offer over traditional marketing?',
            context: 'The learner just started their social media marketing journey. Encourage their initial thoughts and help them understand the key benefits.',
            expectedOutcomes: [
              'Identifies reach and audience size',
              'Mentions targeting capabilities',
              'Understands measurability',
            ],
            rubric: [
              { criterion: 'Mentions reach or audience access', weight: 30 },
              { criterion: 'Discusses targeting or personalization', weight: 30 },
              { criterion: 'Mentions measurable results or ROI', weight: 25 },
              { criterion: 'Shows genuine engagement with the topic', weight: 15 },
            ],
          },
          estimatedMinutes: 4,
          isRequired: true,
          masteryThreshold: 60,
        },
      ],
      isLocked: false,
    },
    {
      id: 'c1-m1-l2',
      moduleId: 'c1-m1',
      number: 2,
      title: 'Key Social Media Platforms',
      objectives: ['Understand the major platforms and their audiences'],
      estimatedMinutes: 20,
      atoms: [
        {
          id: 'c1-m1-l2-a1',
          lessonId: 'c1-m1-l2',
          type: 'video',
          title: 'Platform Overview',
          content: {
            videoUrl: '/videos/fsm/channel-selection.mp4',
            transcript: 'Each social platform has its own unique audience and culture. Understanding these differences is key to your success...',
            duration: 360,
            chapters: [
              { time: 0, title: 'Introduction' },
              { time: 60, title: 'Facebook & Instagram' },
              { time: 150, title: 'TikTok & YouTube' },
              { time: 240, title: 'LinkedIn & X' },
              { time: 300, title: 'Choosing Your Platforms' },
            ],
            keyTakeaways: [
              'Each platform has a unique audience and content style',
              'Meta (Facebook + Instagram) dominates advertising',
              'Choose platforms based on where your audience is',
            ],
          },
          estimatedMinutes: 7,
          isRequired: true,
          masteryThreshold: 80,
        },
        {
          id: 'c1-m1-l2-a2',
          lessonId: 'c1-m1-l2',
          type: 'quiz',
          title: 'Platform Knowledge Check',
          content: {
            questions: [
              {
                id: 'q1',
                type: 'multiple-choice',
                question: 'Which company owns both Facebook and Instagram?',
                options: ['Google', 'Meta', 'Microsoft', 'Apple'],
                correctAnswer: 1,
                explanation: 'Meta (formerly Facebook, Inc.) owns both Facebook and Instagram, making it the largest social advertising platform.',
                difficulty: 1,
                skills: ['platform-knowledge'],
              },
              {
                id: 'q2',
                type: 'multiple-choice',
                question: 'Which platform is best known for professional networking and B2B marketing?',
                options: ['TikTok', 'Instagram', 'LinkedIn', 'Pinterest'],
                correctAnswer: 2,
                explanation: 'LinkedIn is the go-to platform for professional networking and B2B (business-to-business) marketing.',
                difficulty: 1,
                skills: ['platform-knowledge'],
              },
              {
                id: 'q3',
                type: 'multiple-choice',
                question: 'What should primarily determine which social platforms you use for marketing?',
                options: [
                  'Which platform is newest',
                  'Where your target audience spends time',
                  'Which platform has the most users',
                  'Which platform is cheapest',
                ],
                correctAnswer: 1,
                explanation: 'The most important factor is where YOUR target audience is. Even if a platform has billions of users, it won\'t help if your specific audience isn\'t there.',
                difficulty: 2,
                skills: ['audience-targeting'],
              },
              {
                id: 'q4',
                type: 'multiple-choice',
                question: 'Which platform is known for short-form video content and has the youngest average user base?',
                options: ['Facebook', 'LinkedIn', 'TikTok', 'Pinterest'],
                correctAnswer: 2,
                explanation: 'TikTok is known for short-form video content and has a predominantly young user base, with over 60% of users under 30.',
                difficulty: 1,
                skills: ['platform-knowledge'],
              },
              {
                id: 'q5',
                type: 'multiple-choice',
                question: 'How many people worldwide use social media as of 2024?',
                options: ['1.5 billion', '2.9 billion', '4.9 billion', '7.2 billion'],
                correctAnswer: 2,
                explanation: 'Over 4.9 billion people use social media worldwide, representing more than half of the global population.',
                difficulty: 1,
                skills: ['industry-knowledge'],
              },
              {
                id: 'q6',
                type: 'multiple-choice',
                question: 'Which of these is NOT a benefit of social media marketing?',
                options: [
                  'Precise audience targeting',
                  'Measurable results',
                  'Guaranteed viral content',
                  'Cost-effective advertising',
                ],
                correctAnswer: 2,
                explanation: 'While social media offers many benefits, going viral is never guaranteed. Success requires strategy, quality content, and often paid promotion.',
                difficulty: 2,
                skills: ['marketing-fundamentals'],
              },
              {
                id: 'q7',
                type: 'multiple-choice',
                question: 'What is the primary purpose of Instagram Stories?',
                options: [
                  'Permanent portfolio content',
                  'Ephemeral content that disappears after 24 hours',
                  'Long-form video hosting',
                  'Customer service messaging',
                ],
                correctAnswer: 1,
                explanation: 'Instagram Stories are designed for ephemeral content that disappears after 24 hours, encouraging more frequent and casual sharing.',
                difficulty: 2,
                skills: ['platform-knowledge'],
              },
            ],
            passingScore: 70,
            allowRetakes: true,
            maxAttempts: 3,
          },
          estimatedMinutes: 5,
          isRequired: true,
          masteryThreshold: 70,
        },
      ],
      isLocked: false,
    },
  ],
  isLocked: false,
};

// Add module to course 1
COURSES[0].modules = [COURSE_1_MODULE_1];

// ============================================
// AI AT WORK COURSE INTEGRATION
// ============================================

// Create a complete AI at Work course entry for COURSES array
const AI_WORK_COURSE_ENTRY: Course = {
  ...AI_AT_WORK_COURSE,
  id: 'ai-at-work',
  modules: AI_AT_WORK_MODULES,
};

// Export AI at Work as the primary course
export const AI_WORK_COURSES: Course[] = [AI_WORK_COURSE_ENTRY];

// Export AI at Work modules for direct access
export { AI_WORK_MODULE_1, AI_WORK_MODULE_2, AI_WORK_MODULE_3, AI_WORK_MODULE_4 };

// Helper to get any lesson from AI at Work course
export function getAIWorkLesson(lessonId: string): Lesson | undefined {
  return getAIWorkLessonById(lessonId);
}

// Get all lessons from AI at Work course
export function getAllAIWorkLessons(): Lesson[] {
  return AI_AT_WORK_MODULES.flatMap(module => module.lessons);
}

// ============================================
// DEMO USER DATA
// ============================================

const generateStreakHistory = (): StreakData['streakHistory'] => {
  const history = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 12-day streak, with some variance
    const completed = i <= 11 && i >= 0 && i !== 7; // Gap on day 7, would need a freeze

    history.push({
      date: dateStr,
      completed,
      minutesStudied: completed ? Math.floor(Math.random() * 20) + 10 : 0,
      lessonsCompleted: completed ? Math.floor(Math.random() * 2) + 1 : 0,
    });
  }

  return history;
};

const demoPreferences: UserPreferences = {
  learningPace: 'moderate',
  dailyGoalMinutes: 20,
  preferredLearningTime: 'morning',
  voiceEnabled: false,
  soundEffectsEnabled: true,
  reducedMotion: false,
};

const demoProgress: UserProgress = {
  currentCourseId: 'course-3',
  currentModuleId: 'c3-m1',
  currentLessonId: 'c3-m1-l2',
  currentAtomId: 'c3-m1-l2-a1',
  overallPercentage: 42,
  coursesCompleted: ['course-1', 'course-2'],
  modulesCompleted: ['c1-m1', 'c1-m2', 'c1-m3', 'c2-m1', 'c2-m2', 'c2-m3'],
  lessonsCompleted: [
    'c1-m1-l1', 'c1-m1-l2', 'c1-m2-l1', 'c1-m2-l2', 'c1-m3-l1',
    'c2-m1-l1', 'c2-m1-l2', 'c2-m2-l1', 'c2-m2-l2', 'c2-m3-l1',
    'c3-m1-l1',
  ],
  atomsCompleted: [
    'c3-m1-l1-a1', 'c3-m1-l1-a2', 'c3-m1-l1-a3',
  ],
  assessmentScores: [
    { assessmentId: 'c1-final', score: 85, completedAt: new Date('2024-11-15') },
    { assessmentId: 'c2-final', score: 92, completedAt: new Date('2024-12-01') },
  ],
  masteryLevels: [
    { skillId: 'social-strategy', level: 85 },
    { skillId: 'content-creation', level: 78 },
    { skillId: 'meta-ads', level: 35 },
    { skillId: 'analytics', level: 25 },
  ],
  totalTimeSpentMinutes: 1247,
  lastActiveAt: new Date(),
  xp: 2450,
  streak: {
    currentStreak: 12,
    longestStreak: 24,
    lastCompletedDate: new Date().toISOString().split('T')[0],
    freezesAvailable: 1,
    freezesUsed: [],
    streakHistory: [],
  },
};

const demoStreak: StreakData = {
  currentStreak: 12,
  longestStreak: 24,
  lastCompletedDate: new Date().toISOString().split('T')[0],
  freezesAvailable: 1,
  freezesUsed: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
  streakHistory: generateStreakHistory(),
};

// Demo badges - some earned, some not
const demoBadges: Badge[] = BADGES.map((badge) => {
  const earnedBadges = ['first-lesson', 'streak-7', 'course-1-complete', 'course-2-complete', 'perfect-quiz'];

  if (earnedBadges.includes(badge.id)) {
    return {
      ...badge,
      earnedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
    };
  }
  return badge;
});

export const DEMO_USER: User = {
  id: 'demo-user-001',
  name: 'Alex',
  email: 'alex@example.com',
  avatar: undefined,
  createdAt: new Date('2024-10-01'),
  preferences: demoPreferences,
  progress: demoProgress,
  streak: demoStreak,
  badges: demoBadges,
  goal: 'Get Meta Certified',
  experienceLevel: 25,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCourseProgress(courseId: string, completedModules: string[]): number {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return 0;

  const courseModules = completedModules.filter((m) => m.startsWith(courseId.replace('course-', 'c')));
  const totalModules = 3; // Assuming 3 modules per course for demo

  return Math.round((courseModules.length / totalModules) * 100);
}

export function getCurrentLesson(user: User) {
  // In a real app, this would look up the actual lesson
  return {
    id: user.progress.currentLessonId,
    title: 'Setting Your Campaign Objective',
    courseTitle: 'Social Media Advertising with Meta',
    moduleTitle: 'Getting Started with Meta Ads',
    progress: 60,
    estimatedMinutes: 8,
  };
}

export function getCourseLockStatus(courseId: string, completedCourses: string[]): boolean {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return true;

  // Check if all prerequisites are completed
  return course.prerequisites.every((prereq) => completedCourses.includes(prereq));
}
