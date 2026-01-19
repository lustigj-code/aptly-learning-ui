/**
 * FSM Question Bank
 *
 * Comprehensive quiz questions for the Facebook Social Media Marketing course.
 * Organized by lesson with varied difficulty levels (1-5).
 * Designed to complement the existing course quizzes.
 *
 * Skills covered:
 * - facebook-history, platform-knowledge, facebook-business, facebook-features
 * - instagram-strategy, content-strategy, hashtag-strategy, instagram-analytics, engagement-tactics
 * - snapchat-demographics, snapchat-features, snapchat-best-practices, snapchat-strategy
 * - policy-fundamentals, policy-management, policy-ethics, policy-guidelines, policy-implementation
 * - channel-strategy, platform-selection, platform-demographics
 * - campaign-objectives, marketing-funnel, objective-selection, campaign-strategy
 * - budget-types, learning-phase, scaling-strategy, cbo
 */

import type { Question } from '@/types';

// ============================================
// LESSON 1: FACEBOOK ECOSYSTEM (History of Facebook)
// ============================================

export const fsmLesson1Questions: Question[] = [
  {
    id: 'fsm-qb-l1-q1',
    type: 'multiple-choice',
    question: 'Where was Facebook originally founded?',
    options: ['Stanford University', 'MIT', 'Harvard University', 'Yale University'],
    correctAnswer: 2,
    explanation: 'Facebook was founded at Harvard University by Mark Zuckerberg and his roommates in 2004.',
    difficulty: 1,
    skills: ['facebook-history'],
  },
  {
    id: 'fsm-qb-l1-q2',
    type: 'true-false',
    question: 'Facebook was originally called "TheFacebook" when it first launched.',
    options: ['True', 'False'],
    correctAnswer: 0,
    explanation: 'The site was originally named "TheFacebook" and was later shortened to "Facebook" in 2005.',
    difficulty: 1,
    skills: ['facebook-history'],
  },
  {
    id: 'fsm-qb-l1-q3',
    type: 'multiple-choice',
    question: 'Which type of Facebook Group requires approval to join and hides discussions from non-members?',
    options: ['Public Group', 'Private Group', 'Secret Group', 'Business Group'],
    correctAnswer: 1,
    explanation: 'Private Groups require approval to join and keep discussions hidden from non-members, unlike Public Groups which are open to all.',
    difficulty: 2,
    skills: ['facebook-features'],
  },
  {
    id: 'fsm-qb-l1-q4',
    type: 'multiple-choice',
    question: 'What is the primary advantage of cross-posting between Facebook and Instagram?',
    options: [
      'It costs less money',
      'It doubles your reach with minimal extra effort',
      'It improves your SEO ranking',
      'It is required by Meta policies',
    ],
    correctAnswer: 1,
    explanation: 'Since both platforms are owned by Meta, cross-posting allows you to reach audiences on both platforms with minimal additional work.',
    difficulty: 2,
    skills: ['platform-knowledge', 'content-strategy'],
  },
  {
    id: 'fsm-qb-l1-q5',
    type: 'multiple-choice',
    question: 'What can you NOT do with a Facebook Business Page?',
    options: [
      'Access business analytics',
      'Run paid advertisements',
      'Accept friend requests',
      'Create a product catalog',
    ],
    correctAnswer: 2,
    explanation: 'Facebook Business Pages receive "Followers" and "Likes," not friend requests. Friend requests are only for personal profiles.',
    difficulty: 3,
    skills: ['facebook-business'],
  },
];

// ============================================
// LESSON 2: INSTAGRAM AUDIENCE
// ============================================

