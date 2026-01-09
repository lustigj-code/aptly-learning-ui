'use client';

import { useState } from 'react';
import { useUser } from '@/store/unifiedStore';
import { MainCoachChat } from '@/components/coach/MainCoachChat';
import { EasyStartSection } from '@/components/coach/EasyStartSection';

export default function CoachPage() {
  const { user, isLoading } = useUser();
  const [easyStartDismissed, setEasyStartDismissed] = useState(false);
  const [hasStartedChatting, setHasStartedChatting] = useState(false);

  // Show loading skeleton while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header skeleton */}
        <header className="flex-shrink-0 p-4 border-b border-grey/20">
          <div className="h-10 w-48 bg-grey/20 rounded-lg animate-pulse" />
        </header>

        {/* Chat skeleton */}
        <main className="flex-1 p-4">
          <div className="space-y-4">
            <div className="h-16 w-3/4 bg-grey/10 rounded-2xl animate-pulse" />
            <div className="h-16 w-1/2 bg-grey/10 rounded-2xl animate-pulse ml-auto" />
            <div className="h-16 w-2/3 bg-grey/10 rounded-2xl animate-pulse" />
          </div>
        </main>

        {/* Input skeleton */}
        <footer className="flex-shrink-0 p-4 border-t border-grey/20">
          <div className="h-14 bg-grey/10 rounded-xl animate-pulse" />
        </footer>
      </div>
    );
  }

  // Check if user has progress to show "pick up where you left off"
  const hasProgress = user?.progress?.lessonsCompleted &&
    user.progress.lessonsCompleted.length > 0;
  const showEasyStart = hasProgress && !easyStartDismissed && !hasStartedChatting;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main chat area - fills remaining space */}
      <MainCoachChat
        onMessageSent={() => setHasStartedChatting(true)}
        easyStartSection={
          showEasyStart ? (
            <EasyStartSection
              onDismiss={() => setEasyStartDismissed(true)}
            />
          ) : undefined
        }
      />
    </div>
  );
}
