'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { get, isSuccess } from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface ModelMetrics {
  bkt: {
    auc: number;
    brier: number;
    rmse: number;
    predictions: number;
  };
  hybrid: {
    auc: number;
    brier: number;
    rmse: number;
    predictions: number;
  };
  comparison: {
    aucImprovement: number;
    brierImprovement: number;
    lift: number;
    sampleSize: number;
  };
  usersByPathway: {
    coldStart: number;
    warmingUp: number;
    warm: number;
  };
  confidenceDistribution: {
    low: number;    // < 0.5
    medium: number; // 0.5 - 0.8
    high: number;   // > 0.8
  };
  lastUpdated: string;
}

interface ModelPerformanceWidgetProps {
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Admin Dashboard Widget for Model Performance Metrics
 *
 * Shows:
 * - BKT vs Hybrid accuracy comparison
 * - Prediction confidence distribution
 * - Users by pathway (cold-start vs hybrid)
 * - Overall model lift metrics
 *
 * Part of Phase 15.2: Hybrid Model Integration
 */
export function ModelPerformanceWidget({ className }: ModelPerformanceWidgetProps) {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await get<ModelMetrics>('/api/admin/model-performance');
      if (isSuccess(response)) {
        setMetrics(response.data);
        setError(null);
      } else {
        setError('Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Failed to fetch model performance:', err);
      setError('Unable to load model performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchMetrics(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-gray-200 rounded" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Model Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-500">{error || 'No data available'}</p>
          <button
            onClick={() => fetchMetrics()}
            className="mt-4 text-sm text-teal hover:underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  const isHybridBetter = metrics.comparison.lift > 0;
  const totalUsers =
    metrics.usersByPathway.coldStart +
    metrics.usersByPathway.warmingUp +
    metrics.usersByPathway.warm;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Model Performance
          </CardTitle>
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Lift Summary */}
        <div className={`p-4 rounded-lg ${isHybridBetter ? 'bg-green-50' : 'bg-amber-50'}`}>
          <div className="flex items-center gap-3">
            {isHybridBetter ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-amber-600" />
            )}
            <div>
              <p className="text-2xl font-bold">
                {metrics.comparison.lift > 0 ? '+' : ''}
                {(metrics.comparison.lift * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">
                Hybrid model {isHybridBetter ? 'improvement' : 'vs'} over BKT
              </p>
            </div>
          </div>
        </div>

        {/* Model Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* BKT Metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="font-medium text-sm">BKT Model</span>
            </div>
            <div className="space-y-2 text-sm">
              <MetricRow
                label="AUC"
                value={metrics.bkt.auc}
                format="percent"
              />
              <MetricRow
                label="Brier"
                value={metrics.bkt.brier}
                format="decimal"
                lowerIsBetter
              />
              <MetricRow
                label="RMSE"
                value={metrics.bkt.rmse}
                format="decimal"
                lowerIsBetter
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.bkt.predictions.toLocaleString()} predictions
            </p>
          </div>

          {/* Hybrid Metrics */}
          <div className="bg-teal/5 rounded-lg p-4 border border-teal/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-teal" />
              <span className="font-medium text-sm">Hybrid Model</span>
            </div>
            <div className="space-y-2 text-sm">
              <MetricRow
                label="AUC"
                value={metrics.hybrid.auc}
                format="percent"
                compareValue={metrics.bkt.auc}
              />
              <MetricRow
                label="Brier"
                value={metrics.hybrid.brier}
                format="decimal"
                lowerIsBetter
                compareValue={metrics.bkt.brier}
              />
              <MetricRow
                label="RMSE"
                value={metrics.hybrid.rmse}
                format="decimal"
                lowerIsBetter
                compareValue={metrics.bkt.rmse}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.hybrid.predictions.toLocaleString()} predictions
            </p>
          </div>
        </div>

        {/* Users by Pathway */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-sm">Users by Pathway</span>
          </div>

          <div className="space-y-2">
            <PathwayBar
              label="Cold Start (BKT only)"
              count={metrics.usersByPathway.coldStart}
              total={totalUsers}
              color="bg-blue-500"
              icon={<Clock className="w-3.5 h-3.5" />}
            />
            <PathwayBar
              label="Warming Up (Blended)"
              count={metrics.usersByPathway.warmingUp}
              total={totalUsers}
              color="bg-amber-500"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
            <PathwayBar
              label="Warm (Hybrid)"
              count={metrics.usersByPathway.warm}
              total={totalUsers}
              color="bg-teal"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        {/* Confidence Distribution */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-sm">Prediction Confidence</span>
          </div>

          <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
            <ConfidenceSegment
              value={metrics.confidenceDistribution.low}
              color="bg-red-400"
              label="Low"
            />
            <ConfidenceSegment
              value={metrics.confidenceDistribution.medium}
              color="bg-amber-400"
              label="Medium"
            />
            <ConfidenceSegment
              value={metrics.confidenceDistribution.high}
              color="bg-green-500"
              label="High"
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low ({metrics.confidenceDistribution.low}%)</span>
            <span>Medium ({metrics.confidenceDistribution.medium}%)</span>
            <span>High ({metrics.confidenceDistribution.high}%)</span>
          </div>
        </div>

        {/* Sample Size */}
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Based on{' '}
            <span className="font-medium text-gray-700">
              {metrics.comparison.sampleSize.toLocaleString()}
            </span>{' '}
            shadow comparisons
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MetricRowProps {
  label: string;
  value: number;
  format: 'percent' | 'decimal';
  compareValue?: number;
  lowerIsBetter?: boolean;
}

function MetricRow({ label, value, format, compareValue, lowerIsBetter = false }: MetricRowProps) {
  const formattedValue =
    format === 'percent'
      ? `${(value * 100).toFixed(1)}%`
      : value.toFixed(4);

  let improvement: number | null = null;
  let isImprovement = false;

  if (compareValue !== undefined) {
    improvement = value - compareValue;
    isImprovement = lowerIsBetter ? improvement < 0 : improvement > 0;
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{formattedValue}</span>
        {improvement !== null && (
          <span
            className={`text-xs ${
              isImprovement ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {improvement > 0 ? '+' : ''}
            {format === 'percent'
              ? `${(improvement * 100).toFixed(1)}%`
              : improvement.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}

interface PathwayBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}

function PathwayBar({ label, count, total, color, icon }: PathwayBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="text-gray-500">
            {count.toLocaleString()} ({percentage.toFixed(0)}%)
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface ConfidenceSegmentProps {
  value: number;
  color: string;
  label: string;
}

function ConfidenceSegment({ value, color, label }: ConfidenceSegmentProps) {
  if (value === 0) return null;

  return (
    <div
      className={`${color} transition-all duration-500`}
      style={{ width: `${value}%` }}
      title={`${label}: ${value}%`}
    />
  );
}

export default ModelPerformanceWidget;