export const fsmLesson2Questions: Question[] = [
  {
    id: 'fsm-qb-l2-q1',
    type: 'multiple-choice',
    question: 'What does the "E" for "Engage" mean in the 4 E\'s of content framework?',
    options: [
      'Educate your audience with tutorials',
      'Ask questions and encourage interaction',
      'Make people laugh or smile',
      'Inspire and motivate your followers',
    ],
    correctAnswer: 1,
    explanation: 'Engage means asking questions and encouraging interaction with your audience to boost engagement metrics.',
    difficulty: 2,
    skills: ['content-strategy'],
  },
  {
    id: 'fsm-qb-l2-q2',
    type: 'multiple-choice',
    question: 'What is considered a "niche" hashtag size?',
    options: ['Over 1 million uses', '100K-1M uses', 'Under 100K uses', 'Under 1K uses'],
    correctAnswer: 2,
    explanation: 'Niche hashtags have under 100K uses. They help you reach specific, targeted audiences rather than getting lost in popular hashtag feeds.',
    difficulty: 2,
    skills: ['hashtag-strategy'],
  },
  {
    id: 'fsm-qb-l2-q3',
    type: 'true-false',
    question: 'According to best practices, you should hide hashtags in the first comment to keep captions clean.',
    options: ['True', 'False'],
    correctAnswer: 0,
    explanation: 'Hiding 20-30 hashtags in the first comment keeps your caption clean and readable while still benefiting from hashtag discoverability.',
    difficulty: 2,
    skills: ['hashtag-strategy'],
  },
  {
    id: 'fsm-qb-l2-q4',
    type: 'multiple-choice',
    question: 'When defining your ideal Instagram follower, which factor is NOT typically considered?',
    options: [
      'Demographics (age, location)',
      'Pain points they need solved',
      'Their favorite TV shows',
      'Goals they are trying to achieve',
    ],
    correctAnswer: 2,
    explanation: 'Ideal follower profiles focus on demographics, pain points, goals, and interests relevant to your business, not general entertainment preferences.',
    difficulty: 3,
    skills: ['instagram-strategy'],
  },
  {
    id: 'fsm-qb-l2-q5',
    type: 'multiple-choice',
    question: 'What is visual consistency on Instagram?',
    options: [
      'Posting at the same time every day',
      'Using consistent filters, editing styles, and branded templates',
      'Using the same caption format',
      'Posting only photos, never videos',
    ],
    correctAnswer: 1,
    explanation: 'Visual consistency means developing a recognizable aesthetic through consistent filters, editing styles, and branded templates.',
    difficulty: 2,
    skills: ['content-strategy', 'instagram-strategy'],
  },
];

// ============================================
// LESSON 3: SNAPCHAT MESSAGING
// ============================================

export const fsmLesson3Questions: Question[] = [
  {
    id: 'fsm-qb-l3-q1',
    type: 'multiple-choice',
    question: 'Approximately how many Snaps are created daily on Snapchat?',
    options: ['500 million', '1 billion', '5 billion', '10 billion'],
    correctAnswer: 2,
    explanation: 'About 5 billion Snaps are created daily, showing the massive engagement on the platform.',
    difficulty: 2,
    skills: ['snapchat-demographics'],
  },
  {
    id: 'fsm-qb-l3-q2',
    type: 'multiple-choice',
    question: 'How many times does the average Snapchat user open the app per day?',
    options: ['10 times', '20 times', '40 times', '60 times'],
    correctAnswer: 2,
    explanation: 'The average Snapchat user opens the app about 40 times per day, indicating high engagement and multiple touchpoints.',
    difficulty: 3,
    skills: ['snapchat-demographics'],
  },
  {
    id: 'fsm-qb-l3-q3',
    type: 'multiple-choice',
    question: 'What type of Snapchat ad format allows users to try on products virtually?',
    options: ['Snap Ads', 'Geofilters', 'AR Lenses', 'Spotlight'],
    correctAnswer: 2,
    explanation: 'AR (Augmented Reality) Lenses allow users to virtually try on products and create interactive brand experiences.',
    difficulty: 2,
    skills: ['snapchat-features'],
  },
  {
    id: 'fsm-qb-l3-q4',
    type: 'true-false',
    question: 'Geofilters on Snapchat are location-based overlays that are perfect for events.',
    options: ['True', 'False'],
    correctAnswer: 0,
    explanation: 'Geofilters are location-based overlays that users can add to their Snaps when in specific locations, making them ideal for events and local promotions.',
    difficulty: 1,
    skills: ['snapchat-features'],
  },
  {
    id: 'fsm-qb-l3-q5',
    type: 'multiple-choice',
    question: 'What video format performs best on Snapchat?',
    options: ['Horizontal (16:9)', 'Square (1:1)', 'Vertical (9:16)', 'Any format works equally'],
    correctAnswer: 2,
    explanation: 'Vertical video (9:16) is the native format on Snapchat and performs best because it fills the entire mobile screen.',
    difficulty: 2,
    skills: ['snapchat-best-practices'],
  },
];

