'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface HybridStatus {
  sampleSize: number;
  lift: number;
  ready: boolean;
  reason: string;
}

/**
 * Admin widget showing hybrid model training status
 *
 * Part of Phase 15: Hybrid Learner Model
 */
export function HybridModelStatus() {
  const [status, setStatus] = useState<HybridStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/admin/hybrid-status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch hybrid status:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-24 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Unable to load hybrid model status
        </CardContent>
      </Card>
    );
  }

  const Icon = status.ready ? CheckCircle : status.sampleSize < 1000 ? Clock : AlertTriangle;
  const iconColor = status.ready ? 'text-green-500' : status.sampleSize < 1000 ? 'text-blue-500' : 'text-amber-500';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Hybrid Model Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${iconColor}`} />
          <div>
            <p className="font-medium">
              {status.ready ? 'Production Ready' : 'Training in Progress'}
            </p>
            <p className="text-sm text-gray-500">{status.reason}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold">{status.sampleSize.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Shadow Comparisons</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold">
              {status.lift > 0 ? '+' : ''}{(status.lift * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">Lift over BKT</p>
          </div>
        </div>

        {/* Progress to production */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress to 1,000 comparisons</span>
            <span>{Math.min(100, Math.round(status.sampleSize / 10))}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all"
              style={{ width: `${Math.min(100, status.sampleSize / 10)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HybridModelStatus;
