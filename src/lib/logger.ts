type LogLevel = 'info' | 'warn' | 'error';

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const LEVELS: Record<LogLevel, number> = { info: 0, warn: 1, error: 2 };

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

function formatMessage(prefix: string, msg: string): string {
  return `${new Date().toISOString()} [${prefix}] ${msg}`;
}

export function createLogger(prefix: string) {
  return {
    info: (msg: string) => {
      if (shouldLog('info')) process.stdout.write(formatMessage(prefix, msg) + '\n');
    },
    warn: (msg: string) => {
      if (shouldLog('warn')) process.stderr.write(formatMessage(prefix, msg) + '\n');
    },
    error: (msg: string, err?: unknown) => {
      if (shouldLog('error')) {
        process.stderr.write(formatMessage(prefix, msg) + '\n');
        if (err) process.stderr.write(String(err) + '\n');
      }
    },
  };
}
