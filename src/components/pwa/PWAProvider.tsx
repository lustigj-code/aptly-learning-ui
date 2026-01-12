'use client';

import { useEffect, ReactNode } from 'react';
import { registerServiceWorker, initInstallPrompt } from '@/lib/pwa';
import { InstallPrompt } from './InstallPrompt';
import { UpdateNotification } from './UpdateNotification';
import { OfflineIndicator } from './OfflineIndicator';

interface PWAProviderProps {
  children: ReactNode;
  /** Show install prompt */
  showInstallPrompt?: boolean;
  /** Show update notification */
  showUpdateNotification?: boolean;
  /** Show offline indicator banner */
  showOfflineIndicator?: boolean;
}

/**
 * PWA Provider Component
 * Initializes service worker and provides PWA UI components
 */
export function PWAProvider({
  children,
  showInstallPrompt = true,
  showUpdateNotification = true,
  showOfflineIndicator = true,
}: PWAProviderProps) {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Initialize install prompt handling
    initInstallPrompt();
  }, []);

  return (
    <>
      {/* Offline indicator at top of page */}
      {showOfflineIndicator && <OfflineIndicator />}

      {/* Main content */}
      {children}

      {/* PWA UI overlays */}
      {showInstallPrompt && <InstallPrompt />}
      {showUpdateNotification && <UpdateNotification />}
    </>
  );
}
