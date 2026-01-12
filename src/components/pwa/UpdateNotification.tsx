'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function UpdateNotification() {
  const { isUpdateAvailable, updateApp } = usePWA();

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-navy rounded-xl shadow-xl p-4">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="w-10 h-10 bg-teal rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm">
                Update Available
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                A new version of Aptly is ready
              </p>
            </div>

            {/* Update button */}
            <button
              onClick={updateApp}
              className="px-4 py-2 bg-teal text-white text-sm font-semibold rounded-lg hover:bg-teal-dark transition-all"
            >
              Update
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
