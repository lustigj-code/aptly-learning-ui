'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Trophy,
  Flame,
  Zap,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING, getMotionSafeTransition } from '@/lib/motion/springs';

// ============================================
// TYPES
// ============================================

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'badge' | 'streak' | 'xp';

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  icon?: ReactNode;
  showProgress?: boolean;
};

type ToastContextType = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  // Convenience methods
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  badge: (badgeTitle: string, description?: string) => void;
  streak: (count: number) => void;
  xp: (amount: number) => void;
};

// ============================================
// CONTEXT
// ============================================

const ToastContext = createContext<ToastContextType | null>(null);

// ============================================
// HOOK
// ============================================

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  // Convenience methods
  const success = useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description, duration: 6000 });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    addToast({ type: 'warning', title, description });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description });
  }, [addToast]);

  const badge = useCallback((badgeTitle: string, description?: string) => {
    addToast({
      type: 'badge',
      title: `Badge Earned!`,
      description: description || badgeTitle,
      duration: 5000,
    });
  }, [addToast]);

  const streak = useCallback((count: number) => {
    addToast({
      type: 'streak',
      title: `${count} Day Streak!`,
      description: count >= 7 ? "You're on fire! Keep it going!" : 'Great consistency!',
      duration: 4000,
    });
  }, [addToast]);

  const xp = useCallback((amount: number) => {
    addToast({
      type: 'xp',
      title: `+${amount} XP`,
      description: 'Keep learning to earn more!',
      duration: 3000,
    });
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
        badge,
        streak,
        xp,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================
// TOAST CONTAINER
// ============================================

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0 safe-area-bottom"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => onRemove(toast.id)}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// TOAST ITEM
// ============================================

const toastStyles: Record<
  ToastType,
  {
    bg: string;
    border: string;
    icon: ReactNode;
    iconBg: string;
    progressBg: string;
  }
> = {
  success: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-success/20',
    icon: <CheckCircle className="w-5 h-5 text-success" />,
    iconBg: 'bg-success/10',
    progressBg: 'bg-success',
  },
  error: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-error/20',
    icon: <XCircle className="w-5 h-5 text-error" />,
    iconBg: 'bg-error/10',
    progressBg: 'bg-error',
  },
  warning: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-warning/20',
    icon: <AlertCircle className="w-5 h-5 text-warning" />,
    iconBg: 'bg-warning/10',
    progressBg: 'bg-warning',
  },
  info: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-teal/20',
    icon: <Info className="w-5 h-5 text-teal" />,
    iconBg: 'bg-teal/10',
    progressBg: 'bg-teal',
  },
  badge: {
    bg: 'bg-gradient-to-br from-purple/5 via-white to-yellow/5 dark:from-purple/10 dark:via-gray-800 dark:to-yellow/10',
    border: 'border-purple/20',
    icon: <Trophy className="w-5 h-5 text-yellow-dark" />,
    iconBg: 'bg-gradient-to-br from-yellow/20 to-purple/10',
    progressBg: 'bg-gradient-to-r from-purple to-yellow',
  },
  streak: {
    bg: 'bg-gradient-to-br from-orange-50 via-white to-yellow-50 dark:from-orange-900/20 dark:via-gray-800 dark:to-yellow-900/20',
    border: 'border-orange-300/20',
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    iconBg: 'bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30',
    progressBg: 'bg-gradient-to-r from-orange-500 to-yellow-500',
  },
  xp: {
    bg: 'bg-gradient-to-br from-teal/5 via-white to-purple/5 dark:from-teal/10 dark:via-gray-800 dark:to-purple/10',
    border: 'border-teal/20',
    icon: <Zap className="w-5 h-5 text-teal" />,
    iconBg: 'bg-gradient-to-br from-teal/10 to-purple/10',
    progressBg: 'bg-gradient-to-r from-teal to-purple',
  },
};

function ToastItem({
  toast,
  onRemove,
  index,
}: {
  toast: Toast;
  onRemove: () => void;
  index: number;
}) {
  const styles = toastStyles[toast.type];
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();

  // Calculate if we should show progress bar
  const showProgress = toast.showProgress !== false && (toast.duration ?? 0) > 0;

  // Progress bar animation
  useEffect(() => {
    if (!showProgress) return;

    const duration = toast.duration ?? 4000;
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [toast.duration, showProgress]);

  // Stagger delay for multiple toasts appearing together (100ms per toast)
  const staggerDelay = index * 0.1;

  return (
    <motion.div
      layout
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.95, x: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        x: 0,
      }}
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              x: 100,
              scale: 0.95,
            }
      }
      transition={{
        ...getMotionSafeTransition(SPRING.toast, prefersReducedMotion),
        delay: staggerDelay,
      }}
      whileHover={
        !prefersReducedMotion
          ? {
              scale: 1.02,
              transition: { duration: 0.15 },
            }
          : undefined
      }
      className={cn(
        'relative overflow-hidden rounded-2xl border shadow-lg backdrop-blur-sm pointer-events-auto',
        'transition-shadow duration-200 hover:shadow-xl',
        styles.bg,
        styles.border
      )}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        // Subtle stacking effect for multiple toasts
        transform: `translateY(${index * -2}px)`,
      }}
    >
      {/* Main content */}
      <div className="relative z-10 p-4">
        <div className="flex items-start gap-3">
          {/* Icon with subtle animation */}
          <motion.div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
              styles.iconBg
            )}
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 25,
              delay: 0.05,
            }}
          >
            {toast.icon || styles.icon}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <motion.p
              className="font-semibold text-navy dark:text-white text-sm leading-snug"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {toast.title}
            </motion.p>
            {toast.description && (
              <motion.p
                className="text-rich-black/60 dark:text-gray-300 text-sm mt-1 line-clamp-2 leading-relaxed"
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {toast.description}
              </motion.p>
            )}
          </div>

          {/* Close button */}
          <motion.button
            onClick={onRemove}
            className={cn(
              'text-rich-black/40 hover:text-rich-black dark:text-gray-400 dark:hover:text-white',
              'transition-colors duration-150 p-1.5 -mr-1 -mt-1 rounded-lg',
              'hover:bg-black/5 dark:hover:bg-white/10 active:scale-95'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={!prefersReducedMotion ? { scale: 1.1 } : undefined}
            whileTap={!prefersReducedMotion ? { scale: 0.9 } : undefined}
            aria-label="Dismiss notification"
          >
            <X size={16} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 overflow-hidden">
          <motion.div
            className={cn('h-full', styles.progressBg)}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.016, ease: 'linear' }}
          />
        </div>
      )}

      {/* Special decorations for badge/streak */}
      {toast.type === 'badge' && (
        <motion.div
          className="absolute -top-1 -right-1 z-20 drop-shadow-lg"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.3,
            type: 'spring',
            stiffness: 300,
            damping: 15,
          }}
        >
          <Star className="w-7 h-7 text-yellow fill-yellow animate-pulse" />
        </motion.div>
      )}

      {toast.type === 'streak' && (
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-200/30 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// EXPORTS
// ============================================

export { ToastContext };
export type { Toast, ToastType };
