export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

function getCurrentLogLevel(): number {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase() as LogLevel;
  if (envLevel in LOG_LEVELS) {
    return LOG_LEVELS[envLevel];
  }
  if (process.env.NODE_ENV === 'test') {
    return LOG_LEVELS.error; // Keep test suites clean and quiet
  }
  return LOG_LEVELS.info;
}

function formatLog(level: string, tag: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] [${tag}] ${message}`;
}

export const logger = {
  debug(tag: string, message: string, ...meta: any[]): void {
    if (getCurrentLogLevel() <= LOG_LEVELS.debug) {
      if (meta.length > 0) {
        console.debug(formatLog('DEBUG', tag, message), ...meta);
      } else {
        console.debug(formatLog('DEBUG', tag, message));
      }
    }
  },

  info(tag: string, message: string, ...meta: any[]): void {
    if (getCurrentLogLevel() <= LOG_LEVELS.info) {
      if (meta.length > 0) {
        console.info(formatLog('INFO', tag, message), ...meta);
      } else {
        console.info(formatLog('INFO', tag, message));
      }
    }
  },

  warn(tag: string, message: string, ...meta: any[]): void {
    if (getCurrentLogLevel() <= LOG_LEVELS.warn) {
      if (meta.length > 0) {
        console.warn(formatLog('WARN', tag, message), ...meta);
      } else {
        console.warn(formatLog('WARN', tag, message));
      }
    }
  },

  error(tag: string, message: string, ...meta: any[]): void {
    if (getCurrentLogLevel() <= LOG_LEVELS.error) {
      if (meta.length > 0) {
        console.error(formatLog('ERROR', tag, message), ...meta);
      } else {
        console.error(formatLog('ERROR', tag, message));
      }
    }
  }
};
