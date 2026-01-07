'use client';

import { Suspense } from 'react';
import { CelebrationProvider } from '@/components/celebration/CelebrationSystem';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { MonitoringProvider } from '@/components/providers/MonitoringProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
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
      </Suspense>
    </ErrorBoundary>
  );
}
