'use client';

import { useState, useCallback, useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import type { ProgressReportData } from '@/components/progress/ExportProgressReport';
import type { MasteryDataPoint } from '@/components/progress/MasteryTrajectoryChart';

export type ProgressVisualizationData = {
  masteryHistory: MasteryDataPoint[];
};

export type UseProgressReportResult = {
  report: ProgressReportData | null;
  visualization: ProgressVisualizationData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useProgressReport(userId: string | null): UseProgressReportResult {
  const [report, setReport] = useState<ProgressReportData | null>(null);
  const [visualization, setVisualization] = useState<ProgressVisualizationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!userId) {
      setReport(null);
      setVisualization(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `/api/progress/report?userId=${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch report: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
        setVisualization(data.visualization);
      } else {
        throw new Error(data.error || 'Failed to fetch report');
      }
    } catch (err) {
      console.error('Error fetching progress report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    report,
    visualization,
    isLoading,
    error,
    refresh: fetchReport,
  };
}

export default useProgressReport;
