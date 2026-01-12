/**
 * Response Validation for Grounded Coach
 *
 * Validates coach responses for:
 * - Grounding in retrieved content (no hallucination)
 * - Socratic compliance (not giving direct answers)
 * - Tier compliance (following intervention hierarchy)
 *
 * Part of Phase 12.3: RAG Retrieval Integration
 */

import type { RetrievedChunk } from '../rag/types';
import type { SourceCitation } from '../rag/contextBuilder';

// ============================================
// TYPES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  isGrounded: boolean;
  groundingScore: number;
  isSocratic: boolean;
  tierCompliant: boolean;
  flags: ValidationFlag[];
  suggestions: string[];
}

export interface ValidationFlag {
  type: 'hallucination' | 'direct_answer' | 'tier_violation' | 'low_grounding';
  severity: 'warning' | 'error';
  message: string;
  evidence?: string;
}

export interface GroundingMetrics {
  responseId: string;
  userId: string;
  groundingScore: number;
  isGrounded: boolean;
  sourcesUsed: number;
  hallucationDetected: boolean;
  timestamp: Date;
}

// ============================================
// CONFIGURATION
// ============================================

const MIN_GROUNDING_SCORE = 0.5;
const SOCRATIC_KEYWORDS = [
  'what do you think',
  'how would you',
  'can you explain',
  'what makes you',
  'why do you',
  'have you considered',
  "let's think",
  'walk me through',
  'what would happen',
];

const DIRECT_ANSWER_PATTERNS = [
  /the (?:correct )?answer is/i,
  /the right answer/i,
  /you should choose/i,
  /the solution is/i,
  /it('s| is) (?:actually )?(?:option )?\b[A-D]\b/i,
  /select (?:option )?\b[A-D]\b/i,
];

const HALLUCINATION_INDICATORS = [
  /research shows that \d+%/i,
  /studies indicate that \d+%/i,
  /according to \w+ statistics/i,
  /data from \d{4}/i,
  /experts say that/i,
];

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate a coach response for grounding and quality
 *
 * @param response - The generated response text
 * @param retrievedChunks - The RAG chunks used for generation
 * @param interventionTier - The expected intervention tier
 * @returns Validation result with flags and suggestions
 */
export function validateResponse(
  response: string,
  retrievedChunks: RetrievedChunk[],
  interventionTier: 1 | 2 | 3
): ValidationResult {
  const flags: ValidationFlag[] = [];
  const suggestions: string[] = [];

  // Check grounding
  const groundingScore = calculateGrounding(response, retrievedChunks);
  const isGrounded = groundingScore >= MIN_GROUNDING_SCORE;

  if (!isGrounded) {
    flags.push({
      type: 'low_grounding',
      severity: 'warning',
      message: `Response has low grounding score (${(groundingScore * 100).toFixed(0)}%)`,
    });
    suggestions.push('Consider incorporating more content from course materials');
  }

  // Check for hallucinations
  const hallucinationCheck = detectHallucinations(response, retrievedChunks);
  if (hallucinationCheck.detected) {
    flags.push({
      type: 'hallucination',
      severity: 'error',
      message: 'Potential hallucination detected',
      evidence: hallucinationCheck.evidence,
    });
    suggestions.push('Remove unsupported claims or cite course content');
  }

  // Check Socratic compliance
  const isSocratic = checkSocraticCompliance(response);
  if (!isSocratic) {
    const directAnswerMatch = checkDirectAnswer(response);
    if (directAnswerMatch) {
      flags.push({
        type: 'direct_answer',
        severity: 'error',
        message: 'Response appears to give direct answer',
        evidence: directAnswerMatch,
      });
      suggestions.push('Rephrase to guide student with questions instead');
    }
  }

  // Check tier compliance
  const tierCompliant = checkTierCompliance(response, interventionTier);
  if (!tierCompliant) {
    flags.push({
      type: 'tier_violation',
      severity: 'warning',
      message: `Response may not align with Tier ${interventionTier} intervention`,
    });
    suggestions.push(`Adjust response to match Tier ${interventionTier} guidelines`);
  }

  const isValid =
    isGrounded &&
    !hallucinationCheck.detected &&
    isSocratic &&
    tierCompliant;

  return {
    isValid,
    isGrounded,
    groundingScore,
    isSocratic,
    tierCompliant,
    flags,
    suggestions,
  };
}

// ============================================
// GROUNDING CALCULATION
// ============================================

/**
 * Calculate grounding score for response
 */
function calculateGrounding(
  response: string,
  chunks: RetrievedChunk[]
): number {
  if (chunks.length === 0) {
    // No RAG context available
    return 0.3;
  }

  const responseLower = response.toLowerCase();
  let score = 0;

  // Extract significant words from chunks
  const chunkWords = new Set<string>();
  const chunkPhrases: string[] = [];

  for (const chunk of chunks) {
    const text = chunk.chunk.text.toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 5);
    words.forEach((w) => chunkWords.add(w));

    // Extract phrases (3-4 word sequences)
    const sentences = text.split(/[.!?]/);
    for (const sent of sentences) {
      const sentWords = sent.trim().split(/\s+/);
      if (sentWords.length >= 3) {
        chunkPhrases.push(sentWords.slice(0, 4).join(' '));
      }
    }
  }

  // Check word overlap
  const wordArray = Array.from(chunkWords);
  let wordMatches = 0;
  for (const word of wordArray.slice(0, 100)) {
    if (responseLower.includes(word)) {
      wordMatches++;
    }
  }
  const wordScore = wordArray.length > 0
    ? (wordMatches / Math.min(wordArray.length, 100)) * 0.4
    : 0;

  // Check phrase overlap
  let phraseMatches = 0;
  for (const phrase of chunkPhrases.slice(0, 20)) {
    if (responseLower.includes(phrase)) {
      phraseMatches++;
    }
  }
  const phraseScore = chunkPhrases.length > 0
    ? (phraseMatches / Math.min(chunkPhrases.length, 20)) * 0.3
    : 0;

  // Boost for misconception usage
  const hasMisconception = chunks.some(
    (c) => c.chunk.chunkType === 'misconception'
  );
  const misconceptionBonus = hasMisconception ? 0.1 : 0;

  score = wordScore + phraseScore + misconceptionBonus + 0.2; // Base score

  return Math.max(0, Math.min(1, score));
}

