type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

type LogEntry = {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL]
}

function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.message,
  ]

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context))
  }

  if (entry.error) {
    parts.push(`\n  Error: ${entry.error.name}: ${entry.error.message}`)
    if (entry.error.stack) {
      parts.push(`\n  Stack: ${entry.error.stack}`)
    }
  }

  return parts.join(' ')
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  }
}

function logToConsole(entry: LogEntry): void {
  const formatted = formatLogEntry(entry)

  switch (entry.level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

// Main logger object
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return
    const entry = createLogEntry('debug', message, context)
    logToConsole(entry)
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return
    const entry = createLogEntry('info', message, context)
    logToConsole(entry)
  },

  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return
    const entry = createLogEntry('warn', message, context)
    logToConsole(entry)
  },

  error(message: string, error?: Error, context?: LogContext): void {
    if (!shouldLog('error')) return
    const entry = createLogEntry('error', message, context, error)
    logToConsole(entry)

    // In production, also send to error tracking service
    if (process.env.NODE_ENV === 'production' && error) {
      // Import dynamically to avoid circular dependencies
      import('./sentry').then(({ captureError }) => {
        captureError(error, { message, ...context })
      })
    }
  },
}

// Specialized loggers for common use cases
export const apiLogger = {
  request(method: string, url: string, context?: LogContext): void {
    logger.info(`API Request: ${method} ${url}`, context)
  },

  response(method: string, url: string, status: number, duration: number): void {
    const level = status >= 400 ? 'warn' : 'info'
    logger[level](`API Response: ${method} ${url} ${status} (${duration}ms)`)
  },

  error(method: string, url: string, error: Error): void {
    logger.error(`API Error: ${method} ${url}`, error)
  },
}

export const authLogger = {
  signIn(method: 'email' | 'google', userId?: string): void {
    logger.info('User signed in', { method, userId })
  },

  signOut(userId?: string): void {
    logger.info('User signed out', { userId })
  },

  signUp(method: 'email' | 'google', userId?: string): void {
    logger.info('User signed up', { method, userId })
  },

  error(action: string, error: Error): void {
    logger.error(`Auth error: ${action}`, error)
  },
}

export const learningLogger = {
  atomCompleted(atomId: string, atomType: string, userId?: string): void {
    logger.info('Atom completed', { atomId, atomType, userId })
  },

  lessonCompleted(lessonId: string, userId?: string): void {
    logger.info('Lesson completed', { lessonId, userId })
  },

  quizSubmitted(quizId: string, score: number, userId?: string): void {
    logger.info('Quiz submitted', { quizId, score, userId })
  },

  badgeEarned(badgeId: string, userId?: string): void {
    logger.info('Badge earned', { badgeId, userId })
  },

  streakUpdated(streak: number, userId?: string): void {
    logger.info('Streak updated', { streak, userId })
  },
}

export default logger
