'use client';

import { motion } from 'framer-motion';
import { Bell, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGreeting } from '@/lib/utils';
import { InlineStreak } from '@/components/progress/StreakCounter';
import { useUser } from '@/store/unifiedStore';

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

  return (
    <motion.header
      className={cn(
        'h-16 bg-white border-b border-light-grey flex items-center justify-between px-6',
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left side - Greeting or Title */}
      <div>
        {showGreeting && user ? (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-xl font-semibold text-navy">
              {greeting}, {user.name}!
            </h1>
            {subtitle && (
              <p className="text-sm text-rich-black/60">{subtitle}</p>
            )}
          </motion.div>
        ) : title ? (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-xl font-semibold text-navy">{title}</h1>
            {subtitle && (
              <p className="text-sm text-rich-black/60">{subtitle}</p>
            )}
          </motion.div>
        ) : null}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-4">
        {/* Streak (mobile-visible) */}
        {user && (
          <motion.div
            className="hidden sm:block"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <InlineStreak count={user?.streak?.currentStreak ?? 0} />
          </motion.div>
        )}

        {/* Notifications */}
        <motion.button
          className="relative p-2 rounded-full hover:bg-light-grey transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell size={20} className="text-navy" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
        </motion.button>

        {/* User Menu */}
        <motion.button
          className="flex items-center gap-2 p-2 rounded-full hover:bg-light-grey transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-muted-teal flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User size={16} className="text-white" />
            )}
          </div>
          <ChevronDown size={16} className="text-navy hidden sm:block" />
        </motion.button>
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
  return (
    <nav className={cn('flex items-center gap-2 text-sm', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-grey">/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="text-teal hover:text-teal-dark transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-rich-black/60">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
