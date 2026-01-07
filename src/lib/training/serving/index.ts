/**
 * Model Serving Module Exports
 *
 * Infrastructure for serving the fine-tuned Sage tutor model
 * with intelligent routing and fallback to OpenAI.
 */

export {
  type ModelProvider,
  type ModelConfig,
  type RouterConfig,
  type GenerateRequest,
  type GenerateResponse,
  type HealthStatus,
  DEFAULT_ROUTER_CONFIG,
  ModelRouter,
  getModelRouter,
  resetModelRouter,
} from './modelRouter';

/**
 * Serving Infrastructure Overview
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────┐     ┌─────────────────┐
 * │   Coach API     │────▶│  Model Router   │
 * └─────────────────┘     └────────┬────────┘
 *                                  │
 *               ┌──────────────────┼──────────────────┐
 *               ▼                  ▼                  ▼
 *        ┌──────────┐       ┌──────────┐       ┌──────────┐
 *        │  Sage    │       │  GPT-4   │       │ GPT-3.5  │
 *        │ (Modal)  │       │ (OpenAI) │       │ (OpenAI) │
 *        └──────────┘       └──────────┘       └──────────┘
 * ```
 *
 * ## Deployment
 *
 * 1. Deploy Sage model to Modal:
 *    ```bash
 *    modal deploy modal_serve.py
 *    ```
 *
 * 2. Set environment variable:
 *    ```
 *    SAGE_MODEL_ENDPOINT=https://your-username--sage-tutor-serve-generate.modal.run
 *    ```
 *
 * 3. The router automatically:
 *    - Uses Sage model as primary
 *    - Falls back to GPT-4 if Sage is unavailable
 *    - Falls back to GPT-3.5 if both fail
 *
 * ## A/B Testing
 *
 * Enable A/B testing to compare model versions:
 *
 * ```typescript
 * import { ModelRouter } from './serving';
 *
 * const router = new ModelRouter({
 *   ...DEFAULT_ROUTER_CONFIG,
 *   abTest: {
 *     enabled: true,
 *     testId: 'sage-v1-vs-v2',
 *     variants: [
 *       { id: 'control', weight: 0.5, config: sageV1Config },
 *       { id: 'treatment', weight: 0.5, config: sageV2Config },
 *     ],
 *   },
 * });
 *
 * // Variant is assigned based on userId for consistency
 * const response = await router.generate({
 *   messages: [...],
 *   userId: 'user123',
 * });
 *
 * console.log(response.variant); // 'control' or 'treatment'
 * ```
 *
 * ## Cost Comparison
 *
 * | Model      | Cost per 1K tokens | Typical response cost |
 * |------------|--------------------|-----------------------|
 * | Sage       | $0.0001           | ~$0.00005            |
 * | GPT-4      | $0.03             | ~$0.015              |
 * | GPT-3.5    | $0.002            | ~$0.001              |
 *
 * Using Sage reduces costs by 99.7% compared to GPT-4.
 */
