'use client';

import { motion } from 'framer-motion';
import { Bell, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGreeting } from '@/lib/utils';
import { InlineStreak } from '@/components/progress/StreakCounter';
import { ConnectivityStatus } from '@/components/pwa/ConnectivityStatus';
import { UserMenu } from '@/components/navigation/UserMenu';
import { useUser } from '@/store/unifiedStore';
import { useUIStore } from '@/store/uiStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING, getMotionSafeTransition, getMotionSafeInitial } from '@/lib/motion/springs';

type HeaderProps = {
  showGreeting?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function Header({
  showGreeting = true,
  title,
  subtitle,
  className,
}: HeaderProps) {
  const { user } = useUser();
  const greeting = getGreeting();
  const toggleMobileMenu = useUIStore((state) => state.toggleMobileMenu);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.header
      className={cn(
        'h-16 bg-white/80 backdrop-blur-xl border-b border-light-grey/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30',
        className
      )}
      initial={getMotionSafeInitial({ opacity: 0, y: -10 }, prefersReducedMotion)}
      animate={{ opacity: 1, y: 0 }}
      transition={getMotionSafeTransition(SPRING.page, prefersReducedMotion)}
    >
      {/* Left side - Hamburger + Greeting or Title */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger menu */}
        <motion.button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-light-grey/80 active:bg-light-grey transition-all duration-200"
          whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
          whileTap={!prefersReducedMotion ? { scale: 0.96 } : undefined}
          aria-label="Toggle navigation menu"
        >
          <Menu size={24} className="text-navy" />
        </motion.button>
        {showGreeting && user ? (
          <motion.div
            initial={getMotionSafeInitial({ opacity: 0, x: -10 }, prefersReducedMotion)}
            animate={{ opacity: 1, x: 0 }}
            transition={getMotionSafeTransition(SPRING.gentle, prefersReducedMotion)}
          >
            <h1 className="text-xl font-semibold text-navy tracking-tight">
              {greeting}, {user.name}!
            </h1>
            {subtitle && (
              <p className="text-sm text-rich-black/60 mt-0.5">{subtitle}</p>
            )}
          </motion.div>
        ) : title ? (
          <motion.div
            initial={getMotionSafeInitial({ opacity: 0, x: -10 }, prefersReducedMotion)}
            animate={{ opacity: 1, x: 0 }}
            transition={getMotionSafeTransition(SPRING.gentle, prefersReducedMotion)}
          >
            <h1 className="text-xl font-semibold text-navy tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-rich-black/60 mt-0.5">{subtitle}</p>
            )}
          </motion.div>
        ) : null}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connectivity Status */}
        <ConnectivityStatus />

        {/* Streak (mobile-visible) */}
        {user && (
          <motion.div
            className="hidden sm:block"
            initial={getMotionSafeInitial({ opacity: 0, scale: 0.8 }, prefersReducedMotion)}
            animate={{ opacity: 1, scale: 1 }}
            transition={getMotionSafeTransition(SPRING.gentle, prefersReducedMotion)}
          >
            <InlineStreak count={user?.streak?.currentStreak ?? 0} />
          </motion.div>
        )}

        {/* Notifications */}
        <motion.button
          className="relative p-2.5 rounded-xl hover:bg-light-grey/80 active:bg-light-grey transition-all duration-200 group"
          whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
          whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
          aria-label="Notifications"
        >
          <Bell size={20} className="text-navy transition-transform group-hover:rotate-12" />
          <motion.span
            className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 500, damping: 15 }}
          />
        </motion.button>

        {/* User Menu */}
        {user && (
          <UserMenu
            user={{
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            }}
          />
        )}
      </div>
    </motion.header>
  );
}

// Breadcrumb component for learning pages
type BreadcrumbProps = {
  items: Array<{ label: string; href?: string }>;
  className?: string;
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <nav
      className={cn('flex items-center gap-2 text-sm', className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <motion.div
          key={index}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
        >
          {index > 0 && (
            <span className="text-grey/50" aria-hidden="true">/</span>
          )}
          {item.href ? (
            <motion.a
              href={item.href}
              className="text-teal hover:text-teal-dark transition-colors font-medium"
              whileHover={!prefersReducedMotion ? { x: 2 } : undefined}
              transition={{ duration: 0.15 }}
            >
              {item.label}
            </motion.a>
          ) : (
            <span className="text-rich-black/60 font-medium">{item.label}</span>
          )}
        </motion.div>
      ))}
    </nav>
  );
}
