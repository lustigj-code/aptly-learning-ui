/**
 * Accessibility Utilities
 * Phase 5.2: Accessibility Implementation
 *
 * Helpers for WCAG AA compliance and screen reader support
 */

/**
 * Generate unique ID for ARIA attributes
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Announce message to screen readers
 * Uses ARIA live region pattern
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Screen reader only
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get contrast ratio between two hex colors
 * For WCAG AA compliance checking
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map((c) => {
      const sRGB = c / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standard
 * AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function meetsWCAG_AA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Get accessible label for progress percentage
 */
export function getProgressLabel(percentage: number): string {
  if (percentage === 0) return 'Not started';
  if (percentage === 100) return 'Complete';
  if (percentage >= 75) return 'Almost complete';
  if (percentage >= 50) return 'Halfway there';
  if (percentage >= 25) return 'Getting started';
  return 'Just begun';
}

/**
 * Create keyboard trap for modals
 * Ensures focus stays within modal when open
 */
export function createFocusTrap(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Debounce keyboard events for better accessibility
 * Prevents rapid-fire actions from keyboard navigation
 */
export function debounceA11y<T extends (...args: any[]) => void>(
  func: T,
  wait: number = 150
): T {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T;
}

/**
 * Get descriptive text for icon-only buttons
 * Ensures screen readers can understand button purpose
 */
export function getIconButtonLabel(icon: string, action: string): string {
  const iconNames: Record<string, string> = {
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    menu: 'Menu',
    settings: 'Settings',
    help: 'Help',
    share: 'Share',
    bookmark: 'Bookmark',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
  };

  const iconName = iconNames[icon.toLowerCase()] || icon;
  return `${action} ${iconName}`.trim();
}

/**
 * Format number for screen readers
 * "1234" becomes "1 thousand 2 hundred 34"
 */
export function formatNumberForScreenReader(num: number): string {
  if (num < 1000) return num.toString();

  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;

  if (remainder === 0) {
    return `${thousands} thousand`;
  }

  return `${thousands} thousand ${remainder}`;
}

/**
 * Get accessible time duration description
 * "125" seconds becomes "2 minutes and 5 seconds"
 */
export function formatDurationForScreenReader(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${
    remainingSeconds !== 1 ? 's' : ''
  }`;
}
