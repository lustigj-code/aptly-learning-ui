/**
 * EdNet/ASSISTments Data Loader
 *
 * Loads and validates external learning interaction datasets for ML model training.
 * Supports EdNet and ASSISTments formats, which are standard benchmarks in
 * knowledge tracing research.
 *
 * EdNet: Large-scale Korean education dataset (100M+ interactions)
 * ASSISTments: US math tutoring platform dataset
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Unified interaction format from external datasets
 */
export interface EdNetInteraction {
  /** User identifier */
  userId: string;
  /** Question/item identifier */
  questionId: string;
  /** Skill/knowledge component identifier */
  skillId: string;
  /** Whether the response was correct */
  isCorrect: boolean;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Unix timestamp of the interaction */
  timestamp: number;
  /** Optional question difficulty (if available in dataset) */
  questionDifficulty?: number;
  /** Optional attempt number */
  attemptNumber?: number;
  /** Original row data for debugging */
  _raw?: Record<string, string>;
}

/**
 * Result of dataset validation
 */
export interface ValidationResult {
  /** Whether the dataset is valid */
  valid: boolean;
  /** Number of valid interactions */
  validCount: number;
  /** Number of invalid interactions */
  invalidCount: number;
  /** Specific validation errors */
  errors: ValidationError[];
  /** Dataset statistics */
  stats: DatasetStats;
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Row number (1-indexed) */
  row: number;
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Value that failed validation */
  value: unknown;
}

/**
 * Dataset statistics
 */
export interface DatasetStats {
  /** Total number of interactions */
  totalInteractions: number;
  /** Number of unique users */
  uniqueUsers: number;
  /** Number of unique questions */
  uniqueQuestions: number;
  /** Number of unique skills */
  uniqueSkills: number;
  /** Overall correct rate */
  correctRate: number;
  /** Date range */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Average interactions per user */
  avgInteractionsPerUser: number;
  /** Average response time (ms) */
  avgResponseTimeMs: number;
}

/**
 * Options for loading data
 */
export interface LoadOptions {
  /** Maximum number of rows to load (for testing) */
  maxRows?: number;
  /** Skip rows with missing required fields instead of erroring */
  skipInvalid?: boolean;
  /** Custom field mapping for non-standard formats */
  fieldMapping?: Partial<FieldMapping>;
  /** Filter by user IDs */
  userIds?: string[];
  /** Filter by skill IDs */
  skillIds?: string[];
  /** Minimum timestamp (Unix ms) */
  minTimestamp?: number;
  /** Maximum timestamp (Unix ms) */
  maxTimestamp?: number;
}

/**
 * Field mapping for CSV columns
 */
export interface FieldMapping {
  userId: string;
  questionId: string;
  skillId: string;
  isCorrect: string;
  responseTimeMs: string;
  timestamp: string;
  questionDifficulty?: string;
  attemptNumber?: string;
}

// ============================================================================
// DEFAULT FIELD MAPPINGS
// ============================================================================

/**
 * Default field mapping for EdNet KT1 dataset
 * Reference: https://github.com/riiid/ednet
 */
const EDNET_FIELD_MAPPING: FieldMapping = {
  userId: 'user_id',
  questionId: 'question_id',
  skillId: 'skill_id',
  isCorrect: 'correct',
  responseTimeMs: 'elapsed_time',
  timestamp: 'timestamp',
  questionDifficulty: 'difficulty',
};

/**
 * Default field mapping for ASSISTments dataset
 * Reference: https://sites.google.com/site/assistmentsdata/
 */
const ASSISTMENTS_FIELD_MAPPING: FieldMapping = {
  userId: 'user_id',
  questionId: 'problem_id',
  skillId: 'skill_id',
  isCorrect: 'correct',
  responseTimeMs: 'ms_first_response',
  timestamp: 'start_time',
  attemptNumber: 'attempt_count',
};

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse CSV header and create field indices
 */
