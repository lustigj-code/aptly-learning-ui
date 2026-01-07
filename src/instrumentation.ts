export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,

      // Performance monitoring - lower in production
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Debug mode off in production
      debug: false,

      // Filter common non-errors
      beforeSend(event, hint) {
        const error = hint.originalException as Error | undefined

        // Ignore user-cancelled actions
        if (error?.message?.includes('popup-closed-by-user')) {
          return null
        }

        // Ignore expected network errors
        if (error?.message?.includes('Failed to fetch')) {
          return null
        }

        return event
      },
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    })
  }
}

export const onRequestError = async (
  err: Error,
  request: { path: string; method: string },
  context: { routerKind: string; routeType: string; revalidateReason: string | undefined }
) => {
  const Sentry = await import('@sentry/nextjs')

  Sentry.captureException(err, {
    extra: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routeType: context.routeType,
      revalidateReason: context.revalidateReason,
    },
  })
}
