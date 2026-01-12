'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Share, Plus } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function InstallPrompt() {
  const {
    showInstallPrompt,
    isInstallable,
    isInstalled,
    isIOSSafari,
    iosInstructions,
    promptInstall,
    dismissInstall,
  } = usePWA();

  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Don't show if already installed or not installable
  if (isInstalled || (!showInstallPrompt && !isIOSSafari)) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOSSafari) {
      setShowIOSInstructions(true);
    } else {
      await promptInstall();
    }
  };

  return (
    <>
      {/* Main install banner */}
      <AnimatePresence>
        {(showInstallPrompt || (isIOSSafari && isInstallable)) && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
          >
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-light-grey">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-12 h-12 bg-gradient-dark rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-navy text-sm">
                    Install Aptly Learning
                  </h3>
                  <p className="text-xs text-rich-black/60 mt-0.5">
                    Add to your home screen for the best experience. Learn offline, get notifications.
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={dismissInstall}
                  className="p-1 text-rich-black/40 hover:text-rich-black transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={dismissInstall}
                  className="flex-1 py-2 px-4 text-sm font-medium text-rich-black/60 hover:text-navy hover:bg-light-grey rounded-xl transition-all"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2 px-4 bg-teal text-white text-sm font-semibold rounded-xl hover:bg-teal-dark transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
              onClick={() => setShowIOSInstructions(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 m-0 sm:m-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-navy">
                  Install Aptly Learning
                </h2>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="p-1 text-rich-black/40 hover:text-rich-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                {iosInstructions.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-teal text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-navy">{instruction}</p>
                      {index === 0 && (
                        <div className="mt-2 p-2 bg-light-teal rounded-lg inline-flex items-center gap-2">
                          <Share className="w-5 h-5 text-teal" />
                          <span className="text-xs text-navy/80">
                            Share icon
                          </span>
                        </div>
                      )}
                      {index === 1 && (
                        <div className="mt-2 p-2 bg-light-teal rounded-lg inline-flex items-center gap-2">
                          <Plus className="w-5 h-5 text-teal" />
                          <span className="text-xs text-navy/80">
                            Add to Home Screen
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Done button */}
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full mt-6 py-3 px-6 bg-teal text-white font-semibold rounded-xl hover:bg-teal-dark transition-all"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
