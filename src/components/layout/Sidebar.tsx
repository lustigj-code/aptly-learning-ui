'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  BarChart3,
  Settings,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineStreak } from '@/components/progress/StreakCounter';
import { useUser } from '@/store/userProfileStore';
import { useUIStore } from '@/store/uiStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Learning', href: '/learn', icon: BookOpen },
  { label: 'Progress', href: '/progress', icon: BarChart3 },
  { label: 'Achievements', href: '/achievements', icon: Trophy },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [showCoach, setShowCoach] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const isCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);
  const prefersReducedMotion = useReducedMotion();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-[280px]';

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <motion.aside
        className={cn(
          'hidden lg:flex fixed left-0 top-0 h-screen bg-navy text-white flex-col z-40',
          'transition-all duration-300 ease-out',
          sidebarWidth
        )}
        initial={false}
        animate={{ width: isCollapsed ? 72 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center font-bold text-white text-xl">
              A
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  className="text-xl font-bold"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Aptly
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* User XP & Streak (when not collapsed) */}
        <AnimatePresence>
          {!isCollapsed && user && (
            <motion.div
              className="px-4 py-4 border-b border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-yellow" />
                  <span className="font-semibold">{Number(user?.progress?.xp ?? 0).toLocaleString()} XP</span>
                </div>
                <InlineStreak count={user?.streak?.currentStreak ?? 0} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                    'hover:bg-white/10',
                    isActive && 'bg-teal text-white shadow-lg shadow-teal/20'
                  )}
                  whileHover={!prefersReducedMotion ? { x: isCollapsed ? 0 : 4 } : undefined}
                  whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
                  initial={false}
                  animate={{
                    backgroundColor: isActive ? 'rgb(32 201 151)' : 'transparent',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                      layoutId="activeIndicator"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={22}
                    className={cn(
                      'transition-all duration-200',
                      isActive ? 'text-white scale-110' : 'text-white/70'
                    )}
                  />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        className={cn(
                          'font-medium transition-colors',
                          isActive ? 'text-white' : 'text-white/70'
                        )}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Coach Button */}
        <div className="px-2 py-3 border-t border-white/10">
          <motion.button
            onClick={() => setShowCoach(!showCoach)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
              'bg-light-teal/20 hover:bg-light-teal/30 active:bg-light-teal/25 text-teal shadow-lg shadow-teal/10'
            )}
            whileHover={!prefersReducedMotion ? { scale: 1.02, y: -1 } : undefined}
            whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
          >
            <div className="relative">
              <MessageCircle size={22} />
              <motion.span
                className="absolute -top-1 -right-1 w-3 h-3 bg-yellow rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  className="flex-1 text-left"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <span className="font-medium block">Chat with Coach</span>
                  <span className="text-xs text-teal/70">Ask anything!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Bottom Navigation */}
        <div className="px-2 py-3 border-t border-white/10">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                    'hover:bg-white/10',
                    isActive && 'bg-white/10'
                  )}
                  whileHover={!prefersReducedMotion ? { x: 4 } : undefined}
                  whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
                >
                  <Icon size={22} className="text-white/70" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        className="font-medium text-white/70"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'absolute top-20 -right-3 w-6 h-6 bg-navy rounded-full',
            'flex items-center justify-center border-2 border-white/20',
            'hover:bg-teal hover:border-teal transition-colors',
            'shadow-md'
          )}
        >
          {isCollapsed ? (
            <ChevronRight size={14} className="text-white" />
          ) : (
            <ChevronLeft size={14} className="text-white" />
          )}
        </button>
      </motion.aside>

      {/* Mobile Sidebar - slide-out drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              className="fixed left-0 top-0 h-screen w-[280px] bg-navy text-white flex flex-col z-50 lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Logo with close button */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                <Link href="/dashboard" className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center font-bold text-white text-xl">
                    A
                  </div>
                  <span className="text-xl font-bold">Aptly</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* User XP & Streak */}
              {user && (
                <div className="px-4 py-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-yellow" />
                      <span className="font-semibold">{Number(user?.progress?.xp ?? 0).toLocaleString()} XP</span>
                    </div>
                    <InlineStreak count={user?.streak?.currentStreak ?? 0} />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        className={cn(
                          'relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                          'hover:bg-white/10 active:bg-white/5',
                          isActive && 'bg-teal text-white shadow-lg shadow-teal/20'
                        )}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                            layoutId="mobileActiveIndicator"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <Icon
                          size={22}
                          className={cn(
                            'transition-all duration-200',
                            isActive ? 'text-white scale-110' : 'text-white/70'
                          )}
                        />
                        <span
                          className={cn(
                            'font-medium transition-colors',
                            isActive ? 'text-white' : 'text-white/70'
                          )}
                        >
                          {item.label}
                        </span>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* Coach Button */}
              <div className="px-2 py-3 border-t border-white/10">
                <motion.button
                  onClick={() => setShowCoach(!showCoach)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                    'bg-light-teal/20 hover:bg-light-teal/30 active:bg-light-teal/25 text-teal shadow-lg shadow-teal/10'
                  )}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="relative">
                    <MessageCircle size={22} />
                    <motion.span
                      className="absolute -top-1 -right-1 w-3 h-3 bg-yellow rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium block">Chat with Coach</span>
                    <span className="text-xs text-teal/70">Ask anything!</span>
                  </div>
                </motion.button>
              </div>

              {/* Bottom Navigation */}
              <div className="px-2 py-3 border-t border-white/10">
                {bottomNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                          'hover:bg-white/10',
                          isActive && 'bg-white/10'
                        )}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={22} className="text-white/70" />
                        <span className="font-medium text-white/70">{item.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
