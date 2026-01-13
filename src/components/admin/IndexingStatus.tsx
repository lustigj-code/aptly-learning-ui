'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { get, post, isSuccess } from '@/lib/api/client';

// ============================================
// TYPES
// ============================================

interface IndexingStatusData {
  summary: {
    totalDocuments: number;
    totalChunks: number;
    lastFullIndex: string | null;
    pendingUpdates: number;
  };
  backgroundIndexer: {
    scheduledCourses: number;
    highPriorityCourses: number;
    nextRunRecommended: boolean;
  };
  courses: Array<{
    courseId: string;
    lastIndexed: string | null;
    chunksCount: number;
    status: 'never_indexed' | 'needs_update' | 'up_to_date';
  }>;
  reindexSchedule: Array<{
    courseId: string;
    lastIndexed: string | null;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  config: {
    vectorStore: {
      provider: string;
      configured: boolean;
      indexName?: string;
      collection?: string;
    };
    embedding: {
      provider: string;
      model: string;
      configured: boolean;
    };
  };
}

interface ReindexResult {
  success: boolean;
  action: string;
  result: {
    chunksIndexed: number;
    coursesProcessed: number;
    errors: string[];
    duration: number;
  };
}

// ============================================
// COMPONENT
// ============================================

/**
 * Admin widget showing RAG indexing status
 *
 * Features:
 * - Total documents and chunks indexed
 * - Last full index timestamp
 * - Pending updates count
 * - Trigger full re-index button
 *
 * Part of Phase 12.5: RAG Auto-Indexing
 */
export function IndexingStatus() {
  const [status, setStatus] = useState<IndexingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState<ReindexResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await get<IndexingStatusData>('/api/admin/rag/status');
      if (isSuccess(response)) {
        setStatus(response.data);
      } else {
        setError('Failed to fetch indexing status');
      }
    } catch (err) {
      console.error('Failed to fetch indexing status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleReindex = async (action: 'background' | 'force_all') => {
    if (reindexing) return;

    const confirmMessage =
      action === 'force_all'
        ? 'This will re-index ALL courses. This may take several minutes. Continue?'
        : 'This will run a background reindex of courses that need updating. Continue?';

    if (!confirm(confirmMessage)) return;

    setReindexing(true);
    setReindexResult(null);

    try {
      const response = await post<ReindexResult>('/api/admin/rag/status', { action });
      if (isSuccess(response)) {
        setReindexResult(response.data);
        // Refresh status after reindex
        await fetchStatus();
      }
    } catch (err) {
      console.error('Reindex failed:', err);
      setError(err instanceof Error ? err.message : 'Reindex failed');
    } finally {
      setReindexing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            RAG Index Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-gray-500">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
            className="mt-3"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  // Determine overall status
  const isConfigured = status.config.vectorStore.configured && status.config.embedding.configured;
  const hasContent = status.summary.totalChunks > 0;
  const hasPendingUpdates = status.summary.pendingUpdates > 0;

  const StatusIcon = !isConfigured
    ? AlertTriangle
    : !hasContent
    ? Clock
    : hasPendingUpdates
    ? AlertTriangle
    : CheckCircle;

  const statusColor = !isConfigured
    ? 'text-red-500'
    : !hasContent
    ? 'text-blue-500'
    : hasPendingUpdates
    ? 'text-amber-500'
    : 'text-green-500';

  const statusText = !isConfigured
    ? 'Not Configured'
    : !hasContent
    ? 'No Content Indexed'
    : hasPendingUpdates
    ? `${status.summary.pendingUpdates} Updates Pending`
    : 'Up to Date';

  // Format last indexed time
  const lastIndexedDate = status.summary.lastFullIndex
    ? new Date(status.summary.lastFullIndex)
    : null;
  const lastIndexedText = lastIndexedDate
    ? formatRelativeTime(lastIndexedDate)
    : 'Never';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            RAG Index Status
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-8 h-8 ${statusColor}`} />
          <div>
            <p className="font-medium">{statusText}</p>
            <p className="text-sm text-gray-500">
              Last indexed: {lastIndexedText}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold">
              {status.summary.totalChunks.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Total Chunks</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold">
              {status.summary.totalDocuments.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Indexed Courses</p>
          </div>
        </div>

        {/* Configuration status */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Vector Store:</span>
            <span
              className={
                status.config.vectorStore.configured
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {status.config.vectorStore.provider}
              {status.config.vectorStore.configured ? ' (OK)' : ' (Not configured)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Embeddings:</span>
            <span
              className={
                status.config.embedding.configured
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {status.config.embedding.model}
              {status.config.embedding.configured ? ' (OK)' : ' (Not configured)'}
            </span>
          </div>
        </div>

        {/* Pending updates list */}
        {status.reindexSchedule.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Pending Updates
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {status.reindexSchedule.slice(0, 3).map((item) => (
                <div
                  key={item.courseId}
                  className="flex justify-between text-xs"
                >
                  <span className="text-gray-600 truncate max-w-[150px]">
                    {item.courseId}
                  </span>
                  <span
                    className={
                      item.priority === 'high'
                        ? 'text-red-500'
                        : item.priority === 'medium'
                        ? 'text-amber-500'
                        : 'text-gray-500'
                    }
                  >
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reindex result */}
        {reindexResult && (
          <div
            className={`text-xs p-2 rounded ${
              reindexResult.success
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {reindexResult.success ? (
              <span>
                Indexed {reindexResult.result.chunksIndexed} chunks in{' '}
                {Math.round(reindexResult.result.duration / 1000)}s
              </span>
            ) : (
              <span>
                Errors: {reindexResult.result.errors.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleReindex('background')}
            isDisabled={reindexing || !isConfigured}
            className="flex-1"
          >
            {reindexing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Run Background Index
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleReindex('force_all')}
            isDisabled={reindexing || !isConfigured}
            className="flex-1"
          >
            {reindexing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-1" />
            )}
            Full Re-index
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// HELPERS
// ============================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default IndexingStatus;
