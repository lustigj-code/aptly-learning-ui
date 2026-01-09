/**
 * Embedding Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Google Generative AI SDK
const mockEmbedContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      constructor() {
        // Constructor
      }
      getGenerativeModel() {
        return {
          embedContent: mockEmbedContent,
        };
      }
    },
  };
});

describe('embeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable
    process.env.GOOGLE_GENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_GENAI_API_KEY;
  });

  describe('getEmbeddingConfig', () => {
    it('returns correct embedding configuration', async () => {
      const { getEmbeddingConfig } = await import('../embeddingService');
      const config = getEmbeddingConfig();

      expect(config.model).toBe('text-embedding-004');
      expect(config.dimensions).toBe(768);
      expect(config.maxBatchSize).toBe(100);
    });
  });

  describe('embedText', () => {
    it('embeds a sample text and returns a 768-dimension vector', async () => {
      // Mock a 768-dimensional vector
      const mockVector = Array.from({ length: 768 }, (_, i) => i * 0.001);
      mockEmbedContent.mockResolvedValue({
        embedding: { values: mockVector },
      });

      const { embedText } = await import('../embeddingService');
      const result = await embedText('What is social media marketing?');

      expect(result).toHaveLength(768);
      expect(result).toEqual(mockVector);
      expect(mockEmbedContent).toHaveBeenCalledWith('What is social media marketing?');
    });

    it('throws error for empty string', async () => {
      const { embedText } = await import('../embeddingService');
      await expect(embedText('')).rejects.toThrow('Text must be a non-empty string');
    });

    it('throws error for whitespace-only string', async () => {
      const { embedText } = await import('../embeddingService');
      await expect(embedText('   ')).rejects.toThrow('Text must be a non-empty string');
    });

    it('throws error for non-string input', async () => {
      const { embedText } = await import('../embeddingService');
      // @ts-expect-error Testing invalid input
      await expect(embedText(123)).rejects.toThrow('Text must be a non-empty string');
    });

    it('throws error for null input', async () => {
      const { embedText } = await import('../embeddingService');
      // @ts-expect-error Testing invalid input
      await expect(embedText(null)).rejects.toThrow('Text must be a non-empty string');
    });

    it('handles API errors gracefully', async () => {
      mockEmbedContent.mockRejectedValue(new Error('API error'));

      const { embedText } = await import('../embeddingService');
      await expect(embedText('test text')).rejects.toThrow('Failed to generate embedding: API error');
    });

    it('validates vector dimensions from API response', async () => {
      // Mock a wrong-sized vector
      mockEmbedContent.mockResolvedValue({
        embedding: { values: [0.1, 0.2, 0.3] }, // Only 3 dimensions
      });

      const { embedText } = await import('../embeddingService');
      await expect(embedText('test text')).rejects.toThrow('Expected 768-dimensional vector');
    });

    it('retries on transient errors', async () => {
      const mockVector = Array.from({ length: 768 }, () => Math.random());

      // Fail first time with rate limit, succeed second time
      mockEmbedContent
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          embedding: { values: mockVector },
        });

      const { embedText } = await import('../embeddingService');
      const result = await embedText('test text');

      expect(result).toHaveLength(768);
      expect(mockEmbedContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('embedBatch', () => {
    it('batch embeds 3 texts and returns vectors for all', async () => {
      const texts = [
        'What is Facebook advertising?',
        'How do lookalike audiences work?',
        'Explain conversion tracking.',
      ];

      // Mock different vectors for each text
      const mockVectors = texts.map((_, i) =>
        Array.from({ length: 768 }, (_, j) => (i + 1) * j * 0.0001)
      );

      mockEmbedContent
        .mockResolvedValueOnce({ embedding: { values: mockVectors[0] } })
        .mockResolvedValueOnce({ embedding: { values: mockVectors[1] } })
        .mockResolvedValueOnce({ embedding: { values: mockVectors[2] } });

      const { embedBatch } = await import('../embeddingService');
      const results = await embedBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(768);
      expect(results[1]).toHaveLength(768);
      expect(results[2]).toHaveLength(768);
      expect(mockEmbedContent).toHaveBeenCalledTimes(3);
    });

    it('throws error for empty array', async () => {
      const { embedBatch } = await import('../embeddingService');
      await expect(embedBatch([])).rejects.toThrow('Texts must be a non-empty array');
    });

    it('throws error if any text is empty', async () => {
      const { embedBatch } = await import('../embeddingService');
      await expect(embedBatch(['valid text', '', 'another valid text'])).rejects.toThrow(
        'Text at index 1 must be a non-empty string'
      );
    });

    it('handles single text array', async () => {
      const mockVector = Array.from({ length: 768 }, () => Math.random());
      mockEmbedContent.mockResolvedValue({
        embedding: { values: mockVector },
      });

      const { embedBatch } = await import('../embeddingService');
      const results = await embedBatch(['Single text']);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(768);
    });

    it('processes large batches correctly', async () => {
      const texts = Array.from({ length: 150 }, (_, i) => `Text number ${i}`);
      const mockVector = Array.from({ length: 768 }, () => Math.random());

      mockEmbedContent.mockResolvedValue({
        embedding: { values: mockVector },
      });

      const { embedBatch } = await import('../embeddingService');
      const results = await embedBatch(texts);

      expect(results).toHaveLength(150);
      // Verify all results have correct dimensions
      results.forEach((result) => {
        expect(result).toHaveLength(768);
      });
    });
  });

  describe('createEmbedding', () => {
    it('creates an Embedding object with text and vector', async () => {
      const mockVector = Array.from({ length: 768 }, () => Math.random());
      mockEmbedContent.mockResolvedValue({
        embedding: { values: mockVector },
      });

      const { createEmbedding } = await import('../embeddingService');
      const result = await createEmbedding('Test text');

      expect(result.text).toBe('Test text');
      expect(result.vector).toHaveLength(768);
      expect(result.metadata).toBeUndefined();
    });

    it('includes metadata when provided', async () => {
      const mockVector = Array.from({ length: 768 }, () => Math.random());
      mockEmbedContent.mockResolvedValue({
        embedding: { values: mockVector },
      });

      const { createEmbedding } = await import('../embeddingService');
      const metadata = { courseId: 'course-1', lessonId: 'lesson-1' };
      const result = await createEmbedding('Test text', metadata);

      expect(result.text).toBe('Test text');
      expect(result.vector).toHaveLength(768);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('API key handling', () => {
    it('throws error when API key is not set', async () => {
      delete process.env.GOOGLE_GENAI_API_KEY;

      // Need to reset the module to clear cached genAI instance
      vi.resetModules();

      // Re-mock after resetModules
      vi.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: class MockGoogleGenerativeAI {
          constructor() {}
          getGenerativeModel() {
            return { embedContent: vi.fn() };
          }
        },
      }));

      const { embedText: embedTextFresh } = await import('../embeddingService');

      await expect(embedTextFresh('test')).rejects.toThrow(
        'GOOGLE_GENAI_API_KEY environment variable is not set'
      );
    });
  });
});
