'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuthStore } from '@/store/authStore';
import { useUser } from '@/store/userProfileStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { useHydration } from '@/hooks/useHydration';

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const hydrated = useHydration();
  const { user, isLoading } = useUser();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

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
    <div className="h-screen bg-light-teal/30 flex overflow-hidden">
      <Sidebar />

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "flex-1 flex flex-col h-screen transition-[margin] duration-300 ease-out outline-none overflow-hidden",
          // No margin on mobile (sidebar is overlay), margin on lg+ based on collapse state
          "ml-0 lg:ml-[280px]",
          sidebarCollapsed && "lg:ml-[72px]"
        )}
      >
        <Header />

        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-12 lg:py-12">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
}

// Content container with consistent max-width and spacing
type ContentContainerProps = {
  children: React.ReactNode;
  className?: string;
  size?: 'narrow' | 'medium' | 'wide' | 'full';
};

export function ContentContainer({
  children,
  className,
  size = 'medium',
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        size === 'narrow' && 'max-w-2xl',
        size === 'medium' && 'max-w-4xl',
        size === 'wide' && 'max-w-6xl',
        size === 'full' && 'max-w-7xl',
        className
      )}
    >
      {children}
    </div>
  );
}

// Section wrapper with animation and consistent spacing
type SectionProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  spacing?: 'tight' | 'normal' | 'loose';
};

export function Section({
  children,
  className,
  delay = 0,
  spacing = 'normal'
}: SectionProps) {
  return (
    <motion.section
      className={cn(
        spacing === 'tight' && 'mb-4',
        spacing === 'normal' && 'mb-6 md:mb-8',
        spacing === 'loose' && 'mb-8 md:mb-12',
        className
      )}
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

// Page Header component for consistent page titles
type PageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, className, action }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 md:mb-8', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="h2 text-navy mb-1">{title}</h1>
          {description && (
            <p className="text-rich-black/60 text-base md:text-lg">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// Grid container for cards with consistent spacing
type GridContainerProps = {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
};

export function GridContainer({ children, columns = 2, className }: GridContainerProps) {
  return (
    <div
      className={cn(
        'grid gap-4 md:gap-6 lg:gap-8',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// Stack container for vertical layouts with consistent spacing
type StackProps = {
  children: React.ReactNode;
  spacing?: 'tight' | 'normal' | 'loose';
  className?: string;
};

export function Stack({ children, spacing = 'normal', className }: StackProps) {
  return (
    <div
      className={cn(
        spacing === 'tight' && 'space-y-3 md:space-y-4',
        spacing === 'normal' && 'space-y-4 md:space-y-6',
        spacing === 'loose' && 'space-y-6 md:space-y-8',
        className
      )}
    >
      {children}
    </div>
  );
}
