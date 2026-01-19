/**
 * Keyboard Shortcuts Component
 * Phase 5.2: Accessibility - Keyboard navigation helpers
 *
 * Displays available keyboard shortcuts and handles global shortcuts
 */

'use client';

import { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

type KeyboardShortcut = {
  keys: string[];
  description: string;
  category: 'navigation' | 'learning' | 'general';
};

const shortcuts: KeyboardShortcut[] = [
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'general' },
  { keys: ['Esc'], description: 'Close modal or cancel action', category: 'general' },
  { keys: ['/', 'Search'], description: 'Focus search', category: 'navigation' },
  { keys: ['g', 'd'], description: 'Go to Dashboard', category: 'navigation' },
  { keys: ['g', 'l'], description: 'Go to Learn page', category: 'navigation' },
  { keys: ['g', 'p'], description: 'Go to Progress', category: 'navigation' },
  { keys: ['n'], description: 'Next atom/question', category: 'learning' },
  { keys: ['p'], description: 'Previous atom/question', category: 'learning' },
  { keys: ['Space'], description: 'Play/Pause video', category: 'learning' },
  { keys: ['Enter'], description: 'Submit answer', category: 'learning' },
  { keys: ['h'], description: 'Show hint', category: 'learning' },
  { keys: ['c'], description: 'Open coach panel', category: 'learning' },
];

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open shortcuts modal with '?' key
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  const groupedShortcuts = {
    navigation: shortcuts.filter((s) => s.category === 'navigation'),
    learning: shortcuts.filter((s) => s.category === 'learning'),
    general: shortcuts.filter((s) => s.category === 'general'),
  };

  return (
    <>
      {/* Floating hint button - Apple-style elegant design */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-teal text-white rounded-full shadow-lg hover:bg-teal-dark hover:scale-105 active:scale-95 transition-all duration-200 z-40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-teal/50 focus-visible:ring-offset-2 group"
        aria-label="Show keyboard shortcuts (Press ? key)"
        title="Press ? for keyboard shortcuts"
      >
        <Keyboard className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
      </button>

      {/* Shortcuts Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Keyboard Shortcuts" size="lg">
        <div className="space-y-6">
          {/* Navigation Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wider">Navigation</h3>
            <div className="space-y-2">
              {groupedShortcuts.navigation.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-light-teal/30 transition-colors duration-150 border-b border-grey/20 last:border-0">
                  <span className="text-sm text-navy font-medium">{shortcut.description}</span>
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-3 py-1.5 text-xs font-mono font-semibold bg-gradient-to-b from-white to-light-grey border border-grey/40 rounded-lg shadow-sm text-navy min-w-[32px] text-center"
                        aria-label={`Key: ${key}`}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wider">Learning</h3>
            <div className="space-y-2">
              {groupedShortcuts.learning.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-light-teal/30 transition-colors duration-150 border-b border-grey/20 last:border-0">
                  <span className="text-sm text-navy font-medium">{shortcut.description}</span>
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-3 py-1.5 text-xs font-mono font-semibold bg-gradient-to-b from-white to-light-grey border border-grey/40 rounded-lg shadow-sm text-navy min-w-[32px] text-center"
                        aria-label={`Key: ${key}`}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wider">General</h3>
            <div className="space-y-2">
              {groupedShortcuts.general.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-light-teal/30 transition-colors duration-150 border-b border-grey/20 last:border-0">
                  <span className="text-sm text-navy font-medium">{shortcut.description}</span>
                  <div className="flex items-center gap-1.5">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-3 py-1.5 text-xs font-mono font-semibold bg-gradient-to-b from-white to-light-grey border border-grey/40 rounded-lg shadow-sm text-navy min-w-[32px] text-center"
                        aria-label={`Key: ${key}`}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-light-teal/20 rounded-xl border border-teal/20">
          <p className="text-sm text-navy font-medium flex items-center gap-2">
            <span className="text-teal">💡</span>
            <span><strong>Tip:</strong> Press <kbd className="px-3 py-1 bg-gradient-to-b from-white to-light-grey border border-grey/40 rounded-lg shadow-sm text-xs font-mono font-semibold text-navy mx-1">?</kbd> anytime to see this list.</span>
          </p>
        </div>
      </Modal>
    </>
  );
}

/**
 * Global Keyboard Shortcuts Handler
 * Implements keyboard navigation throughout the app
 */
export function useGlobalKeyboardShortcuts() {
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Navigation shortcuts (g + key)
      if (e.key === 'g') {
        // Wait for next key
        const handleSecondKey = (e2: KeyboardEvent) => {
          if (e2.key === 'd') window.location.href = '/dashboard';
          if (e2.key === 'l') window.location.href = '/learn';
          if (e2.key === 'p') window.location.href = '/progress';

          document.removeEventListener('keydown', handleSecondKey);
        };

        document.addEventListener('keydown', handleSecondKey);
        setTimeout(() => document.removeEventListener('keydown', handleSecondKey), 2000);
      }
    };

    document.addEventListener('keydown', handleGlobalShortcut);
    return () => document.removeEventListener('keydown', handleGlobalShortcut);
  }, []);
}