// ============================================
// LESSON 4: SOCIAL MEDIA POLICY
// ============================================

export const fsmLesson4Questions: Question[] = [
  {
    id: 'fsm-qb-l4-q1',
    type: 'multiple-choice',
    question: 'Which of the following is a benefit of having a social media policy?',
    options: [
      'It eliminates all social media risks',
      'It gives employees clear guidelines and confidence to engage',
      'It removes the need for employee training',
      'It automatically posts content for you',
    ],
    correctAnswer: 1,
    explanation: 'A social media policy empowers employees by providing clear guidelines, helping them engage confidently on behalf of the brand.',
    difficulty: 1,
    skills: ['policy-fundamentals'],
  },
  {
    id: 'fsm-qb-l4-q2',
    type: 'multiple-choice',
    question: 'What should employees do when discussing work-related topics on personal social media?',
    options: [
      'Never mention their employer',
      'Include appropriate disclaimers',
      'Get approval for every post',
      'Only post during work hours',
    ],
    correctAnswer: 1,
    explanation: 'Employees should include disclaimers (like "opinions are my own") when discussing work to separate personal views from company positions.',
    difficulty: 2,
    skills: ['policy-guidelines'],
  },
  {
    id: 'fsm-qb-l4-q3',
    type: 'true-false',
    question: 'A good social media policy should be kept confidential and only shared with senior leadership.',
    options: ['True', 'False'],
    correctAnswer: 1,
    explanation: 'Social media policies should be accessible to all employees and stored in an easy-to-find location. Training all employees on the policy is essential.',
    difficulty: 2,
    skills: ['policy-implementation'],
  },
  {
    id: 'fsm-qb-l4-q4',
    type: 'multiple-choice',
    question: 'What is the recommended approach to implementing a new social media policy?',
    options: [
      'Email it once and assume compliance',
      'Train employees and make it easily accessible',
      'Only tell people when they violate it',
      'Post it on social media for transparency',
    ],
    correctAnswer: 1,
    explanation: 'Effective implementation requires active training sessions and ensuring the policy is stored in an easily accessible location.',
    difficulty: 2,
    skills: ['policy-implementation'],
  },
  {
    id: 'fsm-qb-l4-q5',
    type: 'multiple-choice',
    question: 'Which action should always be AVOIDED according to social media policy best practices?',
    options: [
      'Using personal judgment when posting',
      'Speaking negatively about competitors publicly',
      'Responding to customer comments',
      'Sharing company news and updates',
    ],
    correctAnswer: 1,
    explanation: 'Speaking negatively about competitors is unprofessional and can create legal and reputational risks for the company.',
    difficulty: 2,
    skills: ['policy-guidelines', 'policy-ethics'],
  },
];

// ============================================
// LESSON 5: CHANNEL SELECTION
// ============================================

export const fsmLesson5Questions: Question[] = [
  {
    id: 'fsm-qb-l5-q1',
    type: 'multiple-choice',
    question: 'What is Pinterest\'s primary user demographic?',
    options: [
      '70% male users aged 18-34',
      '70% female users aged 18-49',
      '60% Gen Z users',
      '50/50 gender split aged 35-55',
    ],
    correctAnswer: 1,
    explanation: 'Pinterest\'s audience is approximately 70% female, aged 18-49, making it ideal for brands targeting this demographic.',
    difficulty: 2,
    skills: ['platform-demographics'],
  },
  {
    id: 'fsm-qb-l5-q2',
    type: 'multiple-choice',
    question: 'Which platform is experiencing declining organic reach for business content?',
    options: ['TikTok', 'LinkedIn', 'Facebook', 'YouTube'],
    correctAnswer: 2,
    explanation: 'Facebook has seen declining organic reach for business content over the years, pushing brands toward paid advertising.',
    difficulty: 2,
    skills: ['platform-selection'],
  },
  {
    id: 'fsm-qb-l5-q3',
    type: 'true-false',
    question: 'You should be present on every available social media platform to maximize reach.',
    options: ['True', 'False'],
    correctAnswer: 1,
    explanation: 'It\'s better to excel on 2 platforms than be mediocre on 6. Quality and consistency on fewer platforms outperforms scattered presence on many.',
    difficulty: 1,
    skills: ['channel-strategy'],
  },
  {
    id: 'fsm-qb-l5-q4',
    type: 'multiple-choice',
    question: 'When assessing your resources for social media, which factor should you consider?',
    options: [
      'Your personal favorite platforms',
      'What your CEO uses personally',
      'Your time, budget, skills, and content capabilities',
      'Which platforms have the most total users',
    ],
    correctAnswer: 2,
    explanation: 'Resource assessment should include available time, budget, team skills (photography, video, copywriting), and content production capabilities.',
    difficulty: 2,
    skills: ['channel-strategy'],
  },
  {
    id: 'fsm-qb-l5-q5',
    type: 'multiple-choice',
    question: 'Which platform is known for high engagement but requires quality visual content?',
    options: ['Twitter/X', 'LinkedIn', 'Instagram', 'Reddit'],
    correctAnswer: 2,
    explanation: 'Instagram has high engagement rates but requires quality visual content, making it challenging for brands without visual production capabilities.',
    difficulty: 2,
    skills: ['platform-selection'],
  },
];

