'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * OverlayManager
 *
 * Coordinates z-index conflicts between modals, dialogs, and overlays.
 * Ensures only ONE backdrop is active at a time, preventing visual stacking issues.
 *
 * Usage:
 * 1. Wrap your app with <OverlayProvider>
 * 2. Call openOverlay(id, priority) before showing an overlay
 * 3. Call closeOverlay(id) when hiding it
 *
 * Priority levels:
 * - 10: System toast/notification
 * - 20: Info modal (can be dismissed by higher priority)
 * - 30: Important modal (user action)
 * - 40: Critical modal (must complete action)
 *
 * Part of Task 1.3: Z-Index System Establishment
 */

interface OverlayState {
  activeOverlay: string | null;
  priority: number;
}

interface OverlayContextType {
  activeOverlay: string | null;
  openOverlay: (id: string, priority: number) => boolean;
  closeOverlay: (id: string) => void;
  isOverlayActive: (id: string) => boolean;
}

const OverlayContext = createContext<OverlayContextType | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OverlayState>({ activeOverlay: null, priority: 0 });

  const openOverlay = useCallback(
    (id: string, priority: number) => {
      // Only open if no overlay exists or this has higher priority
      if (!state.activeOverlay || priority > state.priority) {
        setState({ activeOverlay: id, priority });
        return true;
      }
      return false;
    },
    [state]
  );

  const closeOverlay = useCallback(
    (id: string) => {
      if (state.activeOverlay === id) {
        setState({ activeOverlay: null, priority: 0 });
      }
    },
    [state.activeOverlay]
  );

  const isOverlayActive = useCallback(
    (id: string) => {
      return state.activeOverlay === id;
    },
    [state.activeOverlay]
  );

  return (
    <OverlayContext.Provider value={{ activeOverlay: state.activeOverlay, openOverlay, closeOverlay, isOverlayActive }}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within OverlayProvider');
  }
  return context;
}
