'use client';

import { useState, useEffect } from 'react';

// Hook to detect when Zustand has hydrated from localStorage
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
