'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Character } from '@/components/characters/Character';
import { InlineStreak } from '@/components/progress/StreakCounter';
import { useUser } from '@/store/unifiedStore';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-[280px]';

  return (
    <>
      <motion.aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-navy text-white flex flex-col z-40',
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
                    'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                    'hover:bg-white/10',
                    isActive && 'bg-teal text-white'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={22} className={isActive ? 'text-white' : 'text-white/70'} />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        className={cn(
                          'font-medium',
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
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
              'bg-light-teal/20 hover:bg-light-teal/30 text-teal'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative">
              <MessageCircle size={22} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow rounded-full" />
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
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
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

        {/* Coach Character (when not collapsed) */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="px-4 py-4 border-t border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-3">
                <Character character="owl" mood="idle" size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Coach Owl</p>
                  <p className="text-xs text-white/60">Ready to help!</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
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

    </>
  );
}
