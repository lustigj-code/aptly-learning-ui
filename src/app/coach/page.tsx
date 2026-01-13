'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Coach Page - Redirects to /learn
 *
 * The coach functionality is now embedded in the /learn page.
 * This redirect ensures any old links or bookmarks still work.
 */
export default function CoachPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/learn');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy/5 via-white to-purple/5">
      <p className="text-navy/60">Redirecting to learning...</p>
    </div>
  );
}
