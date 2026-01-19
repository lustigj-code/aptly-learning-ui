'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SPRING } from '@/lib/motion/springs';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type CookiePreferences = {
  necessary: boolean; // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const COOKIE_CONSENT_KEY = 'aptly_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'aptly_cookie_preferences';

// Helper to load saved preferences from localStorage (lazy initialization)
function loadSavedPreferences(): CookiePreferences {
  if (typeof window === 'undefined') {
    return { necessary: true, analytics: false, marketing: false, preferences: false };
  }
  const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (savedPreferences) {
    try {
      return JSON.parse(savedPreferences) as CookiePreferences;
    } catch {
      // Return defaults if parsing fails
    }
  }
  return { necessary: true, analytics: false, marketing: false, preferences: false };
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  // Use lazy initialization to avoid setState in effect
  const [preferences, setPreferences] = useState<CookiePreferences>(loadSavedPreferences);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Check if user has already made a choice - only show banner if no consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);

    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowCustomize(false);

    // Trigger analytics based on preferences
    if (prefs.analytics) {
      // Initialize analytics (placeholder for actual implementation)
      console.log('Analytics enabled');
    }
  };

  const handleAcceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  const handleRejectNonEssential = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  const handleCustomizeSave = () => {
    savePreferences(preferences);
  };

  const handleCustomizeOpen = () => {
    setShowCustomize(true);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Can't disable necessary cookies
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
      {/* Bottom Banner */}
      <AnimatePresence mode="wait">
        {showBanner && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 100 }}
            transition={prefersReducedMotion ? SPRING.none : SPRING.gentle}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
            role="dialog"
            aria-live="polite"
            aria-label="Cookie consent banner"
          >
            <div
              className={cn(
                'mx-auto max-w-5xl',
                'bg-white/90 backdrop-blur-xl',
                'border border-white/20',
                'rounded-2xl shadow-2xl',
                'ring-1 ring-navy/5'
              )}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 p-3 rounded-xl',
                      'bg-gradient-to-br from-teal to-teal-dark',
                      'shadow-md'
                    )}
                  >
                    <Cookie className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-navy mb-2">
                      We value your privacy
                    </h2>
                    <p className="text-sm text-rich-black/70 leading-relaxed mb-4">
                      We use cookies to enhance your learning experience, analyze site usage, and
                      personalize content. You can customize your preferences or accept all cookies.{' '}
                      <Link
                        href="/cookies"
                        className="text-teal hover:text-teal-dark font-medium underline underline-offset-2 transition-colors"
                      >
                        Learn more
                      </Link>
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleAcceptAll}
                        className="flex-shrink-0"
                      >
                        Accept All
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={handleRejectNonEssential}
                        className="flex-shrink-0"
                      >
                        Reject Non-Essential
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={handleCustomizeOpen}
                        className="flex-shrink-0"
                      >
                        Customize
                      </Button>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setShowBanner(false)}
                    aria-label="Dismiss cookie banner"
                    className={cn(
                      'flex-shrink-0 p-2 rounded-lg',
                      'min-w-[44px] min-h-[44px] flex items-center justify-center',
                      'text-rich-black/40 hover:text-rich-black',
                      'hover:bg-light-grey/50',
                      'transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2'
                    )}
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customize Modal */}
      <Modal
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        title="Cookie Preferences"
        description="Choose which cookies you want to allow"
        size="lg"
      >
        <div className="space-y-6">
          {/* Necessary Cookies */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-navy mb-1">Necessary Cookies</h3>
              <p className="text-sm text-rich-black/70">
                Essential for the website to function properly. These cannot be disabled.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div
                className={cn(
                  'w-12 h-7 rounded-full',
                  'bg-teal',
                  'flex items-center px-1',
                  'cursor-not-allowed opacity-75'
                )}
                role="switch"
                aria-checked="true"
                aria-label="Necessary cookies (always enabled)"
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md translate-x-5" />
              </div>
            </div>
          </div>

          {/* Analytics Cookies */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-navy mb-1">Analytics Cookies</h3>
              <p className="text-sm text-rich-black/70">
                Help us understand how you use our platform so we can improve your experience.
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => togglePreference('analytics')}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors duration-200',
                  preferences.analytics ? 'bg-teal' : 'bg-grey/30',
                  'flex items-center px-1',
                  'focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2'
                )}
                role="switch"
                aria-checked={preferences.analytics}
                aria-label="Toggle analytics cookies"
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{ x: preferences.analytics ? 20 : 0 }}
                  transition={prefersReducedMotion ? SPRING.none : SPRING.micro}
                />
              </button>
            </div>
          </div>

          {/* Marketing Cookies */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-navy mb-1">Marketing Cookies</h3>
              <p className="text-sm text-rich-black/70">
                Used to show you relevant content and advertisements based on your interests.
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => togglePreference('marketing')}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors duration-200',
                  preferences.marketing ? 'bg-teal' : 'bg-grey/30',
                  'flex items-center px-1',
                  'focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2'
                )}
                role="switch"
                aria-checked={preferences.marketing}
                aria-label="Toggle marketing cookies"
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{ x: preferences.marketing ? 20 : 0 }}
                  transition={prefersReducedMotion ? SPRING.none : SPRING.micro}
                />
              </button>
            </div>
          </div>

          {/* Preference Cookies */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-navy mb-1">Preference Cookies</h3>
              <p className="text-sm text-rich-black/70">
                Remember your settings and preferences for a personalized experience.
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => togglePreference('preferences')}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors duration-200',
                  preferences.preferences ? 'bg-teal' : 'bg-grey/30',
                  'flex items-center px-1',
                  'focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2'
                )}
                role="switch"
                aria-checked={preferences.preferences}
                aria-label="Toggle preference cookies"
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{ x: preferences.preferences ? 20 : 0 }}
                  transition={prefersReducedMotion ? SPRING.none : SPRING.micro}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-light-grey">
            <Button variant="primary" size="md" onClick={handleCustomizeSave} fullWidth>
              Save Preferences
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowCustomize(false)}
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
