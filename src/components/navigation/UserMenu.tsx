'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronDown, Settings, Trophy, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Close on Escape key
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      // Clear Aptly-specific localStorage data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('aptly-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Sign out from Firebase
      if (auth) {
        await signOut(auth);
      }

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-light-grey/80 active:bg-light-grey transition-all duration-200"
        whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
        whileTap={!prefersReducedMotion ? { scale: 0.96 } : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        <motion.div
          className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-muted-teal flex items-center justify-center shadow-md"
          whileHover={!prefersReducedMotion ? { rotate: 5 } : undefined}
          transition={{ duration: 0.2 }}
        >
          {user?.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element -- dynamic avatar URL */
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-xs font-semibold">
              {getInitials(user.name)}
            </span>
          )}
        </motion.div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} className="text-navy hidden sm:block" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-light-grey/50 overflow-hidden z-50"
          >
            {/* User Info Section */}
            <motion.div
              className="px-4 py-3 border-b border-light-grey/50 bg-gradient-to-br from-teal/5 to-transparent"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <p className="text-sm font-semibold text-navy truncate">
                {user.name}
              </p>
              <p className="text-xs text-rich-black/60 truncate mt-0.5">
                {user.email}
              </p>
            </motion.div>

            {/* Menu Items */}
            <motion.div
              className="py-2"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              <MenuItem
                icon={<User size={18} />}
                label="Profile Settings"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/settings');
                }}
              />
              <MenuItem
                icon={<Settings size={18} />}
                label="Learning Preferences"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/settings?tab=preferences');
                }}
              />
              <MenuItem
                icon={<Trophy size={18} />}
                label="Achievements"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/achievements');
                }}
              />
            </motion.div>

            {/* Sign Out Section */}
            <motion.div
              className="border-t border-light-grey/50 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <MenuItem
                icon={<LogOut size={18} />}
                label="Sign Out"
                onClick={handleSignOut}
                variant="danger"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// MenuItem Component
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function MenuItem({ icon, label, onClick, variant = 'default' }: MenuItemProps) {
  const isDanger = variant === 'danger';
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 text-left rounded-lg mx-1',
        'min-h-[44px]', // Minimum touch target size
        isDanger
          ? 'text-error hover:bg-error/10 active:bg-error/5'
          : 'text-navy hover:bg-light-grey/80 active:bg-light-grey'
      )}
      variants={{
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 },
      }}
      whileHover={!prefersReducedMotion ? { x: 4, scale: 1.01 } : undefined}
      whileTap={!prefersReducedMotion ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.15 }}
    >
      <motion.span
        className={isDanger ? 'text-error' : 'text-navy/70'}
        whileHover={!prefersReducedMotion ? { scale: 1.1, rotate: 5 } : undefined}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.span>
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}