function parseHeader(
  headerLine: string,
  fieldMapping: FieldMapping
): Map<string, number> {
  const headers = parseCSVLine(headerLine);
  const indices = new Map<string, number>();

  for (const [field, csvColumn] of Object.entries(fieldMapping)) {
    const index = headers.findIndex(
      (h) => h.toLowerCase() === csvColumn.toLowerCase()
    );
    if (index !== -1) {
      indices.set(field, index);
    }
  }

  return indices;
}

/**
 * Parse a data row into an interaction object
 */
function parseRow(
  values: string[],
  indices: Map<string, number>,
  rowNumber: number
): EdNetInteraction | null {
  const getValue = (field: string): string | undefined => {
    const idx = indices.get(field);
    return idx !== undefined ? values[idx] : undefined;
  };

  const userId = getValue('userId');
  const questionId = getValue('questionId');
  const skillId = getValue('skillId');
  const isCorrectStr = getValue('isCorrect');
  const responseTimeStr = getValue('responseTimeMs');
  const timestampStr = getValue('timestamp');

  // Check required fields
  if (!userId || !questionId || !skillId || isCorrectStr === undefined) {
    return null;
  }

  // Parse correctness (handle various formats)
  let isCorrect: boolean;
  const correctLower = isCorrectStr.toLowerCase();
  if (correctLower === 'true' || correctLower === '1' || correctLower === 'yes') {
    isCorrect = true;
  } else if (correctLower === 'false' || correctLower === '0' || correctLower === 'no') {
    isCorrect = false;
  } else {
    return null;
  }

  // Parse response time (default to 0 if not available)
  let responseTimeMs = 0;
  if (responseTimeStr) {
    const parsed = parseFloat(responseTimeStr);
    if (!isNaN(parsed) && parsed >= 0) {
      responseTimeMs = Math.round(parsed);
    }
  }

  // Parse timestamp
  let timestamp = Date.now();
  if (timestampStr) {
    // Try parsing as Unix timestamp (seconds or milliseconds)
    const parsed = parseFloat(timestampStr);
    if (!isNaN(parsed)) {
      // If less than year 2000 in seconds, assume milliseconds
      timestamp = parsed < 946684800000 ? parsed * 1000 : parsed;
    } else {
      // Try parsing as date string
      const dateTimestamp = Date.parse(timestampStr);
      if (!isNaN(dateTimestamp)) {
        timestamp = dateTimestamp;
      }
    }
  }

  // Parse optional fields
  let questionDifficulty: number | undefined;
  const difficultyStr = getValue('questionDifficulty');
  if (difficultyStr) {
    const parsed = parseFloat(difficultyStr);
    if (!isNaN(parsed)) {
      questionDifficulty = parsed;
    }
  }

  let attemptNumber: number | undefined;
  const attemptStr = getValue('attemptNumber');
  if (attemptStr) {
    const parsed = parseInt(attemptStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      attemptNumber = parsed;
    }
  }

  // Build raw data for debugging
  const _raw: Record<string, string> = {};
  for (const [field, idx] of indices.entries()) {
    _raw[field] = values[idx] || '';
  }

  return {
    userId,
    questionId,
    skillId,
    isCorrect,
    responseTimeMs,
    timestamp,
    questionDifficulty,
    attemptNumber,
    _raw,
  };
}

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load EdNet dataset from file
 *
 * Supports CSV format with standard EdNet column names.
 * Streams large files to handle datasets with millions of rows.
 *
 * @param filePath - Path to the EdNet CSV file
 * @param options - Loading options
 * @returns Promise resolving to array of interactions
 */
export async function loadEdNetData(
  filePath: string,
  options: LoadOptions = {}
): Promise<EdNetInteraction[]> {
  const fieldMapping: FieldMapping = {
    ...EDNET_FIELD_MAPPING,
    ...options.fieldMapping,
  };

  return loadCSVData(filePath, fieldMapping, options);
}

/**
 * Load ASSISTments dataset from file
 *
 * Supports CSV format with standard ASSISTments column names.
 *
 * @param filePath - Path to the ASSISTments CSV file
 * @param options - Loading options
 * @returns Promise resolving to array of interactions
 */
