'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface OfflineIndicatorProps {
  /** Show as a compact badge instead of full banner */
  compact?: boolean;
  /** Show when online (with online status) */
  showWhenOnline?: boolean;
  /** Show pending sync count */
  showPendingCount?: boolean;
}

export function OfflineIndicator({
  compact = false,
  showWhenOnline = false,
  showPendingCount = true,
}: OfflineIndicatorProps) {
  const { isOnline, pendingCount, isSyncing, syncPendingProgress, lastSyncResult } = useOfflineSync();

  // Determine what to show
  const showOffline = !isOnline;
  const showPending = isOnline && pendingCount > 0 && showPendingCount;
  const showSyncing = isOnline && isSyncing;

  // Don't show if online and not configured to show (and nothing pending)
  if (isOnline && !showWhenOnline && !showPending && !showSyncing) {
    return null;
  }

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        {showOffline && (
          <motion.div
            key="offline"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full"
          >
            <WifiOff className="w-3 h-3" />
            Offline
          </motion.div>
        )}
        {showSyncing && (
          <motion.div
            key="syncing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal/10 text-teal text-xs font-medium rounded-full"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing...
          </motion.div>
        )}
        {showPending && !showSyncing && (
          <motion.button
            key="pending"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => syncPendingProgress()}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal/10 text-teal text-xs font-medium rounded-full hover:bg-teal/20 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {pendingCount} pending
          </motion.button>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {showOffline && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-warning text-white"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <WifiOff className="w-4 h-4" />
            <span>You&apos;re offline. Your progress will sync when you reconnect.</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                {pendingCount} pending
              </span>
            )}
          </div>
        </motion.div>
      )}
      {showSyncing && (
        <motion.div
          key="syncing-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-teal text-white"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Syncing your progress...</span>
          </div>
        </motion.div>
      )}
      {showPending && !showSyncing && (
        <motion.div
          key="pending-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-teal/90 text-white"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            <span>{pendingCount} progress update{pendingCount !== 1 ? 's' : ''} waiting to sync.</span>
            <button
              onClick={() => syncPendingProgress()}
              className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
            >
              Sync now
            </button>
          </div>
        </motion.div>
      )}
      {lastSyncResult && lastSyncResult.synced > 0 && !showPending && !showSyncing && showWhenOnline && (
        <motion.div
          key="synced-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-green-500 text-white"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Progress synced successfully!</span>
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
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  // Determine status label
  let statusLabel = isOnline ? 'Online' : 'Offline';
  if (isSyncing) {
    statusLabel = 'Syncing';
  } else if (isOnline && pendingCount > 0) {
    statusLabel = `${pendingCount} pending`;
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          !isOnline
            ? 'bg-warning animate-pulse'
            : isSyncing
            ? 'bg-teal animate-pulse'
            : pendingCount > 0
            ? 'bg-teal'
            : 'bg-success'
        }`}
      />
      <span className="text-xs text-rich-black/60">{statusLabel}</span>
    </div>
  );
}
