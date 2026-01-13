# Agent 1-1: Training Data Pipeline

## Mission
Build EdNet/ASSISTments data ingestion pipeline for baseline ML model training.

## Working Directory
`/Users/juleslustig/Projects/_Aptly/aptlylearning app/aptly-learning`

## Pre-Read (MANDATORY)
Before writing any code, read these files to understand existing patterns:
```
src/lib/mastery/fsrs.ts          # FSRS parameter structure
src/lib/mastery/bkt.ts           # BKT parameter structure
src/lib/ml/hybridModel.ts        # Model input/output format
src/lib/ml/hybridModelTypes.ts   # Type definitions
```

## Files to Create

### 1. `src/lib/ml/training/ednetLoader.ts`
Purpose: Fetch and parse EdNet dataset format

```typescript
// Structure to implement:
export interface EdNetInteraction {
  userId: string;
  questionId: string;
  skillId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  timestamp: number;
}

export async function loadEdNetData(path: string): Promise<EdNetInteraction[]>
export async function loadASSISTmentsData(path: string): Promise<EdNetInteraction[]>
export function validateDataset(data: EdNetInteraction[]): ValidationResult
```

Key requirements:
- Handle CSV and JSON formats
- Stream large files (EdNet has millions of rows)
- Validate required fields exist
- Handle missing values gracefully

### 2. `src/lib/ml/training/dataTransformer.ts`
Purpose: Convert external formats to our FSRS/BKT format

```typescript
// Structure to implement:
export function transformToFSRSFormat(interactions: EdNetInteraction[]): FSRSTrainingData[]
export function transformToBKTFormat(interactions: EdNetInteraction[]): BKTTrainingData[]
export function splitTrainTest(data: any[], ratio: number): { train: any[], test: any[] }
```

Key requirements:
- Map EdNet skill IDs to our skill taxonomy
- Calculate derived features (time since last interaction, attempt count)
- Handle cold-start cases (new users/skills)

### 3. `src/lib/ml/training/parameterEstimator.ts`
Purpose: Fit optimal FSRS/BKT parameters using MLE

```typescript
// Structure to implement:
export function estimateFSRSParameters(data: FSRSTrainingData[]): FSRSParameters
export function estimateBKTParameters(data: BKTTrainingData[]): BKTParameters
export function evaluateParameterFit(params: any, testData: any[]): EvaluationMetrics
```

Key requirements:
- Maximum Likelihood Estimation for BKT (P(L0), P(T), P(G), P(S))
- Grid search for FSRS (w parameters)
- Cross-validation to prevent overfitting
- Report AUC, accuracy, calibration metrics

### 4. `src/app/api/ml/train/route.ts`
Purpose: API endpoint to trigger training

```typescript
// POST /api/ml/train
// Body: { dataSource: 'ednet' | 'assistments', dataPath?: string }
// Returns: { trainingId: string, status: 'started' }

// Implementation requirements:
- Validate admin permissions
- Start training as background job
- Store progress in Firestore: `mlTraining/{trainingId}`
- Store optimized parameters in Firestore: `mlConfig/parameters`
```

### 5. `src/lib/ml/training/index.ts`
Export public API:
```typescript
export * from './ednetLoader';
export * from './dataTransformer';
export * from './parameterEstimator';
```

## Patterns to Follow

From `src/lib/mastery/fsrs.ts`:
- Parameter structure: `{ w: number[], requestRetention: number }`
- Rating scale: 1-4 (Again, Hard, Good, Easy)

From `src/lib/mastery/bkt.ts`:
- Parameter structure: `{ pL0, pT, pG, pS }` per skill
- Prediction: P(mastery) calculation

## Verification Steps

1. `npm run build` - Must compile without errors
2. `npm run lint` - Must pass linting
3. Unit test: Load sample EdNet CSV, verify parsing
4. Unit test: Transform data, verify format matches our types
5. Unit test: Estimate parameters on sample data, verify reasonable values

## Do NOT Modify
- `src/lib/ml/hybridModel.ts` (that's Agent 2-1's territory)
- `src/lib/mastery/fsrs.ts` (just read it)
- `src/lib/mastery/bkt.ts` (just read it)

## Output
When complete, you should have:
- 4 new files in `src/lib/ml/training/`
- 1 new API route
- Working training pipeline (even if using mock data initially)
