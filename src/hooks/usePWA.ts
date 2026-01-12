'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  onUpdateAvailable,
  skipWaiting,
  checkForUpdates,
  initInstallPrompt,
  onInstallPromptAvailable,
  showInstallPrompt,
  getInstallState,
  isOnline as checkOnline,
  addConnectionListener,
  isIOSSafari,
  getIOSInstallInstructions,
  shouldPromptInstall,
  dismissInstallPrompt,
  type ServiceWorkerStatus,
  type InstallState,
} from '@/lib/pwa';

export interface PWAState {
  // Service Worker
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;

  // Install
  isInstallable: boolean;
  isInstalled: boolean;
  platform: InstallState['platform'];
  showInstallPrompt: boolean;
  isIOSSafari: boolean;
  iosInstructions: string[];

  // Network
  isOnline: boolean;
}

export interface PWAActions {
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismissInstall: () => void;
  updateApp: () => void;
  checkForUpdates: () => Promise<void>;
}

export function usePWA(): PWAState & PWAActions {
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
  });

  const [installState, setInstallState] = useState<InstallState>({
    isInstallable: false,
    isInstalled: false,
    platform: 'unknown',
  });

  const [isOnline, setIsOnline] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Initialize service worker
  useEffect(() => {
    const init = async () => {
      // Register service worker
      const status = await registerServiceWorker();
      setSwStatus(status);

      // Initialize install prompt handling
      initInstallPrompt();

      // Check initial install state
      setInstallState(getInstallState());

      // Check if iOS Safari
      setIsIOS(isIOSSafari());

      // Check online status
      setIsOnline(checkOnline());

      // Check if we should show install prompt
      setShowPrompt(shouldPromptInstall());
    };

    init();
  }, []);

  // Listen for update availability
  useEffect(() => {
    const cleanup = onUpdateAvailable(() => {
      setSwStatus((prev) => ({ ...prev, isUpdateAvailable: true }));
    });

    return cleanup;
  }, []);

  // Listen for install prompt availability
  useEffect(() => {
    const cleanup = onInstallPromptAvailable(() => {
      setInstallState(getInstallState());
      setShowPrompt(shouldPromptInstall());
    });

    return cleanup;
  }, []);

  // Listen for online/offline changes
  useEffect(() => {
    const cleanup = addConnectionListener(
      () => setIsOnline(true),
      () => setIsOnline(false)
    );

    return cleanup;
  }, []);

  // Actions
  const promptInstall = useCallback(async () => {
    const result = await showInstallPrompt();
    if (result !== 'unavailable') {
      setShowPrompt(false);
      setInstallState(getInstallState());
    }
    return result;
  }, []);

  const dismissInstall = useCallback(() => {
    dismissInstallPrompt();
    setShowPrompt(false);
  }, []);

  const updateApp = useCallback(() => {
    skipWaiting();
  }, []);

  const checkUpdates = useCallback(async () => {
    await checkForUpdates();
  }, []);

  return {
    // Service Worker state
    isSupported: swStatus.isSupported,
    isRegistered: swStatus.isRegistered,
    isUpdateAvailable: swStatus.isUpdateAvailable,

    // Install state
    isInstallable: installState.isInstallable,
    isInstalled: installState.isInstalled,
    platform: installState.platform,
    showInstallPrompt: showPrompt,
    isIOSSafari: isIOS,
    iosInstructions: getIOSInstallInstructions(),

    // Network state
    isOnline,

    // Actions
    promptInstall,
    dismissInstall,
    updateApp,
    checkForUpdates: checkUpdates,
  };
}
