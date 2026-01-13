'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUser, useAuth } from '@/store/unifiedStore';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (isAuthLoading || isLoading) return;

    // If user exists and authenticated, go to dashboard (dashboard-first architecture)
    // If not, go to onboarding/login
    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        router.push('/dashboard');
      } else if (isAuthenticated && !user) {
        router.push('/onboarding');
      } else {
        router.push('/login');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, isAuthenticated, isAuthLoading, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-purple to-teal flex items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Logo */}
        <motion.div
          className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl"
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <span className="text-5xl font-bold bg-gradient-to-br from-teal to-navy bg-clip-text text-transparent">
            A
          </span>
        </motion.div>

        {/* Loading text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Aptly</h1>
          <p className="text-white/70">Preparing your learning experience...</p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-white/50 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
