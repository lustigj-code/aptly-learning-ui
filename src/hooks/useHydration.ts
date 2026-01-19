'use client';

import { useSyncExternalStore } from 'react';

// Hook to detect when Zustand has hydrated from localStorage
// Uses useSyncExternalStore to avoid setState-in-effect pattern
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useHydration() {
  return useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
}
