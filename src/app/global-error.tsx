'use client';

/**
 * Global Error Boundary for Next.js
 *
 * This component handles unhandled errors at the root level.
 * Note: There's a known issue with Next.js 16.1.1 + React 19 where
 * the internal /_global-error page fails to prerender. Using
 * --experimental-build-mode compile as a workaround.
 *
 * @see https://github.com/vercel/next.js/issues (file issue when confirmed)
 */

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem', color: '#0a004a' }}>
            Something went wrong!
          </h2>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#21a8b0',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
