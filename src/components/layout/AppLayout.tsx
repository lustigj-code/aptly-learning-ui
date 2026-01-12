'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUnifiedStore, useUser } from '@/store/unifiedStore';
import { cn } from '@/lib/utils';
import { useHydration } from '@/hooks/useHydration';

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const hydrated = useHydration();
  const { user, isLoading } = useUser();
  const isAuthenticated = useUnifiedStore((state) => state.isAuthenticated);
  const sidebarCollapsed = useUnifiedStore((state) => state.sidebarCollapsed);

  // Skip layout for onboarding, root, and learn (learning has its own full-screen layout)
  const skipLayout = pathname === '/onboarding' || pathname === '/' || pathname === '/learn';

  if (skipLayout) {
    return <>{children}</>;
  }

  // Show loading state while hydrating or loading user data
  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-teal rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <p className="text-navy font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on auth pages, the middleware will handle redirect
  // But we still show a brief loading state if user data hasn't loaded yet
  if (!user && isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-teal rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <p className="text-navy font-medium">Setting up...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-teal/30 flex">
      <Sidebar />

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-[margin] duration-300 ease-out outline-none",
          // No margin on mobile (sidebar is overlay), margin on lg+ based on collapse state
          "ml-0 lg:ml-[280px]",
          sidebarCollapsed && "lg:ml-[72px]"
        )}
      >
        <Header />

        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// Content container with consistent max-width
type ContentContainerProps = {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
};

export function ContentContainer({
  children,
  className,
  narrow = false,
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        narrow ? 'max-w-2xl' : 'max-w-4xl',
        className
      )}
    >
      {children}
    </div>
  );
}

// Section wrapper with animation
type SectionProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Section({ children, className, delay = 0 }: SectionProps) {
  return (
    <motion.section
      className={cn('mb-8', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {children}
    </motion.section>
  );
}
