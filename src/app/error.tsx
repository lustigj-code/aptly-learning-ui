'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
        <span className="text-2xl text-red-600">!</span>
      </div>
      <h1 className="text-2xl font-bold text-navy mb-2">Something went wrong</h1>
      <p className="text-rich-black/60 mb-6 text-center max-w-md">
        We encountered an unexpected error. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-teal text-white font-medium rounded-xl hover:bg-teal/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
