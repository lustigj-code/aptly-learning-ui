'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

type ProvidersProps = {
  children: React.ReactNode;
};

// Simple loading component that doesn't use any context
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-16 h-16 bg-teal rounded-2xl flex items-center justify-center animate-pulse">
        <span className="text-2xl font-bold text-white">A</span>
      </div>
    </div>
  );
}

// Dynamically import providers to prevent SSR issues
const DynamicProviders = dynamic(
  () => import('./ProvidersInner').then((mod) => mod.ProvidersInner),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

export function Providers({ children }: ProvidersProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DynamicProviders>{children}</DynamicProviders>
    </Suspense>
  );
}