// ============================================
// LESSON 6: CAMPAIGN OBJECTIVES
// ============================================

export const fsmLesson6Questions: Question[] = [
  {
    id: 'fsm-qb-l6-q1',
    type: 'multiple-choice',
    question: 'Which campaign objective is best for a brand that wants to promote a new product launch?',
    options: ['Conversions', 'Lead Generation', 'Brand Awareness/Reach', 'Messages'],
    correctAnswer: 2,
    explanation: 'For new product launches to audiences unfamiliar with your brand, Awareness/Reach objectives help you get in front of as many relevant people as possible.',
    difficulty: 2,
    skills: ['objective-selection'],
  },
  {
    id: 'fsm-qb-l6-q2',
    type: 'multiple-choice',
    question: 'The "Consideration" stage of the marketing funnel includes which objective?',
    options: ['Reach', 'Brand Awareness', 'Store Traffic', 'Video Views'],
    correctAnswer: 3,
    explanation: 'Video Views is a Consideration objective because it aims to get people interested and engaged with your content, moving them down the funnel.',
    difficulty: 2,
    skills: ['marketing-funnel'],
  },
  {
    id: 'fsm-qb-l6-q3',
    type: 'true-false',
    question: 'If you want to drive purchases, you should always start with a Conversion objective.',
    options: ['True', 'False'],
    correctAnswer: 1,
    explanation: 'Starting with Conversion objectives for cold audiences often wastes budget. You need to build awareness first, then nurture through consideration before converting.',
    difficulty: 3,
    skills: ['campaign-strategy'],
  },
  {
    id: 'fsm-qb-l6-q4',
    type: 'multiple-choice',
    question: 'What happens when you choose the wrong campaign objective?',
    options: [
      'Nothing, Meta will automatically adjust',
      'Your account gets suspended',
      'The algorithm optimizes for the wrong outcome, wasting budget',
      'You cannot run the campaign',
    ],
    correctAnswer: 2,
    explanation: 'The algorithm will optimize exactly for what you tell it, so choosing Traffic when you want sales means you get clicks but not purchases.',
    difficulty: 2,
    skills: ['campaign-objectives'],
  },
  {
    id: 'fsm-qb-l6-q5',
    type: 'multiple-choice',
    question: 'Which objective allows you to start conversations directly within Facebook Messenger?',
    options: ['Engagement', 'Traffic', 'Messages', 'Lead Generation'],
    correctAnswer: 2,
    explanation: 'The Messages objective is designed to start conversations in Messenger, WhatsApp, or Instagram Direct.',
    difficulty: 1,
    skills: ['objective-selection'],
  },
];

// ============================================
// LESSON 7: CAMPAIGN BUDGETING
// ============================================

