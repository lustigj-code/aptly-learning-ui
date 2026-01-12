/**
 * PWA Install Prompt Utilities
 * Handles "Add to Home Screen" functionality
 */

// Store the deferred prompt for later use
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installCallbacks: Array<(prompt: BeforeInstallPromptEvent) => void> = [];

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

/**
 * Initialize install prompt handling
 * Should be called once on app load
 */
export function initInstallPrompt(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();

    // Store the event for later use
    deferredPrompt = event as BeforeInstallPromptEvent;

    console.log('[PWA] Install prompt captured');

    // Notify all registered callbacks
    installCallbacks.forEach((callback) => callback(deferredPrompt!));
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;

    // Track installation
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-expect-error - gtag is added by Google Analytics
      window.gtag('event', 'pwa_install');
    }
  });
}

/**
 * Register callback for when install prompt becomes available
 */
export function onInstallPromptAvailable(
  callback: (prompt: BeforeInstallPromptEvent) => void
): () => void {
  installCallbacks.push(callback);

  // If prompt is already available, call immediately
  if (deferredPrompt) {
    callback(deferredPrompt);
  }

  // Return cleanup function
  return () => {
    installCallbacks = installCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Show the install prompt
 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return 'unavailable';
  }

  try {
    // Show the prompt
    await deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`[PWA] User ${outcome} the install prompt`);

    // Clear the prompt after use
    deferredPrompt = null;

    return outcome;
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error);
    return 'unavailable';
  }
}

/**
 * Check if install prompt is available
 */
export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Get the current install state
 */
export function getInstallState(): InstallState {
  if (typeof window === 'undefined') {
    return {
      isInstallable: false,
      isInstalled: false,
      platform: 'unknown',
    };
  }

  const isInstalled = checkIfInstalled();
  const platform = getPlatform();
  const isInstallable = !isInstalled && (deferredPrompt !== null || platform === 'ios');

  return {
    isInstallable,
    isInstalled,
    platform,
  };
}

/**
 * Check if the app is already installed
 */
export function checkIfInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check display mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS specific
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) {
    return true;
  }

  // Check if launched from home screen on Android
  if (document.referrer.includes('android-app://')) {
    return true;
  }

  return false;
}

/**
 * Get the current platform
 */
export function getPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }

  if (/android/.test(userAgent)) {
    return 'android';
  }

  if (/windows|macintosh|linux/.test(userAgent) && !/mobile/.test(userAgent)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Check if running in Safari on iOS (for manual install instructions)
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  const webkit = /WebKit/i.test(ua);
  const standalone = (navigator as { standalone?: boolean }).standalone;

  // iOS Safari doesn't support beforeinstallprompt, so check for Safari specifically
  return iOS && webkit && !standalone && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
}

/**
 * Get iOS install instructions
 */
export function getIOSInstallInstructions(): string[] {
  return [
    'Tap the Share button at the bottom of the screen',
    'Scroll down and tap "Add to Home Screen"',
    'Tap "Add" in the top right corner',
    'Aptly will now appear on your home screen',
  ];
}

/**
 * Dismiss the install prompt (user chose not to install)
 */
export function dismissInstallPrompt(): void {
  // Store dismissal in localStorage to avoid showing again too soon
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('aptly-install-dismissed', Date.now().toString());
  }
}

/**
 * Check if install prompt was recently dismissed
 */
export function wasInstallPromptDismissed(cooldownMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  const dismissed = localStorage.getItem('aptly-install-dismissed');
  if (!dismissed) {
    return false;
  }

  const dismissedTime = parseInt(dismissed, 10);
  return Date.now() - dismissedTime < cooldownMs;
}

/**
 * Clear install dismissal (allow prompt again)
 */
export function clearInstallDismissal(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('aptly-install-dismissed');
  }
}

/**
 * Check if user should be prompted to install
 * Returns true if app is installable, not installed, and not recently dismissed
 */
export function shouldPromptInstall(): boolean {
  const state = getInstallState();

  if (!state.isInstallable || state.isInstalled) {
    return false;
  }

  // Check if recently dismissed
  if (wasInstallPromptDismissed()) {
    return false;
  }

  return true;
}
