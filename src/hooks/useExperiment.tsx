'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/store/userProfileStore';

interface ExperimentConfig {
  useAdaptiveSequencing: boolean;
  useStruggleDetection: boolean;
  useProactiveCoach: boolean;
  usePretests: boolean;
  useContentVariants: boolean;
}

interface ExperimentState {
  loading: boolean;
  error: string | null;
  config: ExperimentConfig;
  experiments: { experimentId: string; variant: 'control' | 'treatment' }[];
}

const DEFAULT_CONFIG: ExperimentConfig = {
  useAdaptiveSequencing: true,
  useStruggleDetection: true,
  useProactiveCoach: true,
  usePretests: true,
  useContentVariants: true,
};

/**
 * Hook to get the current user's experiment configuration
 * Determines which features are enabled based on experiment assignments
 */
export function useExperiment(): ExperimentState & {
  isFeatureEnabled: (feature: keyof ExperimentConfig) => boolean;
  refreshConfig: () => Promise<void>;
} {
  const { user } = useUser();
  const [state, setState] = useState<ExperimentState>({
    loading: true,
    error: null,
    config: DEFAULT_CONFIG,
    experiments: [],
  });

  const fetchConfig = useCallback(async () => {
    if (!user?.id) {
      setState((prev) => ({
        ...prev,
        loading: false,
        config: DEFAULT_CONFIG,
        experiments: [],
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch(`/api/experiments/config`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch experiment config');
      }

      const data = await response.json();

      setState({
        loading: false,
        error: null,
        config: data.config || DEFAULT_CONFIG,
        experiments: data.experiments || [],
      });
    } catch (err) {
      console.error('Error fetching experiment config:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        config: DEFAULT_CONFIG,
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const isFeatureEnabled = useCallback(
    (feature: keyof ExperimentConfig): boolean => {
      return state.config[feature] ?? DEFAULT_CONFIG[feature];
    },
    [state.config]
  );

  return {
    ...state,
    isFeatureEnabled,
    refreshConfig: fetchConfig,
  };
}

/**
 * Hook to check if a specific feature is enabled
 * Simpler API for components that only need one feature check
 */
export function useFeatureFlag(feature: keyof ExperimentConfig): {
  enabled: boolean;
  loading: boolean;
} {
  const { config, loading } = useExperiment();
  return {
    enabled: config[feature] ?? DEFAULT_CONFIG[feature],
    loading,
  };
}

/**
 * Hook to assign a user to an experiment
 */
export function useExperimentAssignment(experimentId: string): {
  variant: 'control' | 'treatment' | null;
  loading: boolean;
  error: string | null;
} {
  const { user } = useUser();
  const [variant, setVariant] = useState<'control' | 'treatment' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function assignVariant() {
      if (!user?.id || !experimentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/experiments/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ experimentId }),
        });

        if (!response.ok) {
          throw new Error('Failed to assign experiment variant');
        }

        const data = await response.json();
        setVariant(data.variant);
      } catch (err) {
        console.error('Error assigning variant:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    assignVariant();
  }, [user?.id, experimentId]);

  return { variant, loading, error };
}

/**
 * HOC to wrap components with experiment-based rendering
 */
export function withExperimentFeature<P extends object>(
  Component: React.ComponentType<P>,
  feature: keyof ExperimentConfig,
  FallbackComponent?: React.ComponentType<P>
): React.ComponentType<P> {
  return function ExperimentWrapper(props: P) {
    const { enabled, loading } = useFeatureFlag(feature);

    if (loading) {
      return null; // Or a loading spinner
    }

    if (!enabled && FallbackComponent) {
      return <FallbackComponent {...props} />;
    }

    if (!enabled) {
      return null;
    }

    return <Component {...props} />;
  };
}
