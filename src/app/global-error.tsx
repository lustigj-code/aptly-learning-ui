'use client';

// This is a minimal global error boundary for Next.js
// It must not use any external dependencies or hooks

// Force dynamic rendering to prevent prerender issues
export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem', color: '#0a004a' }}>Something went wrong!</h2>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#21a8b0',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
