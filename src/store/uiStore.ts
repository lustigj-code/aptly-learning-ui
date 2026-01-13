/**
 * UI state management
 * Handles layout preferences, sidebar, mobile menu, and theme
 *
 * This is a focused store - split from the monolithic unifiedStore
 * for better separation of concerns and maintainability.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type Theme = 'light' | 'dark' | 'system';

export interface UIState {
  // State
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  theme: Theme;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
}

// ============================================
// STORE
// ============================================

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      theme: 'system',

      // Actions
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleMobileMenu: () =>
        set((state) => ({
          mobileMenuOpen: !state.mobileMenuOpen,
        })),

      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'aptly-ui-storage',
    }
  )
);