export const fsmLesson7Questions: Question[] = [
  {
    id: 'fsm-qb-l7-q1',
    type: 'multiple-choice',
    question: 'Which budget type is best for time-limited promotions with a clear end date?',
    options: ['Daily Budget', 'Lifetime Budget', 'Weekly Budget', 'Monthly Budget'],
    correctAnswer: 1,
    explanation: 'Lifetime budgets are ideal for time-limited campaigns because they allow Meta to optimize spend across the entire campaign duration.',
    difficulty: 2,
    skills: ['budget-types'],
  },
  {
    id: 'fsm-qb-l7-q2',
    type: 'multiple-choice',
    question: 'Why is the learning phase important for Meta ads?',
    options: [
      'It teaches you how to use Ads Manager',
      'It allows Meta to learn who responds to your ad and optimize delivery',
      'It is required by law',
      'It determines your account credit limit',
    ],
    correctAnswer: 1,
    explanation: 'During the learning phase, Meta\'s algorithm learns which users respond best to your ad, enabling better optimization after exiting learning.',
    difficulty: 2,
    skills: ['learning-phase'],
  },
  {
    id: 'fsm-qb-l7-q3',
    type: 'true-false',
    question: 'Doubling your ad budget overnight is a recommended scaling strategy.',
    options: ['True', 'False'],
    correctAnswer: 1,
    explanation: 'Sudden large budget increases can reset the learning phase and hurt performance. Gradual scaling (20% every 3-4 days) preserves optimization.',
    difficulty: 2,
    skills: ['scaling-strategy'],
  },
  {
    id: 'fsm-qb-l7-q4',
    type: 'multiple-choice',
    question: 'If your cost per conversion is $20, what is the minimum weekly budget to exit learning phase?',
    options: ['$200', '$500', '$1,000', '$2,000'],
    correctAnswer: 2,
    explanation: 'You need 50 conversions per week to exit learning. At $20 per conversion, that equals a minimum of $1,000 per week (50 x $20).',
    difficulty: 3,
    skills: ['learning-phase', 'budget-types'],
  },
  {
    id: 'fsm-qb-l7-q5',
    type: 'multiple-choice',
    question: 'When should you use Campaign Budget Optimization (CBO)?',
    options: [
      'Only for your first campaign ever',
      'When testing multiple ad sets targeting different audiences',
      'Only for video ads',
      'Never, manual budgets are always better',
    ],
    correctAnswer: 1,
    explanation: 'CBO is ideal when you have multiple ad sets and want Meta to automatically allocate budget to the best performers.',
    difficulty: 2,
    skills: ['cbo'],
  },
];

// ============================================
// BONUS: ADVANCED CROSS-TOPIC QUESTIONS
// ============================================

export const fsmAdvancedQuestions: Question[] = [
  {
    id: 'fsm-qb-adv-q1',
    type: 'multiple-choice',
    question: 'A B2B software company wants to reach decision-makers aged 35-50. Which platform combination would be most effective?',
    options: [
      'TikTok and Snapchat',
      'LinkedIn and Facebook',
      'Instagram and Pinterest',
      'Snapchat and YouTube',
    ],
    correctAnswer: 1,
    explanation: 'LinkedIn is ideal for B2B professional audiences, and Facebook reaches users aged 25-54 effectively. Both platforms suit B2B marketing.',
    difficulty: 4,
    skills: ['platform-selection', 'channel-strategy'],
  },
  {
    id: 'fsm-qb-adv-q2',
    type: 'multiple-choice',
    question: 'You\'re running a conversion campaign that has been in learning phase for 2 weeks without exiting. What should you try?',
    options: [
      'Double the budget immediately',
      'Change to a consideration objective with more events',
      'Delete the campaign and start over',
      'Change the creative every day',
    ],
    correctAnswer: 1,
    explanation: 'If you can\'t get 50 weekly conversions, try optimizing for an event with more volume (like Add to Cart) to help the algorithm learn.',
    difficulty: 4,
    skills: ['learning-phase', 'campaign-strategy'],
  },
  {
    id: 'fsm-qb-adv-q3',
    type: 'multiple-choice',
    question: 'Which combination best describes an effective full-funnel advertising strategy?',
    options: [
      'Start with Conversions, then Awareness, then Consideration',
      'Use only Conversion objectives throughout',
      'Start with Awareness, then Consideration, then Conversion',
      'Alternate randomly between all objectives',
    ],
    correctAnswer: 2,
    explanation: 'An effective funnel moves prospects from Awareness (learning about you) to Consideration (getting interested) to Conversion (taking action).',
    difficulty: 3,
    skills: ['marketing-funnel', 'campaign-strategy'],
  },
  {
    id: 'fsm-qb-adv-q4',
    type: 'multiple-choice',
    question: 'A fashion brand with beautiful product photography wants to target Gen Z. Which platform strategy would work best?',
    options: [
      'Focus only on LinkedIn for professional appeal',
      'Use TikTok for reach and Instagram for visual storytelling',
      'Focus only on Facebook for maximum audience size',
      'Use Pinterest and Twitter exclusively',
    ],
    correctAnswer: 1,
    explanation: 'TikTok reaches Gen Z effectively with authentic content, while Instagram leverages the brand\'s visual assets. This combination suits a fashion brand targeting young audiences.',
    difficulty: 4,
    skills: ['channel-strategy', 'platform-demographics'],
  },
  {
    id: 'fsm-qb-adv-q5',
    type: 'multiple-choice',
    question: 'Your social media policy prohibits employees from discussing unreleased products. An employee posts a teaser about an upcoming launch. What\'s the best first step?',
    options: [
      'Immediately fire the employee',
      'Ignore it since it\'s just a teaser',
      'Address it according to the policy\'s enforcement guidelines',
      'Publicly reprimand them on social media',
    ],
    correctAnswer: 2,
    explanation: 'Follow the policy\'s enforcement guidelines, which typically involve private discussion, documentation, and appropriate corrective action - not public shaming or immediate termination.',
    difficulty: 4,
    skills: ['policy-management', 'policy-ethics'],
  },
];

