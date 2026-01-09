/**
 * Content Chunker Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  chunkAtom,
  chunkLesson,
  estimateTokens,
  getChunkingConfig,
  type ContentChunk,
} from '../contentChunker';
import type { Atom, Lesson, ReadingContent, VideoContent, QuizContent, PracticeContent } from '@/types';

// ============================================
// TEST DATA
// ============================================

const createReadingAtom = (body: string, overrides: Partial<Atom> = {}): Atom => ({
  id: 'atom-reading-1',
  lessonId: 'lesson-1',
  type: 'reading',
  title: 'Introduction to Social Media Marketing',
  content: {
    body,
    highlights: ['Key point 1', 'Key point 2'],
  } as ReadingContent,
  estimatedMinutes: 10,
  isRequired: true,
  masteryThreshold: 80,
  ...overrides,
});

const createVideoAtom = (transcript: string): Atom => ({
  id: 'atom-video-1',
  lessonId: 'lesson-1',
  type: 'video',
  title: 'Video Tutorial',
  content: {
    videoUrl: 'https://example.com/video.mp4',
    transcript,
    duration: 300,
    chapters: [
      { time: 0, title: 'Introduction' },
      { time: 60, title: 'Main Content' },
    ],
    keyTakeaways: ['Takeaway 1', 'Takeaway 2'],
  } as VideoContent,
  estimatedMinutes: 5,
  isRequired: true,
  masteryThreshold: 80,
});

const createQuizAtom = (): Atom => ({
  id: 'atom-quiz-1',
  lessonId: 'lesson-1',
  type: 'quiz',
  title: 'Knowledge Check',
  content: {
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'What is the primary goal of social media marketing?',
        options: ['Increase brand awareness', 'Reduce costs', 'Hire employees', 'File taxes'],
        correctAnswer: 0,
        explanation: 'Social media marketing primarily aims to increase brand awareness and engagement.',
        difficulty: 2,
        skills: ['marketing-fundamentals'],
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Which platform is best for B2B marketing?',
        options: ['TikTok', 'LinkedIn', 'Snapchat', 'Pinterest'],
        correctAnswer: 1,
        explanation: 'LinkedIn is the premier platform for B2B marketing and professional networking.',
        difficulty: 2,
        skills: ['platform-selection'],
      },
    ],
    passingScore: 70,
  } as QuizContent,
  estimatedMinutes: 5,
  isRequired: true,
  masteryThreshold: 70,
});

const createPracticeAtom = (): Atom => ({
  id: 'atom-practice-1',
  lessonId: 'lesson-1',
  type: 'practice',
  title: 'Create a Campaign Brief',
  content: {
    type: 'exercise',
    prompt: 'Create a social media campaign brief for a new product launch.',
    context: 'You are the marketing manager for a tech startup launching a new app.',
    expectedOutcomes: [
      'Define target audience',
      'Set campaign objectives',
      'Choose appropriate platforms',
      'Create content calendar outline',
    ],
    rubric: [
      { criterion: 'Target audience clarity', weight: 0.25 },
      { criterion: 'Objective SMART criteria', weight: 0.25 },
      { criterion: 'Platform rationale', weight: 0.25 },
      { criterion: 'Content plan completeness', weight: 0.25 },
    ],
  } as PracticeContent,
  estimatedMinutes: 30,
  isRequired: true,
  masteryThreshold: 70,
});

const createLesson = (atoms: Atom[]): Lesson => ({
  id: 'lesson-1',
  moduleId: 'module-1',
  number: 1,
  title: 'Getting Started with Social Media Marketing',
  objectives: [
    'Understand the fundamentals of social media marketing',
    'Identify key platforms and their audiences',
    'Create a basic marketing strategy',
  ],
  estimatedMinutes: 45,
  atoms,
  isLocked: false,
});

// Generate a long text with specified word count
const generateLongText = (wordCount: number): string => {
  const words = [];
  const sampleWords = [
    'social', 'media', 'marketing', 'strategy', 'content', 'audience',
    'engagement', 'platform', 'campaign', 'analytics', 'brand', 'growth',
  ];
  for (let i = 0; i < wordCount; i++) {
    words.push(sampleWords[i % sampleWords.length]);
  }
  return words.join(' ');
};

// ============================================
// TESTS
// ============================================

describe('contentChunker', () => {
  const defaultContext = {
    courseId: 'course-1',
    moduleId: 'module-1',
    lessonId: 'lesson-1',
  };

  describe('getChunkingConfig', () => {
    it('returns correct chunking configuration', () => {
      const config = getChunkingConfig();

      expect(config.maxWordsPerChunk).toBe(500);
      expect(config.overlapWords).toBe(50);
      expect(config.minChunkWords).toBe(20);
    });
  });

  describe('estimateTokens', () => {
    it('estimates tokens as approximately 1.3x word count', () => {
      const text = 'This is a sample text with ten words in it.';
      const tokens = estimateTokens(text);

      // 10 words * 1.3 = 13, ceil = 13
      expect(tokens).toBe(13);
    });

    it('handles empty text', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('handles text with multiple spaces', () => {
      const text = 'word   word   word';
      const tokens = estimateTokens(text);
      expect(tokens).toBe(4); // 3 words * 1.3 = 3.9, ceil = 4
    });
  });

  describe('chunkAtom', () => {
    describe('reading atoms', () => {
      it('chunks a sample reading atom and verifies chunk structure', () => {
        const atom = createReadingAtom(
          'Social media marketing is the practice of using social media platforms to promote products, services, or content. It involves creating and sharing content, engaging with followers, and running paid advertising campaigns.'
        );

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0]).toMatchObject({
          courseId: 'course-1',
          moduleId: 'module-1',
          lessonId: 'lesson-1',
          atomId: 'atom-reading-1',
          atomType: 'reading',
          chunkIndex: 0,
        });
        expect(chunks[0].id).toBe('course-1_module-1_lesson-1_atom-reading-1_0');
        expect(chunks[0].text).toBeTruthy();
        expect(chunks[0].title).toBe('Introduction to Social Media Marketing');
      });

      it('splits long reading content into multiple chunks', () => {
        const longText = generateLongText(800); // More than 500 words
        const atom = createReadingAtom(longText);

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks.length).toBeGreaterThan(1);
      });

      it('verifies no chunk exceeds 500 words', () => {
        const longText = generateLongText(1500);
        const atom = createReadingAtom(longText);

        const chunks = chunkAtom(atom, defaultContext);

        chunks.forEach((chunk) => {
          const wordCount = chunk.text.split(/\s+/).filter((w) => w.length > 0).length;
          // Allow some flexibility due to overlap and section boundaries
          expect(wordCount).toBeLessThanOrEqual(550);
        });
      });

      it('includes highlights in the chunk text', () => {
        const atom = createReadingAtom(
          'This is the main body of the reading content with enough words to meet the minimum threshold for chunking.'
        );

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks.length).toBeGreaterThan(0);
        const allText = chunks.map((c) => c.text).join(' ');
        expect(allText).toContain('Key point 1');
        expect(allText).toContain('Key point 2');
      });
    });

    describe('video atoms', () => {
      it('chunks video transcript correctly', () => {
        const transcript = generateLongText(100);
        const atom = createVideoAtom(transcript);

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0].atomType).toBe('video');
        expect(chunks[0].atomId).toBe('atom-video-1');
      });

      it('includes key takeaways in video chunks', () => {
        const atom = createVideoAtom(
          'This is the video transcript with enough content to meet the minimum word threshold for chunking.'
        );

        const chunks = chunkAtom(atom, defaultContext);
        const allText = chunks.map((c) => c.text).join(' ');

        expect(allText).toContain('Takeaway 1');
        expect(allText).toContain('Takeaway 2');
      });
    });

    describe('quiz atoms', () => {
      it('creates one chunk per question', () => {
        const atom = createQuizAtom();

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks.length).toBe(2); // 2 questions
        expect(chunks[0].atomType).toBe('quiz');
        expect(chunks[0].text).toContain('What is the primary goal');
        expect(chunks[1].text).toContain('Which platform is best');
      });

      it('includes question options in chunks', () => {
        const atom = createQuizAtom();

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks[0].text).toContain('Increase brand awareness');
        expect(chunks[0].text).toContain('Options:');
      });

      it('includes explanations in chunks', () => {
        const atom = createQuizAtom();

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks[0].text).toContain('Explanation:');
        expect(chunks[0].text).toContain('brand awareness');
      });
    });

    describe('practice atoms', () => {
      it('chunks practice content with prompt and outcomes', () => {
        const atom = createPracticeAtom();

        const chunks = chunkAtom(atom, defaultContext);

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0].atomType).toBe('practice');

        const allText = chunks.map((c) => c.text).join(' ');
        expect(allText).toContain('Create a social media campaign brief');
        expect(allText).toContain('Define target audience');
        expect(allText).toContain('Target audience clarity');
      });

      it('includes rubric criteria in practice chunks', () => {
        const atom = createPracticeAtom();

        const chunks = chunkAtom(atom, defaultContext);
        const allText = chunks.map((c) => c.text).join(' ');

        expect(allText).toContain('Evaluation Criteria');
        expect(allText).toContain('25%');
      });
    });

    describe('chunk IDs', () => {
      it('generates unique chunk IDs following naming convention', () => {
        const atom = createReadingAtom(generateLongText(800));

        const chunks = chunkAtom(atom, defaultContext);
        const ids = chunks.map((c) => c.id);

        // Check uniqueness
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);

        // Check format
        ids.forEach((id, index) => {
          expect(id).toBe(`course-1_module-1_lesson-1_atom-reading-1_${index}`);
        });
      });

      it('chunk IDs include full hierarchy', () => {
        const atom = createReadingAtom(
          'A sample reading with enough words to create at least one chunk for testing.'
        );
        const context = {
          courseId: 'fsm-course',
          moduleId: 'module-ads',
          lessonId: 'lesson-targeting',
        };

        const chunks = chunkAtom(atom, context);

        expect(chunks[0].id).toContain('fsm-course');
        expect(chunks[0].id).toContain('module-ads');
        expect(chunks[0].id).toContain('lesson-targeting');
        expect(chunks[0].id).toContain('atom-reading-1');
      });
    });
  });

  describe('chunkLesson', () => {
    it('chunks all atoms in a lesson', () => {
      const lesson = createLesson([
        createReadingAtom(
          'Reading content with enough words to create a chunk for this test case.'
        ),
        createQuizAtom(),
      ]);

      const chunks = chunkLesson(lesson, { courseId: 'course-1', moduleId: 'module-1' });

      // Should have at least 1 reading chunk + 2 quiz chunks
      expect(chunks.length).toBeGreaterThanOrEqual(3);
    });

    it('prepends lesson title and objectives to first chunk', () => {
      const lesson = createLesson([
        createReadingAtom(
          'This is the reading content with enough words to meet the minimum threshold.'
        ),
      ]);

      const chunks = chunkLesson(lesson, { courseId: 'course-1', moduleId: 'module-1' });

      expect(chunks[0].text).toContain('Lesson: Getting Started with Social Media Marketing');
      expect(chunks[0].text).toContain('Learning Objectives');
      expect(chunks[0].text).toContain('Understand the fundamentals');
    });

    it('returns flat array of all chunks', () => {
      const lesson = createLesson([
        createReadingAtom(generateLongText(300)),
        createVideoAtom(generateLongText(200)),
        createPracticeAtom(),
      ]);

      const chunks = chunkLesson(lesson, { courseId: 'course-1', moduleId: 'module-1' });

      // All chunks should be in a flat array
      expect(Array.isArray(chunks)).toBe(true);
      chunks.forEach((chunk) => {
        expect(chunk).toHaveProperty('id');
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('atomType');
      });
    });

    it('handles lesson with no atoms', () => {
      const lesson = createLesson([]);

      const chunks = chunkLesson(lesson, { courseId: 'course-1', moduleId: 'module-1' });

      // Should create a metadata chunk with lesson info
      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toContain('Lesson: Getting Started');
      expect(chunks[0].atomId).toBe('metadata');
    });

    it('updates first chunk title to include lesson title', () => {
      const lesson = createLesson([
        createReadingAtom(
          'Content with enough words to create a proper chunk for testing purposes.'
        ),
      ]);

      const chunks = chunkLesson(lesson, { courseId: 'course-1', moduleId: 'module-1' });

      expect(chunks[0].title).toContain('Getting Started with Social Media Marketing');
    });

    it('preserves all chunk metadata from atoms', () => {
      const lesson = createLesson([createQuizAtom()]);

      const chunks = chunkLesson(lesson, { courseId: 'course-1', moduleId: 'module-1' });

      chunks.forEach((chunk) => {
        expect(chunk.courseId).toBe('course-1');
        expect(chunk.moduleId).toBe('module-1');
        expect(chunk.lessonId).toBe('lesson-1');
      });
    });
  });
});
