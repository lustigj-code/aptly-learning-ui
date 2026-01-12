'use client';

import { useState, useEffect, useMemo } from 'react';
import { WifiOff, RefreshCw, BookOpen, Home } from 'lucide-react';
import Link from 'next/link';
import { addConnectionListener } from '@/lib/pwa';

export default function OfflinePage() {
  // Get initial online state synchronously to avoid cascading renders
  const initialOnlineState = useMemo(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return false;
  }, []);

  const [online, setOnline] = useState(initialOnlineState);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const cleanup = addConnectionListener(
      () => setOnline(true),
      () => setOnline(false)
    );

    return cleanup;
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (online) {
      window.location.href = '/dashboard';
    } else {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-light-teal flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-warning" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-navy mb-2">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-rich-black/60 mb-6">
          {online
            ? "You're back online! Click below to continue learning."
            : "Don't worry, your progress is saved. Connect to the internet to continue your learning journey."}
        </p>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`w-3 h-3 rounded-full ${
              online ? 'bg-success animate-pulse' : 'bg-warning'
            }`}
          />
          <span className="text-sm text-rich-black/60">
            {online ? 'Connection restored' : 'No internet connection'}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`w-full py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              online
                ? 'bg-teal text-white hover:bg-teal-dark'
                : 'bg-light-grey text-rich-black/60'
            } ${isRefreshing ? 'opacity-50' : ''}`}
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            {online ? 'Continue Learning' : 'Try Again'}
          </button>

          <Link
            href="/"
            className="w-full py-3 px-6 rounded-xl font-semibold border-2 border-light-grey text-navy hover:bg-light-grey/50 flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </Link>
        </div>

        {/* Offline learning tip */}
        <div className="mt-8 p-4 bg-light-teal rounded-xl text-left">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-navy text-sm">
                Offline Learning Tip
              </h3>
              <p className="text-sm text-rich-black/60 mt-1">
                Previously viewed lessons are cached for offline access.
                Download courses in Settings to study without internet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-sm text-navy/60">
        Aptly Learning - Your progress is always saved
      </p>
    </div>
  );
}