// ============================================
// HALLUCINATION DETECTION
// ============================================

/**
 * Detect potential hallucinations in response
 */
function detectHallucinations(
  response: string,
  chunks: RetrievedChunk[]
): { detected: boolean; evidence?: string } {
  const responseLower = response.toLowerCase();

  // Check for unsupported statistical claims
  for (const pattern of HALLUCINATION_INDICATORS) {
    const match = response.match(pattern);
    if (match) {
      // Check if claim is supported by chunks
      const isSupported = chunks.some((c) =>
        c.chunk.text.toLowerCase().includes(match[0].toLowerCase())
      );
      if (!isSupported) {
        return {
          detected: true,
          evidence: match[0],
        };
      }
    }
  }

  // Check for specific technical claims without support
  const technicalClaims = response.match(
    /(?:costs?|rates?|percentages?|numbers?) (?:of |is |are )?\$?\d+(?:\.\d+)?%?/gi
  );
  if (technicalClaims) {
    for (const claim of technicalClaims) {
      const isSupported = chunks.some((c) =>
        c.chunk.text.includes(claim)
      );
      if (!isSupported) {
        return {
          detected: true,
          evidence: claim,
        };
      }
    }
  }

  return { detected: false };
}

// ============================================
// SOCRATIC COMPLIANCE
// ============================================

/**
 * Check if response follows Socratic method
 */
function checkSocraticCompliance(response: string): boolean {
  const responseLower = response.toLowerCase();

  // Must contain questioning elements
  const hasQuestion = response.includes('?');
  const hasSocraticKeyword = SOCRATIC_KEYWORDS.some((kw) =>
    responseLower.includes(kw)
  );

  // Should not give direct answers
  const hasDirectAnswer = DIRECT_ANSWER_PATTERNS.some((p) => p.test(response));

  return (hasQuestion || hasSocraticKeyword) && !hasDirectAnswer;
}

/**
 * Check for direct answer patterns
 */
function checkDirectAnswer(response: string): string | null {
  for (const pattern of DIRECT_ANSWER_PATTERNS) {
    const match = response.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

// ============================================
// TIER COMPLIANCE
// ============================================

/**
 * Check if response matches intervention tier guidelines
 */
function checkTierCompliance(response: string, tier: 1 | 2 | 3): boolean {
  const responseLower = response.toLowerCase();

  switch (tier) {
    case 1:
      // Tier 1: Should be metacognitive questions
      return (
        responseLower.includes('what') ||
        responseLower.includes('how') ||
        responseLower.includes('why') ||
        responseLower.includes('think')
      );

    case 2:
      // Tier 2: Should point to specific areas
      return (
        responseLower.includes('notice') ||
        responseLower.includes('look at') ||
        responseLower.includes('consider') ||
        responseLower.includes('focus on') ||
        responseLower.includes('the key')
      );

    case 3:
      // Tier 3: Should include worked example or similar
      return (
        responseLower.includes('example') ||
        responseLower.includes('similar') ||
        responseLower.includes("let me show") ||
        responseLower.includes('here is how')
      );

    default:
      return true;
  }
}

// ============================================
// METRICS LOGGING
// ============================================

/**
 * Log grounding metrics for analysis
 */
export function logGroundingMetrics(
  metrics: GroundingMetrics
): void {
  // In production, this would write to analytics/monitoring system
  console.log('[GroundingMetrics]', {
    responseId: metrics.responseId,
    userId: metrics.userId,
    groundingScore: (metrics.groundingScore * 100).toFixed(1) + '%',
    isGrounded: metrics.isGrounded,
    sourcesUsed: metrics.sourcesUsed,
    hallucationDetected: metrics.hallucationDetected,
    timestamp: metrics.timestamp.toISOString(),
  });
}

/**
 * Create metrics object from validation result
 */
export function createGroundingMetrics(
  responseId: string,
  userId: string,
  validation: ValidationResult,
  sourcesUsed: number
): GroundingMetrics {
  return {
    responseId,
    userId,
    groundingScore: validation.groundingScore,
    isGrounded: validation.isGrounded,
    sourcesUsed,
    hallucationDetected: validation.flags.some(
      (f) => f.type === 'hallucination'
    ),
    timestamp: new Date(),
  };
}

// ============================================
// CITATION FORMATTING
// ============================================

/**
 * Format source citations for response
 */
export function formatCitations(citations: SourceCitation[]): string {
  if (citations.length === 0) {
    return '';
  }

  const topCitations = citations.slice(0, 3);
  return topCitations
    .map((c) => `- ${c.title} (relevance: ${(c.relevance * 100).toFixed(0)}%)`)
    .join('\n');
}

/**
 * Add citations to response if needed
 */
export function appendCitations(
  response: string,
  citations: SourceCitation[],
  includeCitations: boolean = false
): string {
  if (!includeCitations || citations.length === 0) {
    return response;
  }

  const citationText = formatCitations(citations);
  return `${response}\n\n---\n_Sources: ${citationText}_`;
}

// ============================================
// EXPORTS
// ============================================

export { MIN_GROUNDING_SCORE, SOCRATIC_KEYWORDS, DIRECT_ANSWER_PATTERNS };
