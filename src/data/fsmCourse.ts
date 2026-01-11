/**
 * FSM Course Data - Social Media Marketing Fundamentals
 *
 * This module contains 7 lessons using the FSM video content:
 * 1. History of Facebook
 * 2. Instagram Audience Building
 * 3. Snapchat Messaging
 * 4. Social Media Policy
 * 5. Channel Selection
 * 6. Campaign Objectives
 * 7. Campaign Budgeting
 */

import type { Module, Lesson, Atom } from '@/types'

// ============================================
// LESSON 1: HISTORY OF FACEBOOK
// ============================================

const lesson1Atoms: Atom[] = [
  {
    id: 'fsm-l1-video',
    lessonId: 'fsm-l1',
    type: 'video',
    title: 'History of Facebook',
    content: {
      videoUrl: '/videos/fsm/history-of-facebook.mp4',
      transcript: 'In this lesson, we explore the history of Facebook, from its founding at Harvard to becoming the largest social network in the world...',
      duration: 420,
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 60, title: 'The Founding Story' },
        { time: 180, title: 'Growth and Evolution' },
        { time: 300, title: 'Facebook Today' },
      ],
      keyTakeaways: [
        'Facebook was founded in 2004 by Mark Zuckerberg',
        'It grew from a college network to a global platform',
        'Facebook rebranded to Meta in 2021',
        'Understanding the platform\'s history helps you leverage its features',
      ],
    },
    estimatedMinutes: 7,
    isRequired: true,
    masteryThreshold: 80,
  },
  {
    id: 'fsm-l1-reading',
    lessonId: 'fsm-l1',
    type: 'reading',
    title: 'The Facebook Ecosystem',
    content: {
      body: `# The Facebook Ecosystem

Facebook has evolved from a simple social network into a comprehensive marketing platform. Understanding its ecosystem is essential for effective social media marketing.

## Key Components

### Facebook Pages
Business Pages are the foundation of your Facebook presence. They allow you to:
- Build a community around your brand
- Share content and updates
- Engage with customers directly
- Access business tools and analytics

### Facebook Groups
Groups create communities around shared interests:
- **Public Groups**: Open to anyone
- **Private Groups**: Require approval to join
- **Secret Groups**: Hidden from search

### Facebook Marketplace
A commerce platform integrated into the main app, allowing:
- Local buying and selling
- Business storefront creation
- Product catalog management

## The Meta Family

Facebook is part of Meta's family of apps:
- **Instagram**: Visual content and stories
- **WhatsApp**: Messaging and business communication
- **Messenger**: Direct messaging and customer service

> **Pro Tip**: Cross-posting between Facebook and Instagram can double your reach with minimal extra effort.

## Why History Matters

Understanding Facebook's evolution helps you:
1. Anticipate platform changes
2. Leverage features effectively
3. Understand the algorithm's priorities
4. Connect with different audience segments`,
      highlights: [
        'Facebook Pages are essential for business presence',
        'Groups build community and engagement',
        'Meta family apps work together',
      ],
      relatedResources: [
        { title: 'Meta for Business', url: 'https://business.facebook.com', type: 'article' },
      ],
    },
    estimatedMinutes: 5,
    isRequired: true,
    masteryThreshold: 70,
  },
  {
    id: 'fsm-l1-quiz',
    lessonId: 'fsm-l1',
    type: 'quiz',
    title: 'Facebook Fundamentals Quiz',
    content: {
      questions: [
        {
          id: 'l1-q1',
          type: 'multiple-choice',
          question: 'When was Facebook founded?',
          options: ['2002', '2004', '2006', '2008'],
          correctAnswer: 1,
          explanation: 'Facebook was founded in 2004 by Mark Zuckerberg while he was a student at Harvard University.',
          difficulty: 1,
          skills: ['facebook-history'],
        },
        {
          id: 'l1-q2',
          type: 'multiple-choice',
          question: 'What is the parent company of Facebook called?',
          options: ['Alphabet', 'Meta', 'Microsoft', 'Apple'],
          correctAnswer: 1,
          explanation: 'Facebook rebranded its parent company to Meta in October 2021 to reflect its focus on building the metaverse.',
          difficulty: 1,
          skills: ['facebook-history'],
        },
        {
          id: 'l1-q3',
          type: 'multiple-choice',
          question: 'Which of these is NOT part of the Meta family of apps?',
          options: ['Instagram', 'WhatsApp', 'Twitter', 'Messenger'],
          correctAnswer: 2,
          explanation: 'Twitter (now X) is a separate company. Meta owns Facebook, Instagram, WhatsApp, and Messenger.',
          difficulty: 1,
          skills: ['platform-knowledge'],
        },
        {
          id: 'l1-q4',
          type: 'multiple-choice',
          question: 'What is the primary purpose of a Facebook Business Page?',
          options: [
            'To connect with friends',
            'To build a professional business presence',
            'To play games',
            'To store photos privately',
          ],
          correctAnswer: 1,
          explanation: 'Facebook Business Pages are designed for brands and organizations to build a professional presence and connect with customers.',
          difficulty: 1,
          skills: ['facebook-business'],
        },
        {
          id: 'l1-q5',
          type: 'multiple-choice',
          question: 'Which Facebook feature allows local buying and selling?',
          options: ['Facebook Groups', 'Facebook Stories', 'Facebook Marketplace', 'Facebook Watch'],
          correctAnswer: 2,
          explanation: 'Facebook Marketplace is a commerce platform within Facebook that allows users to buy and sell items locally.',
          difficulty: 2,
          skills: ['facebook-features'],
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
]

// ============================================
// LESSON 2: INSTAGRAM AUDIENCE
// ============================================

const lesson2Atoms: Atom[] = [
  {
    id: 'fsm-l2-video',
    lessonId: 'fsm-l2',
    type: 'video',
    title: 'Find People That Care About What You Do on Instagram',
    content: {
      videoUrl: '/videos/fsm/instagram-audience.mp4',
      transcript: 'Building an engaged audience on Instagram requires understanding who your ideal followers are and how to attract them...',
      duration: 600,
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 90, title: 'Defining Your Target Audience' },
        { time: 240, title: 'Content Strategies' },
        { time: 420, title: 'Engagement Techniques' },
      ],
      keyTakeaways: [
        'Know your target audience inside and out',
        'Create content that resonates with their interests',
        'Use hashtags strategically to increase discoverability',
        'Engage authentically with your community',
      ],
    },
    estimatedMinutes: 10,
    isRequired: true,
    masteryThreshold: 80,
  },
  {
    id: 'fsm-l2-reading',
    lessonId: 'fsm-l2',
    type: 'reading',
    title: 'Instagram Audience Building Strategies',
    content: {
      body: `# Instagram Audience Building Strategies

Growing an engaged Instagram following takes strategy, consistency, and authentic connection with your audience.

## Understanding Your Audience

### Define Your Ideal Follower
Create a detailed profile of who you want to reach:
- **Demographics**: Age, location, gender, income
- **Interests**: Hobbies, values, lifestyle
- **Pain Points**: Problems they need solved
- **Goals**: What they're trying to achieve

### Research Your Audience
- Use Instagram Insights to understand current followers
- Study competitors' followers and engagement
- Conduct polls and ask questions in Stories

## Content Strategies That Attract

### The 4 E's of Content
1. **Educate**: Teach something valuable
2. **Entertain**: Make people smile or laugh
3. **Engage**: Ask questions, encourage interaction
4. **Empower**: Inspire and motivate

### Visual Consistency
- Develop a recognizable aesthetic
- Use consistent filters and editing styles
- Create branded templates for recurring content

## Hashtag Strategy

### Finding the Right Hashtags
- Mix popular (1M+), moderate (100K-1M), and niche (<100K)
- Research hashtags your audience follows
- Create a branded hashtag for your community

> **Pro Tip**: Use 20-30 hashtags per post, but hide them in the first comment to keep captions clean.

## Growing Through Engagement

### The 80/20 Rule
Spend 80% of your time engaging with others, 20% creating content.

### Engagement Tactics
- Reply to every comment within 1 hour
- Like and comment on followers' posts
- Share user-generated content
- Go live regularly`,
      highlights: [
        'Define your ideal follower profile',
        'Use the 4 E\'s: Educate, Entertain, Engage, Empower',
        'Mix hashtag sizes for optimal reach',
      ],
      relatedResources: [
        { title: 'Instagram for Business', url: 'https://business.instagram.com', type: 'article' },
      ],
    },
    estimatedMinutes: 6,
    isRequired: true,
    masteryThreshold: 70,
  },
  {
    id: 'fsm-l2-quiz',
    lessonId: 'fsm-l2',
    type: 'quiz',
    title: 'Instagram Strategy Quiz',
    content: {
      questions: [
        {
          id: 'l2-q1',
          type: 'multiple-choice',
          question: 'What is the 80/20 rule for Instagram engagement?',
          options: [
            '80% ads, 20% organic content',
            '80% engaging with others, 20% creating content',
            '80% photos, 20% videos',
            '80% hashtags, 20% captions',
          ],
          correctAnswer: 1,
          explanation: 'The 80/20 rule suggests spending 80% of your time engaging with your community and 20% creating your own content.',
          difficulty: 2,
          skills: ['instagram-strategy'],
        },
        {
          id: 'l2-q2',
          type: 'multiple-choice',
          question: 'Which of the following is NOT one of the 4 E\'s of content?',
          options: ['Educate', 'Entertain', 'Execute', 'Empower'],
          correctAnswer: 2,
          explanation: 'The 4 E\'s are Educate, Entertain, Engage, and Empower. Execute is not part of this framework.',
          difficulty: 1,
          skills: ['content-strategy'],
        },
        {
          id: 'l2-q3',
          type: 'multiple-choice',
          question: 'How should you mix hashtag sizes for optimal reach?',
          options: [
            'Only use popular hashtags (1M+)',
            'Only use niche hashtags (<100K)',
            'Mix popular, moderate, and niche hashtags',
            'Don\'t use any hashtags',
          ],
          correctAnswer: 2,
          explanation: 'Mixing popular (1M+), moderate (100K-1M), and niche (<100K) hashtags helps you reach different audience segments.',
          difficulty: 2,
          skills: ['hashtag-strategy'],
        },
        {
          id: 'l2-q4',
          type: 'multiple-choice',
          question: 'What tool can you use to understand your current Instagram followers?',
          options: ['Google Analytics', 'Instagram Insights', 'Facebook Pixel', 'Twitter Analytics'],
          correctAnswer: 1,
          explanation: 'Instagram Insights is the built-in analytics tool that provides data about your followers and content performance.',
          difficulty: 1,
          skills: ['instagram-analytics'],
        },
        {
          id: 'l2-q5',
          type: 'multiple-choice',
          question: 'How quickly should you reply to comments on your posts?',
          options: ['Within 24 hours', 'Within 1 hour', 'Within 1 week', 'When you have time'],
          correctAnswer: 1,
          explanation: 'Replying within 1 hour shows engagement and helps boost your content in the algorithm.',
          difficulty: 2,
          skills: ['engagement-tactics'],
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
]

// ============================================
// LESSON 3: SNAPCHAT MESSAGING
// ============================================

const lesson3Atoms: Atom[] = [
  {
    id: 'fsm-l3-video',
    lessonId: 'fsm-l3',
    type: 'video',
    title: 'Boost Your Messaging Game With Snapchat',
    content: {
      videoUrl: '/videos/fsm/snapchat-messaging.mp4',
      transcript: 'Snapchat offers unique opportunities for brands to connect with younger audiences through authentic, ephemeral content...',
      duration: 480,
      chapters: [
        { time: 0, title: 'Introduction to Snapchat' },
        { time: 90, title: 'Snapchat Features' },
        { time: 240, title: 'Business Opportunities' },
        { time: 360, title: 'Best Practices' },
      ],
      keyTakeaways: [
        'Snapchat reaches 75% of millennials and Gen Z',
        'Stories and Snaps create authentic connections',
        'Ephemeral content drives urgency and engagement',
        'AR lenses offer interactive brand experiences',
      ],
    },
    estimatedMinutes: 8,
    isRequired: true,
    masteryThreshold: 80,
  },
  {
    id: 'fsm-l3-reading',
    lessonId: 'fsm-l3',
    type: 'reading',
    title: 'Snapchat for Business',
    content: {
      body: `# Snapchat for Business

Snapchat's unique format and young audience make it a powerful platform for brands looking to connect authentically.

## Understanding Snapchat

### Key Statistics
- **800+ million** monthly active users
- **75%** of millennials and Gen Z use Snapchat
- **5 billion** Snaps created daily
- Average user opens the app **40 times per day**

### Core Features

#### Snaps
Individual photos or videos that disappear after viewing:
- Create urgency and exclusivity
- Encourage immediate attention
- Perfect for behind-the-scenes content

#### Stories
24-hour collections of Snaps:
- Tell a narrative over time
- Available to all followers
- Can include links (with enough followers)

#### Spotlight
Snapchat's TikTok competitor:
- Short-form vertical videos
- Potential for viral reach
- Creator rewards program

## Business Opportunities

### Snap Ads
- Full-screen vertical video ads
- Appear between Stories
- Swipe-up actions for conversions

### AR Lenses
- Create branded augmented reality experiences
- Users try on products virtually
- Highly shareable and engaging

### Geofilters
- Location-based overlays
- Perfect for events and locations
- Easy to create and affordable

> **Pro Tip**: Snapchat's audience values authenticity. Don't over-polish your content—raw and real performs better.

## Best Practices

1. **Be authentic**: Polished ads don't work here
2. **Use vertical video**: Native format performs best
3. **Include sound**: 64% of Snaps are viewed with sound
4. **Create urgency**: Leverage the ephemeral nature
5. **Experiment with AR**: Lenses drive engagement`,
      highlights: [
        '75% of millennials and Gen Z use Snapchat',
        'Authenticity beats polish on this platform',
        'AR lenses create shareable brand experiences',
      ],
      relatedResources: [
        { title: 'Snapchat for Business', url: 'https://forbusiness.snapchat.com', type: 'article' },
      ],
    },
    estimatedMinutes: 5,
    isRequired: true,
    masteryThreshold: 70,
  },
  {
    id: 'fsm-l3-quiz',
    lessonId: 'fsm-l3',
    type: 'quiz',
    title: 'Snapchat Marketing Quiz',
    content: {
      questions: [
        {
          id: 'l3-q1',
          type: 'multiple-choice',
          question: 'What percentage of millennials and Gen Z use Snapchat?',
          options: ['25%', '50%', '75%', '95%'],
          correctAnswer: 2,
          explanation: '75% of millennials and Gen Z use Snapchat, making it essential for reaching younger audiences.',
          difficulty: 1,
          skills: ['snapchat-demographics'],
        },
        {
          id: 'l3-q2',
          type: 'multiple-choice',
          question: 'How long do Snapchat Stories remain visible?',
          options: ['1 hour', '12 hours', '24 hours', '48 hours'],
          correctAnswer: 2,
          explanation: 'Snapchat Stories remain visible for 24 hours, after which they disappear.',
          difficulty: 1,
          skills: ['snapchat-features'],
        },
        {
          id: 'l3-q3',
          type: 'multiple-choice',
          question: 'What is Snapchat Spotlight similar to?',
          options: ['Facebook News Feed', 'Instagram Stories', 'TikTok', 'YouTube'],
          correctAnswer: 2,
          explanation: 'Spotlight is Snapchat\'s short-form vertical video feature, similar to TikTok.',
          difficulty: 2,
          skills: ['snapchat-features'],
        },
        {
          id: 'l3-q4',
          type: 'multiple-choice',
          question: 'What percentage of Snaps are viewed with sound?',
          options: ['34%', '44%', '54%', '64%'],
          correctAnswer: 3,
          explanation: '64% of Snaps are viewed with sound on, so including audio is important for engagement.',
          difficulty: 2,
          skills: ['snapchat-best-practices'],
        },
        {
          id: 'l3-q5',
          type: 'multiple-choice',
          question: 'What type of content performs best on Snapchat?',
          options: [
            'Highly polished professional videos',
            'Authentic, raw content',
            'Stock photos',
            'Text-only posts',
          ],
          correctAnswer: 1,
          explanation: 'Snapchat\'s audience values authenticity. Raw, real content performs better than over-polished ads.',
          difficulty: 1,
          skills: ['snapchat-strategy'],
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
]

// ============================================
// LESSON 4: SOCIAL MEDIA POLICY
// ============================================

const lesson4Atoms: Atom[] = [
  {
    id: 'fsm-l4-video',
    lessonId: 'fsm-l4',
    type: 'video',
    title: 'Creating a Social Media Policy',
    content: {
      videoUrl: '/videos/fsm/social-media-policy.mp4',
      transcript: 'A well-crafted social media policy protects your brand while empowering your team to engage effectively online...',
      duration: 540,
      chapters: [
        { time: 0, title: 'Why You Need a Policy' },
        { time: 120, title: 'Key Policy Components' },
        { time: 300, title: 'Implementation' },
        { time: 450, title: 'Enforcement' },
      ],
      keyTakeaways: [
        'Social media policies protect your brand reputation',
        'Clear guidelines empower employees to engage confidently',
        'Policies should cover personal and professional use',
        'Regular updates keep policies relevant',
      ],
    },
    estimatedMinutes: 9,
    isRequired: true,
    masteryThreshold: 80,
  },
  {
    id: 'fsm-l4-reading',
    lessonId: 'fsm-l4',
    type: 'reading',
    title: 'Social Media Policy Best Practices',
    content: {
      body: `# Social Media Policy Best Practices

A comprehensive social media policy is essential for any organization with an online presence.

## Why You Need a Policy

### Protection
- Protects company reputation
- Provides legal safeguards
- Prevents PR crises

### Empowerment
- Gives employees clear guidelines
- Encourages confident engagement
- Supports brand consistency

## Key Policy Components

### 1. Purpose Statement
Clearly state why the policy exists:
- Protect the brand
- Guide employee behavior
- Ensure legal compliance

### 2. Scope
Define who and what the policy covers:
- All employees vs. marketing team only
- Personal vs. professional accounts
- Company-owned vs. personal devices

### 3. Brand Guidelines
Specify how to represent the brand:
- Voice and tone
- Visual standards
- Approved messaging
- Response templates

### 4. Confidentiality
Address sensitive information:
- What cannot be shared
- Client/customer privacy
- Internal communications

### 5. Personal Use Guidelines
Cover employees' personal accounts:
- Disclaimers when discussing work
- Separation of personal opinions
- Avoiding conflicts of interest

## Best Practices

> **The Golden Rule**: If you wouldn't say it in a company meeting, don't post it online.

### Do's
✅ Get approval before speaking for the company
✅ Use good judgment
✅ Be respectful and professional
✅ Disclose relationships when relevant

### Don'ts
❌ Share confidential information
❌ Engage in arguments or controversies
❌ Speak negatively about competitors
❌ Make promises you can't keep

## Implementation Tips

1. **Make it accessible**: Store in an easy-to-find location
2. **Train employees**: Don't just distribute—educate
3. **Lead by example**: Leadership should model behavior
4. **Update regularly**: Review at least annually`,
      highlights: [
        'Policies protect brand and empower employees',
        'Cover both personal and professional use',
        'Train employees, don\'t just distribute documents',
      ],
      relatedResources: [
        { title: 'Social Media Policy Template', url: '#', type: 'download' },
      ],
    },
    estimatedMinutes: 6,
    isRequired: true,
    masteryThreshold: 70,
  },
  {
    id: 'fsm-l4-quiz',
    lessonId: 'fsm-l4',
    type: 'quiz',
    title: 'Social Media Policy Quiz',
    content: {
      questions: [
        {
          id: 'l4-q1',
          type: 'multiple-choice',
          question: 'What is the primary purpose of a social media policy?',
          options: [
            'To restrict employee social media use',
            'To protect the brand and guide employee behavior',
            'To increase social media followers',
            'To track employee activity',
          ],
          correctAnswer: 1,
          explanation: 'Social media policies exist to protect the brand while providing clear guidelines for employees to engage confidently.',
          difficulty: 1,
          skills: ['policy-fundamentals'],
        },
        {
          id: 'l4-q2',
          type: 'multiple-choice',
          question: 'How often should a social media policy be reviewed?',
          options: ['Never', 'Every 5 years', 'At least annually', 'Only when problems arise'],
          correctAnswer: 2,
          explanation: 'Social media policies should be reviewed at least annually to ensure they remain relevant and address current platforms and issues.',
          difficulty: 2,
          skills: ['policy-management'],
        },
        {
          id: 'l4-q3',
          type: 'multiple-choice',
          question: 'Which of these should NOT be in a social media policy?',
          options: [
            'Brand guidelines',
            'Confidentiality rules',
            'Employee social media passwords',
            'Personal use guidelines',
          ],
          correctAnswer: 2,
          explanation: 'Companies should never require employees to share personal account passwords. This is a privacy violation.',
          difficulty: 2,
          skills: ['policy-ethics'],
        },
        {
          id: 'l4-q4',
          type: 'multiple-choice',
          question: 'What is "The Golden Rule" for social media policies?',
          options: [
            'Post as often as possible',
            'If you wouldn\'t say it in a company meeting, don\'t post it',
            'Always tag the company account',
            'Never use personal accounts',
          ],
          correctAnswer: 1,
          explanation: 'The golden rule reminds employees to consider whether their post would be appropriate in a professional setting.',
          difficulty: 1,
          skills: ['policy-guidelines'],
        },
        {
          id: 'l4-q5',
          type: 'multiple-choice',
          question: 'What is the best way to implement a new social media policy?',
          options: [
            'Send an email and assume everyone reads it',
            'Train employees and make it easily accessible',
            'Only share it with the marketing team',
            'Keep it confidential from employees',
          ],
          correctAnswer: 1,
          explanation: 'Effective implementation requires training and making the policy easily accessible, not just distributing a document.',
          difficulty: 2,
          skills: ['policy-implementation'],
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
]

// ============================================
// LESSON 5: CHANNEL SELECTION
// ============================================

const lesson5Atoms: Atom[] = [
  {
    id: 'fsm-l5-video',
    lessonId: 'fsm-l5',
    type: 'video',
    title: 'Choose Your Social Media Channels',
    content: {
      videoUrl: '/videos/fsm/channel-selection.mp4',
      transcript: 'Choosing the right social media channels is crucial for reaching your target audience effectively...',
      duration: 420,
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 90, title: 'Platform Overview' },
        { time: 240, title: 'Selection Framework' },
        { time: 360, title: 'Conclusion' },
      ],
      keyTakeaways: [
        'Not every platform is right for every business',
        'Go where your audience already is',
        'Quality over quantity—master a few channels first',
        'Consider your resources and content capabilities',
      ],
    },
    estimatedMinutes: 7,
    isRequired: true,
    masteryThreshold: 80,
  },
  {
    id: 'fsm-l5-reading',
    lessonId: 'fsm-l5',
    type: 'reading',
    title: 'Channel Selection Framework',
    content: {
      body: `# Channel Selection Framework

Choosing the right social media channels requires a strategic approach based on your audience, resources, and goals.

## The Selection Process

### Step 1: Know Your Audience
Before choosing platforms, understand:
- **Demographics**: Age, location, income
- **Behaviors**: When they're online, how they engage
- **Preferences**: Content types they consume

### Step 2: Match Platforms to Audience

| Platform | Best For | Primary Audience |
|----------|----------|------------------|
| Facebook | Community building, local businesses | 25-54 years |
| Instagram | Visual brands, lifestyle, e-commerce | 18-34 years |
| TikTok | Entertainment, trends, Gen Z reach | 16-24 years |
| LinkedIn | B2B, professional services, recruiting | 25-55 years |
| Twitter/X | News, thought leadership, customer service | 25-49 years |
| Pinterest | DIY, home, fashion, food | 18-49 years (70% women) |
| YouTube | Education, entertainment, how-to | All ages |

### Step 3: Assess Your Resources

Consider honestly:
- **Time**: How many hours weekly can you dedicate?
- **Budget**: For ads, tools, and potentially hiring
- **Skills**: Photography, video editing, copywriting
- **Content**: What type can you consistently produce?

## The Quality Rule

> **Better to excel on 2 platforms than be mediocre on 6.**

Start with:
1. **One primary platform** where your core audience lives
2. **One secondary platform** for additional reach
3. **Expand only** when you've mastered the first two

## Platform Considerations

### Facebook
✅ Large, diverse audience
✅ Robust advertising tools
❌ Declining organic reach
❌ Younger users leaving

### Instagram
✅ High engagement rates
✅ Visual storytelling
❌ Requires quality visuals
❌ Algorithm changes frequently

### TikTok
✅ Explosive growth potential
✅ Authentic content works
❌ Requires video skills
❌ Younger demographic only

### LinkedIn
✅ Professional audience
✅ B2B goldmine
❌ Limited to business content
❌ Lower engagement rates`,
      highlights: [
        'Go where your audience already is',
        'Better to excel on 2 platforms than be mediocre on 6',
        'Consider your resources before expanding',
      ],
      relatedResources: [
        { title: 'Platform Demographics 2024', url: '#', type: 'article' },
      ],
    },
    estimatedMinutes: 6,
    isRequired: true,
    masteryThreshold: 70,
  },
  {
    id: 'fsm-l5-quiz',
    lessonId: 'fsm-l5',
    type: 'quiz',
    title: 'Channel Strategy Quiz',
    content: {
      questions: [
        {
          id: 'l5-q1',
          type: 'multiple-choice',
          question: 'What should primarily determine which social platforms you use?',
          options: [
            'Which platform is newest and trendiest',
            'Where your target audience spends time',
            'Which platform your competitors use',
            'Which platform is free to use',
          ],
          correctAnswer: 1,
          explanation: 'The most important factor is where your target audience already spends their time online.',
          difficulty: 1,
          skills: ['channel-strategy'],
        },
        {
          id: 'l5-q2',
          type: 'multiple-choice',
          question: 'According to the "Quality Rule," how many platforms should you start with?',
          options: ['1-2', '3-4', '5-6', 'All available'],
          correctAnswer: 0,
          explanation: 'It\'s better to excel on 2 platforms than be mediocre on 6. Start with 1-2 and master them before expanding.',
          difficulty: 2,
          skills: ['channel-strategy'],
        },
        {
          id: 'l5-q3',
          type: 'multiple-choice',
          question: 'Which platform is best for B2B marketing?',
          options: ['TikTok', 'Snapchat', 'LinkedIn', 'Pinterest'],
          correctAnswer: 2,
          explanation: 'LinkedIn is the premier platform for B2B marketing, professional services, and business networking.',
          difficulty: 1,
          skills: ['platform-selection'],
        },
        {
          id: 'l5-q4',
          type: 'multiple-choice',
          question: 'Which factor should you NOT consider when choosing platforms?',
          options: [
            'Your available time and resources',
            'Your content creation capabilities',
            'What your personal friends use',
            'Where your target audience is',
          ],
          correctAnswer: 2,
          explanation: 'Platform selection should be based on business goals and target audience, not personal preferences.',
          difficulty: 2,
          skills: ['channel-strategy'],
        },
        {
          id: 'l5-q5',
          type: 'multiple-choice',
          question: 'What is the primary age demographic for TikTok?',
          options: ['35-54 years', '45-65 years', '16-24 years', '25-34 years'],
          correctAnswer: 2,
          explanation: 'TikTok\'s primary audience is 16-24 years old, making it essential for reaching Gen Z.',
          difficulty: 1,
          skills: ['platform-demographics'],
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
]

// ============================================
// LESSON 6: CAMPAIGN OBJECTIVES
// ============================================

const lesson6Atoms: Atom[] = [
  {
    id: 'fsm-l6-video',
    lessonId: 'fsm-l6',
    type: 'video',
    title: 'Set a Campaign Objective',
    content: {
      videoUrl: '/videos/fsm/campaign-objectives.mp4',
      transcript: 'Setting the right campaign objective is the foundation of successful social media advertising...',
      duration: 420,
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 90, title: 'Objective Types' },
        { time: 240, title: 'Choosing the Right Objective' },
        { time: 360, title: 'Best Practices' },
      ],
      keyTakeaways: [
        'Campaign objectives tell the algorithm what to optimize for',
        'Choose objectives based on your business goals',
        'Awareness, Consideration, and Conversion are the main categories',
        'The wrong objective can waste your entire budget',
      ],
    },
    estimatedMinutes: 7,
    isRequired: true,
    masteryThreshold: 80,
  },
  {
    id: 'fsm-l6-reading',
    lessonId: 'fsm-l6',
    type: 'reading',
    title: 'Understanding Campaign Objectives',
    content: {
      body: `# Understanding Campaign Objectives

Your campaign objective is the most important decision you'll make. It determines how Meta's algorithm optimizes your ad delivery.

## The Marketing Funnel

Campaign objectives align with stages of the customer journey:

### Top of Funnel: Awareness
**Goal**: Reach new people who don't know your brand

Objectives:
- **Reach**: Show your ad to the maximum number of people
- **Brand Awareness**: Reach people likely to remember your ad

*Best for*: New brands, product launches, event promotion

### Middle of Funnel: Consideration
**Goal**: Get people interested and engaged

Objectives:
- **Traffic**: Drive visits to your website
- **Engagement**: Get likes, comments, shares
- **Video Views**: Get people to watch your videos
- **Lead Generation**: Collect contact information
- **Messages**: Start conversations

*Best for*: Building interest, nurturing prospects, content promotion

### Bottom of Funnel: Conversion
**Goal**: Get people to take action

Objectives:
- **Conversions**: Purchases, sign-ups, or other valuable actions
- **Catalog Sales**: Promote products from your catalog
- **Store Traffic**: Drive visits to physical locations

*Best for*: E-commerce, direct response, sales

## Choosing the Right Objective

Ask yourself:
1. **What do I want people to do?**
2. **Where is my audience in the funnel?**
3. **What does success look like?**

> **Pro Tip**: Match your objective to your actual goal. If you want sales, don't optimize for traffic—you'll get lots of clicks but few purchases.

## Common Mistakes

### ❌ Wrong: Choosing "Traffic" When You Want Sales
The algorithm will find people who click but don't buy.

### ❌ Wrong: Starting with Conversions for a New Audience
You need awareness first; jumping to conversions wastes budget.

### ✅ Right: Building a Funnel
Start with awareness → move to consideration → finish with conversion`,
      highlights: [
        'Objectives determine how the algorithm optimizes delivery',
        'Match your objective to your actual business goal',
        'Build a funnel: awareness → consideration → conversion',
      ],
      relatedResources: [
        { title: 'Meta Ads Manager', url: 'https://business.facebook.com/adsmanager', type: 'tool' },
      ],
    },
    estimatedMinutes: 6,
    isRequired: true,
    masteryThreshold: 70,
  },
  {
    id: 'fsm-l6-quiz',
    lessonId: 'fsm-l6',
    type: 'quiz',
    title: 'Campaign Objectives Quiz',
    content: {
      questions: [
        {
          id: 'l6-q1',
          type: 'multiple-choice',
          question: 'What does your campaign objective tell Meta\'s algorithm?',
          options: [
            'How much to spend',
            'Who to show the ad to',
            'What to optimize for',
            'When to run the ad',
          ],
          correctAnswer: 2,
          explanation: 'Your campaign objective tells the algorithm what outcome to optimize for—clicks, views, purchases, etc.',
          difficulty: 1,
          skills: ['campaign-objectives'],
        },
        {
          id: 'l6-q2',
          type: 'multiple-choice',
          question: 'Which objective category is at the top of the marketing funnel?',
          options: ['Conversion', 'Consideration', 'Awareness', 'Engagement'],
          correctAnswer: 2,
          explanation: 'Awareness objectives are at the top of the funnel, designed to reach people who don\'t yet know your brand.',
          difficulty: 1,
          skills: ['marketing-funnel'],
        },
        {
          id: 'l6-q3',
          type: 'multiple-choice',
          question: 'If you want people to purchase on your website, which objective should you choose?',
          options: ['Traffic', 'Engagement', 'Conversions', 'Reach'],
          correctAnswer: 2,
          explanation: 'The Conversions objective optimizes for valuable actions like purchases, not just clicks or engagement.',
          difficulty: 1,
          skills: ['objective-selection'],
        },
        {
          id: 'l6-q4',
          type: 'multiple-choice',
          question: 'What is a common mistake when setting campaign objectives?',
          options: [
            'Using video content',
            'Choosing Traffic when you want sales',
            'Starting with awareness objectives',
            'Testing multiple audiences',
          ],
          correctAnswer: 1,
          explanation: 'Choosing Traffic when you want sales is a common mistake—you\'ll get clicks but not purchases.',
          difficulty: 2,
          skills: ['campaign-strategy'],
        },
        {
          id: 'l6-q5',
          type: 'multiple-choice',
          question: 'Which objective would you use to collect email addresses?',
          options: ['Traffic', 'Lead Generation', 'Brand Awareness', 'Reach'],
          correctAnswer: 1,
          explanation: 'Lead Generation is designed to collect contact information like email addresses directly within Facebook.',
          difficulty: 2,
          skills: ['objective-selection'],
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
]

// ============================================
// LESSON 7: CAMPAIGN BUDGETING
// ============================================

const lesson7Atoms: Atom[] = [
  {
    id: 'fsm-l7-video',
    lessonId: 'fsm-l7',
    type: 'video',
    title: 'Determine Your Campaign Budget',
    content: {
      videoUrl: '/videos/fsm/campaign-budget.mp4',
      transcript: 'Setting the right budget is crucial for campaign success. Too little and you won\'t get results; too much and you\'ll waste money...',
      duration: 540,
      chapters: [
        { time: 0, title: 'Introduction to Budgeting' },
        { time: 120, title: 'Daily vs. Lifetime Budgets' },
        { time: 300, title: 'Budget Optimization' },
        { time: 450, title: 'Scaling Strategies' },
      ],
      keyTakeaways: [
        'Start with enough budget to exit the learning phase',
        'Daily budgets give consistent spend; lifetime budgets offer flexibility',
        'Campaign Budget Optimization (CBO) can improve efficiency',
        'Scale gradually—increase budget by 20% at a time',
      ],
    },
    estimatedMinutes: 9,
    isRequired: true,
    masteryThreshold: 80,
  },
  {
    id: 'fsm-l7-reading',
    lessonId: 'fsm-l7',
    type: 'reading',
    title: 'Budget Strategy and Optimization',
    content: {
      body: `# Budget Strategy and Optimization

Effective budget management is the difference between profitable campaigns and wasted ad spend.

## Budget Types

### Daily Budget
**Fixed amount spent each day**

Pros:
- Predictable daily spend
- Easy to manage
- Consistent delivery

Cons:
- Less flexibility
- May miss opportunities

*Best for*: Ongoing campaigns, consistent messaging

### Lifetime Budget
**Total amount for the campaign duration**

Pros:
- More flexibility for Meta to optimize
- Can take advantage of cheaper periods
- Set it and forget it

Cons:
- Less predictable daily spend
- Requires an end date

*Best for*: Promotions, events, time-limited offers

## The Learning Phase

Meta's algorithm needs data to optimize effectively.

### What is it?
The initial period where Meta learns who responds to your ad.

### How long?
Usually takes **50 conversion events** per week per ad set.

### Why it matters
- Ads in learning phase are less stable
- Exiting learning phase improves performance
- Budget changes can reset learning

> **Pro Tip**: Set a budget that allows at least 50 conversions per week. If your cost per conversion is $10, that's a minimum weekly budget of $500.

## Campaign Budget Optimization (CBO)

Let Meta distribute budget across ad sets automatically.

### How it works
- Set one campaign budget
- Meta allocates to best-performing ad sets
- Reduces manual management

### When to use it
- Multiple ad sets targeting different audiences
- Testing which audience performs best
- Scaling proven campaigns

## Scaling Strategies

### Gradual Scaling
Increase budget by **20% every 3-4 days**
- Preserves optimization
- Reduces learning phase reset risk

### Horizontal Scaling
Create new ad sets for different audiences
- Keeps current winners running
- Tests new opportunities

### What NOT to Do
❌ Double your budget overnight
❌ Make constant small changes
❌ Scale before exiting learning phase`,
      highlights: [
        'Exit learning phase before scaling (50 conversions/week)',
        'Scale gradually: 20% every 3-4 days',
        'CBO lets Meta optimize budget automatically',
      ],
      relatedResources: [
        { title: 'Meta Ads Budget Calculator', url: '#', type: 'tool' },
      ],
    },
    estimatedMinutes: 6,
    isRequired: true,
    masteryThreshold: 70,
  },
  {
    id: 'fsm-l7-quiz',
    lessonId: 'fsm-l7',
    type: 'quiz',
    title: 'Campaign Budgeting Quiz',
    content: {
      questions: [
        {
          id: 'l7-q1',
          type: 'multiple-choice',
          question: 'What is the main difference between daily and lifetime budgets?',
          options: [
            'Lifetime budgets cost more',
            'Daily budgets are fixed per day; lifetime is total for duration',
            'Daily budgets only work for video ads',
            'There is no difference',
          ],
          correctAnswer: 1,
          explanation: 'Daily budgets set a fixed amount per day, while lifetime budgets set a total amount for the entire campaign duration.',
          difficulty: 1,
          skills: ['budget-types'],
        },
        {
          id: 'l7-q2',
          type: 'multiple-choice',
          question: 'How many conversion events are typically needed to exit the learning phase?',
          options: ['10 per week', '25 per week', '50 per week', '100 per week'],
          correctAnswer: 2,
          explanation: 'Meta typically needs about 50 conversion events per week per ad set to exit the learning phase.',
          difficulty: 2,
          skills: ['learning-phase'],
        },
        {
          id: 'l7-q3',
          type: 'multiple-choice',
          question: 'When scaling a successful campaign, how much should you increase the budget at once?',
          options: ['Double it', 'Increase by 20%', 'Increase by 50%', 'Triple it'],
          correctAnswer: 1,
          explanation: 'Increase budget by 20% every 3-4 days to preserve optimization and avoid resetting the learning phase.',
          difficulty: 2,
          skills: ['scaling-strategy'],
        },
        {
          id: 'l7-q4',
          type: 'multiple-choice',
          question: 'What does CBO stand for?',
          options: [
            'Campaign Budget Optimization',
            'Cost-Based Ordering',
            'Conversion Budget Options',
            'Click Budget Optimizer',
          ],
          correctAnswer: 0,
          explanation: 'CBO stands for Campaign Budget Optimization, which lets Meta automatically distribute budget across ad sets.',
          difficulty: 1,
          skills: ['cbo'],
        },
        {
          id: 'l7-q5',
          type: 'multiple-choice',
          question: 'What is "horizontal scaling"?',
          options: [
            'Doubling your budget',
            'Creating new ad sets for different audiences',
            'Running ads horizontally',
            'Reducing budget gradually',
          ],
          correctAnswer: 1,
          explanation: 'Horizontal scaling means creating new ad sets for different audiences while keeping current winners running.',
          difficulty: 2,
          skills: ['scaling-strategy'],
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
]

// ============================================
// LESSONS
// ============================================

const lesson1: Lesson = {
  id: 'fsm-l1',
  moduleId: 'fsm-m1',
  number: 1,
  title: 'The Facebook Ecosystem',
  objectives: ['Understand Facebook\'s history and evolution', 'Learn about the Meta family of apps'],
  estimatedMinutes: 17,
  atoms: lesson1Atoms,
  isLocked: false,
}

const lesson2: Lesson = {
  id: 'fsm-l2',
  moduleId: 'fsm-m1',
  number: 2,
  title: 'Building Your Instagram Presence',
  objectives: ['Learn to define and find your target audience', 'Master engagement strategies'],
  estimatedMinutes: 21,
  atoms: lesson2Atoms,
  isLocked: false,
}

const lesson3: Lesson = {
  id: 'fsm-l3',
  moduleId: 'fsm-m1',
  number: 3,
  title: 'Messaging with Snapchat',
  objectives: ['Understand Snapchat\'s unique features', 'Learn to reach younger audiences'],
  estimatedMinutes: 18,
  atoms: lesson3Atoms,
  isLocked: false,
}

const lesson4: Lesson = {
  id: 'fsm-l4',
  moduleId: 'fsm-m1',
  number: 4,
  title: 'Creating Social Media Policy',
  objectives: ['Understand why policies matter', 'Learn key policy components'],
  estimatedMinutes: 20,
  atoms: lesson4Atoms,
  isLocked: false,
}

const lesson5: Lesson = {
  id: 'fsm-l5',
  moduleId: 'fsm-m1',
  number: 5,
  title: 'Choosing Your Channels',
  objectives: ['Learn to select the right platforms', 'Match channels to audience'],
  estimatedMinutes: 18,
  atoms: lesson5Atoms,
  isLocked: false,
}

const lesson6: Lesson = {
  id: 'fsm-l6',
  moduleId: 'fsm-m1',
  number: 6,
  title: 'Campaign Objectives',
  objectives: ['Understand campaign objective types', 'Learn to match objectives to goals'],
  estimatedMinutes: 18,
  atoms: lesson6Atoms,
  isLocked: false,
}

const lesson7: Lesson = {
  id: 'fsm-l7',
  moduleId: 'fsm-m1',
  number: 7,
  title: 'Campaign Budgeting',
  objectives: ['Learn budget types and strategies', 'Understand scaling techniques'],
  estimatedMinutes: 20,
  atoms: lesson7Atoms,
  isLocked: false,
}

// ============================================
// EXPORT MODULE
// ============================================

export const FSM_MODULE_1: Module = {
  id: 'fsm-m1',
  courseId: 'fsm-course',
  number: 1,
  title: 'Social Media Marketing Fundamentals',
  objectives: [
    'Master the major social media platforms',
    'Develop effective content and engagement strategies',
    'Create and manage advertising campaigns',
  ],
  estimatedMinutes: 132,
  lessons: [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson7],
  isLocked: false,
}
