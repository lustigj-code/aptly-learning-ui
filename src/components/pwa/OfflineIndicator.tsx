'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

interface OfflineIndicatorProps {
  /** Show as a compact badge instead of full banner */
  compact?: boolean;
  /** Show when online (with online status) */
  showWhenOnline?: boolean;
}

export function OfflineIndicator({
  compact = false,
  showWhenOnline = false,
}: OfflineIndicatorProps) {
  const { isOnline } = usePWA();

  // Don't show if online and not configured to show
  if (isOnline && !showWhenOnline) {
    return null;
  }

  if (compact) {
    return (
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-warning-light text-warning text-xs font-medium rounded-full"
          >
            <WifiOff className="w-3 h-3" />
            Offline
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-warning text-white"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <WifiOff className="w-4 h-4" />
            <span>You&apos;re offline. Some features may be limited.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Connection status indicator (shows both online and offline states)
 */
export function ConnectionStatus() {
  const { isOnline } = usePWA();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-success' : 'bg-warning animate-pulse'
        }`}
      />
      <span className="text-xs text-rich-black/60">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