// ============================================
// AGGREGATED EXPORTS
// ============================================

/**
 * All FSM questions organized by lesson
 */
export const fsmQuestionsByLesson = {
  lesson1: fsmLesson1Questions,
  lesson2: fsmLesson2Questions,
  lesson3: fsmLesson3Questions,
  lesson4: fsmLesson4Questions,
  lesson5: fsmLesson5Questions,
  lesson6: fsmLesson6Questions,
  lesson7: fsmLesson7Questions,
  advanced: fsmAdvancedQuestions,
};

/**
 * All FSM questions as a flat array
 */
export const allFsmQuestions: Question[] = [
  ...fsmLesson1Questions,
  ...fsmLesson2Questions,
  ...fsmLesson3Questions,
  ...fsmLesson4Questions,
  ...fsmLesson5Questions,
  ...fsmLesson6Questions,
  ...fsmLesson7Questions,
  ...fsmAdvancedQuestions,
];

/**
 * Get questions filtered by skill
 */
export function getFsmQuestionsBySkill(skillId: string): Question[] {
  return allFsmQuestions.filter((q) => q.skills.includes(skillId));
}

/**
 * Get questions filtered by difficulty
 */
export function getFsmQuestionsByDifficulty(
  difficulty: 1 | 2 | 3 | 4 | 5
): Question[] {
  return allFsmQuestions.filter((q) => q.difficulty === difficulty);
}

/**
 * Get questions for a specific lesson
 */
export function getFsmQuestionsByLesson(lessonNumber: number): Question[] {
  const lessonKey = `lesson${lessonNumber}` as keyof typeof fsmQuestionsByLesson;
  return fsmQuestionsByLesson[lessonKey] || [];
}

/**
 * Get a random selection of questions
 */
export function getRandomFsmQuestions(count: number): Question[] {
  const shuffled = [...allFsmQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Question statistics
 */
export const fsmQuestionStats = {
  total: allFsmQuestions.length,
  byLesson: {
    lesson1: fsmLesson1Questions.length,
    lesson2: fsmLesson2Questions.length,
    lesson3: fsmLesson3Questions.length,
    lesson4: fsmLesson4Questions.length,
    lesson5: fsmLesson5Questions.length,
    lesson6: fsmLesson6Questions.length,
    lesson7: fsmLesson7Questions.length,
    advanced: fsmAdvancedQuestions.length,
  },
  byDifficulty: {
    easy: allFsmQuestions.filter((q) => q.difficulty === 1).length,
    medium: allFsmQuestions.filter((q) => q.difficulty === 2).length,
    hard: allFsmQuestions.filter((q) => q.difficulty === 3).length,
    expert: allFsmQuestions.filter((q) => q.difficulty >= 4).length,
  },
};
