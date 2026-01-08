'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
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
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// TOAST ITEM
// ============================================

const toastStyles: Record<ToastType, { bg: string; border: string; icon: ReactNode; iconBg: string }> = {
  success: {
    bg: 'bg-white',
    border: 'border-success/30',
    icon: <CheckCircle className="w-5 h-5 text-success" />,
    iconBg: 'bg-success/10',
  },
  error: {
    bg: 'bg-white',
    border: 'border-error/30',
    icon: <XCircle className="w-5 h-5 text-error" />,
    iconBg: 'bg-error/10',
  },
  warning: {
    bg: 'bg-white',
    border: 'border-warning/30',
    icon: <AlertCircle className="w-5 h-5 text-warning" />,
    iconBg: 'bg-warning/10',
  },
  info: {
    bg: 'bg-white',
    border: 'border-teal/30',
    icon: <Info className="w-5 h-5 text-teal" />,
    iconBg: 'bg-teal/10',
  },
  badge: {
    bg: 'bg-gradient-to-r from-purple/5 to-yellow/5',
    border: 'border-purple/30',
    icon: <Trophy className="w-5 h-5 text-yellow-dark" />,
    iconBg: 'bg-yellow/20',
  },
  streak: {
    bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
    border: 'border-orange-300/30',
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    iconBg: 'bg-orange-100',
  },
  xp: {
    bg: 'bg-gradient-to-r from-teal/5 to-purple/5',
    border: 'border-teal/30',
    icon: <Zap className="w-5 h-5 text-teal" />,
    iconBg: 'bg-teal/10',
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const styles = toastStyles[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
        mass: 0.8,
      }}
      className={cn(
        'relative rounded-xl border shadow-lg p-4 pointer-events-auto',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', styles.iconBg)}>
          {toast.icon || styles.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy text-sm">{toast.title}</p>
          {toast.description && (
            <p className="text-rich-black/60 text-sm mt-0.5 line-clamp-2">{toast.description}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onRemove}
          className="text-rich-black/40 hover:text-rich-black transition-colors p-1 -mr-1 -mt-1"
        >
          <X size={16} />
        </button>
      </div>

      {/* Special decorations for badge/streak */}
      {toast.type === 'badge' && (
        <motion.div
          className="absolute -top-1 -right-1"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <Star className="w-6 h-6 text-yellow fill-yellow" />
        </motion.div>
      )}

      {toast.type === 'streak' && (
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-200/20 to-transparent animate-shimmer" />
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