export async function loadASSISTmentsData(
  filePath: string,
  options: LoadOptions = {}
): Promise<EdNetInteraction[]> {
  const fieldMapping: FieldMapping = {
    ...ASSISTMENTS_FIELD_MAPPING,
    ...options.fieldMapping,
  };

  return loadCSVData(filePath, fieldMapping, options);
}

/**
 * Load data from a JSON file
 *
 * Expects an array of interaction objects or an object with an 'interactions' array.
 *
 * @param filePath - Path to the JSON file
 * @param options - Loading options
 * @returns Promise resolving to array of interactions
 */
export async function loadJSONData(
  filePath: string,
  options: LoadOptions = {}
): Promise<EdNetInteraction[]> {
  const absolutePath = path.resolve(filePath);

  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  // Read and parse JSON
  const content = await fs.promises.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(content);

  // Extract interactions array
  let rawInteractions: unknown[];
  if (Array.isArray(parsed)) {
    rawInteractions = parsed;
  } else if (parsed.interactions && Array.isArray(parsed.interactions)) {
    rawInteractions = parsed.interactions;
  } else {
    throw new Error('JSON must be an array or have an "interactions" array property');
  }

  // Apply maxRows limit
  if (options.maxRows && rawInteractions.length > options.maxRows) {
    rawInteractions = rawInteractions.slice(0, options.maxRows);
  }

  // Convert to EdNetInteraction format
  const interactions: EdNetInteraction[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < rawInteractions.length; i++) {
    const raw = rawInteractions[i] as Record<string, unknown>;

    // Map fields
    const userId = String(raw.userId ?? raw.user_id ?? '');
    const questionId = String(raw.questionId ?? raw.question_id ?? raw.problem_id ?? '');
    const skillId = String(raw.skillId ?? raw.skill_id ?? '');

    if (!userId || !questionId || !skillId) {
      if (!options.skipInvalid) {
        errors.push({
          row: i + 1,
          field: 'required',
          message: 'Missing required field (userId, questionId, or skillId)',
          value: raw,
        });
      }
      continue;
    }

    // Parse correctness
    const correctValue = raw.isCorrect ?? raw.correct ?? raw.is_correct;
    let isCorrect: boolean;
    if (typeof correctValue === 'boolean') {
      isCorrect = correctValue;
    } else if (typeof correctValue === 'number') {
      isCorrect = correctValue === 1;
    } else if (typeof correctValue === 'string') {
      isCorrect = correctValue.toLowerCase() === 'true' || correctValue === '1';
    } else {
      if (!options.skipInvalid) {
        errors.push({
          row: i + 1,
          field: 'isCorrect',
          message: 'Invalid or missing isCorrect value',
          value: correctValue,
        });
      }
      continue;
    }

    // Parse numeric fields
    const responseTimeMs = Number(raw.responseTimeMs ?? raw.response_time_ms ?? raw.elapsed_time ?? 0);
    const timestamp = Number(raw.timestamp ?? Date.now());

    // Apply filters
    if (options.userIds && !options.userIds.includes(userId)) continue;
    if (options.skillIds && !options.skillIds.includes(skillId)) continue;
    if (options.minTimestamp && timestamp < options.minTimestamp) continue;
    if (options.maxTimestamp && timestamp > options.maxTimestamp) continue;

    interactions.push({
      userId,
      questionId,
      skillId,
      isCorrect,
      responseTimeMs: isNaN(responseTimeMs) ? 0 : Math.round(responseTimeMs),
      timestamp: isNaN(timestamp) ? Date.now() : timestamp,
      questionDifficulty: raw.questionDifficulty as number | undefined,
      attemptNumber: raw.attemptNumber as number | undefined,
    });
  }

  if (errors.length > 0 && !options.skipInvalid) {
    throw new Error(`JSON parsing errors: ${JSON.stringify(errors.slice(0, 5))}`);
  }

  return interactions;
}

/**
 * Generic CSV data loader with streaming support
 */
