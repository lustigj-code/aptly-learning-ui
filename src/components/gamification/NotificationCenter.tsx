/**
 * Notification Center Component
 * Phase 4.2: Celebration & Feedback Loop
 *
 * Persistent notification history for all achievements
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Award, Zap, Trophy, Flame, X, ChevronRight, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUnifiedStore } from '@/store/unifiedStore';

type Notification = {
  id: string;
  type: 'badge' | 'level_up' | 'streak' | 'xp' | 'achievement' | 'reengagement' | 'streak_risk';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
  data?: Record<string, unknown>;
  ctaUrl?: string;
  priority?: number;
};

type NotificationCenterProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Sample notifications data (defined outside component to avoid recreating)
const createSampleNotifications = (): Notification[] => {
  const now = Date.now();
  return [
    {
      id: '1',
      type: 'badge',
      title: 'New Badge Earned!',
      message: 'You earned the "Week Warrior" badge for a 7-day streak',
      timestamp: new Date(now - 3600000), // 1 hour ago
      read: false,
      icon: 'trophy',
    },
    {
      id: '2',
      type: 'level_up',
      title: 'Level Up!',
      message: "You've reached level 5! Keep up the great work.",
      timestamp: new Date(now - 7200000), // 2 hours ago
      read: false,
      icon: 'trending-up',
    },
    {
      id: '3',
      type: 'streak',
      title: 'Streak Milestone',
      message: 'Amazing! You hit a 14-day learning streak.',
      timestamp: new Date(now - 86400000), // 1 day ago
      read: true,
      icon: 'flame',
    },
  ];
};

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const user = useUnifiedStore((state) => state.user);
  // Initialize notifications lazily - only creates sample data once on first render
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    user ? createSampleNotifications() : []
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'badge':
      case 'achievement':
        return <Trophy className="w-5 h-5 text-navy" />;
      case 'level_up':
        return <Zap className="w-5 h-5 text-teal" />;
      case 'streak':
        return <Flame className="w-5 h-5 text-warning" />;
      case 'xp':
        return <Award className="w-5 h-5 text-teal" />;
      case 'reengagement':
        return <ArrowRight className="w-5 h-5 text-teal" />;
      case 'streak_risk':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Calculate time ago - pure function that requires explicit now parameter
  const getTimeAgo = (date: Date, now: number): string => {
    const seconds = Math.floor((now - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Capture current time once per render cycle using state
  const [currentTime] = useState(() => Date.now());

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          role="dialog"
          aria-labelledby="notification-center-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-navy" />
              <h2 id="notification-center-title" className="text-lg font-semibold text-navy">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-teal text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'primary' : 'ghost'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'primary' : 'ghost'}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="ml-auto text-sm text-teal hover:text-teal-dark"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayedNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications</p>
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    notification.read
                      ? 'bg-white border-gray-200'
                      : 'bg-light-teal/30 border-teal/30 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-navy text-sm">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-teal rounded-full" aria-label="Unread" />
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">{getTimeAgo(notification.timestamp, currentTime)}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button className="w-full text-sm text-teal hover:text-teal-dark font-medium flex items-center justify-center gap-2">
                View All History
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Notification Bell Button
 * Shows unread count badge
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount] = useState(3); // TODO: Get from state

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-6 h-6 text-navy" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
