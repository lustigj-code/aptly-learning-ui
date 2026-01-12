'use client';

import { Suspense } from 'react';
import { CelebrationProvider } from '@/components/celebration/CelebrationSystem';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { MonitoringProvider } from '@/components/providers/MonitoringProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type ProvidersInnerProps = {
  children: React.ReactNode;
};

// Simple loading component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-16 h-16 bg-teal rounded-2xl flex items-center justify-center animate-pulse">
        <span className="text-2xl font-bold text-white">A</span>
      </div>
    </div>
  );
}

export function ProvidersInner({ children }: ProvidersInnerProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <QueryProvider>
          <MonitoringProvider>
            <AuthProvider>
              <ToastProvider>
                <CelebrationProvider>
                  <AppLayout>
                    {children}
                  </AppLayout>
                </CelebrationProvider>
              </ToastProvider>
            </AuthProvider>
          </MonitoringProvider>
        </QueryProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
