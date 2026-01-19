'use client';

/**
 * useCognitiveLoad Hook
 *
 * Connects struggle detection to UI adaptations by converting StruggleState
 * into a normalized cognitive load value (0-1) and updating CSS custom properties
 * for visual feedback like CognitiveMesh gradient animations.
 *
 * Part of Phase 3C: Cognitive OS Rebuild
 */

import { useMemo, useEffect } from 'react';
import type { StruggleState } from '@/lib/coach/struggleDetector';

// ============================================
// TYPES
// ============================================

/**
 * Options for the useCognitiveLoad hook
 */
export interface UseCognitiveLoadOptions {
  /** Current struggle state from the struggle detector */
  struggleState?: StruggleState | null;
}

/**
 * Return value from useCognitiveLoad hook
 */
export interface CognitiveLoadResult {
  /** Cognitive load value 0-1 (0 = calm, 1 = overwhelmed) */
  cognitiveLoad: number;
  /** Severity level from struggle state */
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  /** Whether student is currently struggling */
  isStruggling: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Mapping from severity levels to cognitive load values
 * These values drive the CognitiveMesh gradient intensity
 */
const SEVERITY_TO_LOAD: Record<string, number> = {
  severe: 0.9,
  moderate: 0.6,
  mild: 0.3,
  none: 0,
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook that converts struggle detection state into UI-friendly cognitive load values
 * and updates CSS custom properties for visual adaptations.
 *
 * @param options - Configuration options including the struggle state
 * @returns Cognitive load value, severity level, and struggling status
 *
 * @example
 * ```tsx
 * const [struggleState, setStruggleState] = useState<StruggleState | null>(null);
 * const { cognitiveLoad, severity, isStruggling } = useCognitiveLoad({ struggleState });
 *
 * // Pass to CognitiveMesh for background color
 * <CognitiveMesh cognitiveLoad={cognitiveLoad} />
 *
 * // Use for SageHUD state
 * const sageState = isStruggling && cognitiveLoad > 0.6 ? 'intervention' : 'pulse';
 * ```
 */
export function useCognitiveLoad(
  options: UseCognitiveLoadOptions = {}
): CognitiveLoadResult {
  const { struggleState } = options;

  // Calculate cognitive load from struggle state
  const cognitiveLoad = useMemo(() => {
    if (!struggleState || !struggleState.isStruggling) {
      return 0;
    }

    return SEVERITY_TO_LOAD[struggleState.overallSeverity] ?? 0;
  }, [struggleState]);

  // Extract severity and struggling status
  const severity = struggleState?.overallSeverity ?? 'none';
  const isStruggling = struggleState?.isStruggling ?? false;

  // Update CSS custom properties for gradient animations
  useEffect(() => {
    // SSR guard - only run on client
    if (typeof document === 'undefined') {
      return;
    }

    // Set cognitive intensity (0 to 0.9) for gradient animations
    document.documentElement.style.setProperty(
      '--cognitive-intensity',
      String(cognitiveLoad)
    );

    // Set cognitive state for conditional CSS styling
    document.documentElement.style.setProperty('--cognitive-state', severity);
  }, [cognitiveLoad, severity]);

  return {
    cognitiveLoad,
    severity,
    isStruggling,
  };
}
