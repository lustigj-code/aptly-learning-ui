'use client';

import { useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Loader2, CheckCircle } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

type ConnectionState = 'offline' | 'syncing' | 'synced';

interface ConnectivityStatusProps {
  /** Additional CSS classes */
  className?: string;
  /** Duration to show "All Saved" before hiding (ms). Set to 0 to always show. */
  syncedDisplayDuration?: number;
}

// Simple external store for synced display state
let syncedDisplayState = false;
const syncedListeners = new Set<() => void>();

function setSyncedDisplay(value: boolean) {
  syncedDisplayState = value;
  syncedListeners.forEach((listener) => listener());
}

function subscribeSyncedDisplay(callback: () => void) {
  syncedListeners.add(callback);
  return () => syncedListeners.delete(callback);
}

function getSyncedDisplaySnapshot() {
  return syncedDisplayState;
}

function getSyncedDisplayServerSnapshot() {
  return false;
}

/**
 * Global connectivity status indicator for the navigation bar.
 * Shows connection state with animated transitions:
 * - Offline: "Offline - Changes Saved Locally" (Yellow)
 * - Syncing: "Syncing..." (Blue)
 * - Synced: "All Saved" (Green)
 */
export function ConnectivityStatus({
  className = '',
  syncedDisplayDuration = 3000,
}: ConnectivityStatusProps) {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const wasOfflineRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showSynced = useSyncExternalStore(
    subscribeSyncedDisplay,
    getSyncedDisplaySnapshot,
    getSyncedDisplayServerSnapshot
  );

  // Track offline status and trigger synced display after reconnection
  useEffect(() => {
    // Clear any existing timer on state change
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isOnline) {
      // Mark that we went offline
      wasOfflineRef.current = true;
      if (syncedDisplayState) {
        setSyncedDisplay(false);
      }
    } else if (wasOfflineRef.current && !isSyncing && pendingCount === 0) {
      // We were offline, now online and sync complete - show "All Saved"
      setSyncedDisplay(true);

      if (syncedDisplayDuration > 0) {
        timerRef.current = setTimeout(() => {
          setSyncedDisplay(false);
          wasOfflineRef.current = false;
        }, syncedDisplayDuration);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOnline, isSyncing, pendingCount, syncedDisplayDuration]);

  // Determine current state
  const state = useMemo((): ConnectionState | null => {
    if (!isOnline) return 'offline';
    if (isSyncing || (isOnline && pendingCount > 0)) return 'syncing';
    if (showSynced) return 'synced';
    return null;
  }, [isOnline, isSyncing, pendingCount, showSynced]);

  // Don't render if online and nothing to show
  if (!state) return null;

  const stateConfig = {
    offline: {
      icon: WifiOff,
      label: 'Offline - Changes Saved Locally',
      bgColor: 'bg-yellow/15',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-600',
      dotColor: 'bg-yellow',
    },
    syncing: {
      icon: Loader2,
      label: 'Syncing...',
      bgColor: 'bg-teal/10',
      textColor: 'text-teal',
      iconColor: 'text-teal',
      dotColor: 'bg-teal',
      iconAnimate: true,
    },
    synced: {
      icon: CheckCircle,
      label: 'All Saved',
      bgColor: 'bg-success/10',
      textColor: 'text-success',
      iconColor: 'text-success',
      dotColor: 'bg-success',
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.9, x: 10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: -10 }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${className}`}
      >
        {/* Animated status dot */}
        <motion.div
          className={`w-2 h-2 rounded-full ${config.dotColor}`}
          animate={
            state === 'offline' || state === 'syncing'
              ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
              : {}
          }
          transition={{
            repeat: state === 'offline' || state === 'syncing' ? Infinity : 0,
            duration: 1.5,
            ease: 'easeInOut',
          }}
        />

        {/* Icon */}
        <Icon
          className={`w-3.5 h-3.5 ${config.iconColor} ${
            'iconAnimate' in config && config.iconAnimate ? 'animate-spin' : ''
          }`}
        />

        {/* Label */}
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

export default ConnectivityStatus;