async function loadCSVData(
  filePath: string,
  fieldMapping: FieldMapping,
  options: LoadOptions = {}
): Promise<EdNetInteraction[]> {
  const absolutePath = path.resolve(filePath);

  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  return new Promise((resolve, reject) => {
    const interactions: EdNetInteraction[] = [];
    const errors: ValidationError[] = [];
    let rowNumber = 0;
    let headerIndices: Map<string, number> | null = null;

    const stream = fs.createReadStream(absolutePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      rowNumber++;

      // Skip empty lines
      if (!line.trim()) return;

      // First non-empty line is header
      if (!headerIndices) {
        headerIndices = parseHeader(line, fieldMapping);

        // Validate required columns exist
        const requiredFields = ['userId', 'questionId', 'skillId', 'isCorrect'];
        const missingFields = requiredFields.filter((f) => !headerIndices!.has(f));

        if (missingFields.length > 0) {
          rl.close();
          stream.destroy();
          reject(new Error(`Missing required columns: ${missingFields.join(', ')}`));
        }
        return;
      }

      // Check maxRows limit
      if (options.maxRows && interactions.length >= options.maxRows) {
        rl.close();
        stream.destroy();
        return;
      }

      // Parse data row
      const values = parseCSVLine(line);
      const interaction = parseRow(values, headerIndices, rowNumber);

      if (!interaction) {
        if (!options.skipInvalid) {
          errors.push({
            row: rowNumber,
            field: 'parse',
            message: 'Failed to parse row',
            value: line.substring(0, 100),
          });
        }
        return;
      }

      // Apply filters
      if (options.userIds && !options.userIds.includes(interaction.userId)) return;
      if (options.skillIds && !options.skillIds.includes(interaction.skillId)) return;
      if (options.minTimestamp && interaction.timestamp < options.minTimestamp) return;
      if (options.maxTimestamp && interaction.timestamp > options.maxTimestamp) return;

      interactions.push(interaction);
    });

    rl.on('close', () => {
      if (errors.length > 0 && !options.skipInvalid) {
        reject(new Error(`CSV parsing errors: ${JSON.stringify(errors.slice(0, 5))}`));
      } else {
        resolve(interactions);
      }
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a dataset and compute statistics
 *
 * Checks for:
 * - Required fields present and valid
 * - Timestamp ranges are reasonable
 * - Response times are non-negative
 * - Skill IDs are consistent
 *
 * @param data - Array of interactions to validate
 * @returns ValidationResult with stats and errors
 */
export function validateDataset(data: EdNetInteraction[]): ValidationResult {
  const errors: ValidationError[] = [];
  const users = new Set<string>();
  const questions = new Set<string>();
  const skills = new Set<string>();

  let validCount = 0;
  let correctCount = 0;
  let totalResponseTime = 0;
  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;

  for (let i = 0; i < data.length; i++) {
    const interaction = data[i];
    const row = i + 1;

    // Validate required fields
    if (!interaction.userId) {
      errors.push({ row, field: 'userId', message: 'Missing userId', value: interaction.userId });
      continue;
    }
    if (!interaction.questionId) {
      errors.push({ row, field: 'questionId', message: 'Missing questionId', value: interaction.questionId });
      continue;
    }
    if (!interaction.skillId) {
      errors.push({ row, field: 'skillId', message: 'Missing skillId', value: interaction.skillId });
      continue;
    }
    if (typeof interaction.isCorrect !== 'boolean') {
      errors.push({ row, field: 'isCorrect', message: 'Invalid isCorrect (must be boolean)', value: interaction.isCorrect });
      continue;
    }

    // Validate numeric fields
    if (interaction.responseTimeMs < 0) {
      errors.push({ row, field: 'responseTimeMs', message: 'Negative response time', value: interaction.responseTimeMs });
      continue;
    }

    // Validate timestamp (should be after year 2000 and not in future)
    const minValidTimestamp = 946684800000; // Jan 1, 2000
    const maxValidTimestamp = Date.now() + 24 * 60 * 60 * 1000; // Tomorrow
    if (interaction.timestamp < minValidTimestamp || interaction.timestamp > maxValidTimestamp) {
      errors.push({ row, field: 'timestamp', message: 'Timestamp out of valid range', value: interaction.timestamp });
      continue;
    }

    // Track valid interaction
    validCount++;
    users.add(interaction.userId);
    questions.add(interaction.questionId);
    skills.add(interaction.skillId);

    if (interaction.isCorrect) correctCount++;
    totalResponseTime += interaction.responseTimeMs;
    minTimestamp = Math.min(minTimestamp, interaction.timestamp);
    maxTimestamp = Math.max(maxTimestamp, interaction.timestamp);
  }

  const stats: DatasetStats = {
    totalInteractions: data.length,
    uniqueUsers: users.size,
    uniqueQuestions: questions.size,
    uniqueSkills: skills.size,
    correctRate: validCount > 0 ? correctCount / validCount : 0,
    dateRange: {
      start: new Date(minTimestamp === Infinity ? Date.now() : minTimestamp),
      end: new Date(maxTimestamp === -Infinity ? Date.now() : maxTimestamp),
    },
    avgInteractionsPerUser: users.size > 0 ? validCount / users.size : 0,
    avgResponseTimeMs: validCount > 0 ? totalResponseTime / validCount : 0,
  };

  return {
    valid: errors.length === 0,
    validCount,
    invalidCount: data.length - validCount,
    errors: errors.slice(0, 100), // Limit errors returned
    stats,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect file format from extension
 */
export function detectFileFormat(filePath: string): 'csv' | 'json' | 'unknown' {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv' || ext === '.tsv') return 'csv';
  if (ext === '.json' || ext === '.jsonl') return 'json';
  return 'unknown';
}

/**
 * Load data from file, auto-detecting format
 *
 * @param filePath - Path to data file
 * @param dataSource - Dataset type ('ednet' or 'assistments')
 * @param options - Loading options
 * @returns Promise resolving to array of interactions
 */
export async function loadData(
  filePath: string,
  dataSource: 'ednet' | 'assistments' | 'custom',
  options: LoadOptions = {}
): Promise<EdNetInteraction[]> {
  const format = detectFileFormat(filePath);

  if (format === 'json') {
    return loadJSONData(filePath, options);
  }

  if (format === 'csv') {
    if (dataSource === 'ednet') {
      return loadEdNetData(filePath, options);
    } else if (dataSource === 'assistments') {
      return loadASSISTmentsData(filePath, options);
    } else {
      // Custom format - use default EdNet mapping
      return loadEdNetData(filePath, options);
    }
  }

  throw new Error(`Unsupported file format: ${filePath}`);
}

/**
 * Sample a subset of interactions for testing
 *
 * Maintains user sequences (samples entire user histories, not random rows)
 *
 * @param data - Full dataset
 * @param sampleSize - Number of users to sample
 * @param seed - Random seed for reproducibility
 * @returns Sampled interactions
 */
export function sampleByUser(
  data: EdNetInteraction[],
  sampleSize: number,
  seed?: number
): EdNetInteraction[] {
  // Group by user
  const byUser = new Map<string, EdNetInteraction[]>();
  for (const interaction of data) {
    const existing = byUser.get(interaction.userId) || [];
    existing.push(interaction);
    byUser.set(interaction.userId, existing);
  }

  // Sample users
  const userIds = Array.from(byUser.keys());
  const shuffled = shuffleWithSeed(userIds, seed);
  const sampledUsers = shuffled.slice(0, sampleSize);

  // Collect all interactions for sampled users
  const result: EdNetInteraction[] = [];
  for (const userId of sampledUsers) {
    const userInteractions = byUser.get(userId) || [];
    // Sort by timestamp
    userInteractions.sort((a, b) => a.timestamp - b.timestamp);
    result.push(...userInteractions);
  }

  return result;
}

/**
 * Shuffle array with optional seed for reproducibility
 */
function shuffleWithSeed<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  let random: () => number;

  if (seed !== undefined) {
    // Simple seeded random (Mulberry32)
    let state = seed;
    random = () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  } else {
    random = Math.random;
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
