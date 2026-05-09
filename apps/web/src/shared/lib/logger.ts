type LogLevel = 'debug' | 'warn' | 'error';

const nativeLogger = globalThis.console;

const enabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_CLIENT_LOGS === 'true';

const write = (level: LogLevel, args: unknown[]) => {
  if (!enabled) return;
  nativeLogger[level](...args);
};

export const logger = {
  debug: (...args: unknown[]) => write('debug', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args),
};
