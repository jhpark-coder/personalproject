/**
 * Production-optimized logging utility
 * Only logs in development, removes all logs in production build
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabledInProduction: false,
      minLevel: 'info',
      ...config
    };
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && !this.config.enabledInProduction) {
      return false;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }

  private formatMessage(message: string, data?: any): [string, any?] {
    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : '';
    const formattedMessage = `${prefix}${message}`;
    
    return data !== undefined ? [formattedMessage, data] : [formattedMessage];
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      const [msg, logData] = this.formatMessage(message, data);
      logData !== undefined ? console.debug(msg, logData) : console.debug(msg);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      const [msg, logData] = this.formatMessage(message, data);
      logData !== undefined ? console.info(msg, logData) : console.info(msg);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      const [msg, logData] = this.formatMessage(message, data);
      logData !== undefined ? console.warn(msg, logData) : console.warn(msg);
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      const [msg, logData] = this.formatMessage(message, data);
      logData !== undefined ? console.error(msg, logData) : console.error(msg);
    }
  }

  // Performance logging for critical operations
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(this.config.prefix ? `[${this.config.prefix}] ${label}` : label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(this.config.prefix ? `[${this.config.prefix}] ${label}` : label);
    }
  }
}

// Pre-configured loggers for different modules
export const motionLogger = new Logger({ prefix: 'Motion', minLevel: 'info' });
export const ttsLogger = new Logger({ prefix: 'TTS', minLevel: 'warn' });
export const apiLogger = new Logger({ prefix: 'API', minLevel: 'error' });
export const performanceLogger = new Logger({ prefix: 'Perf', minLevel: 'debug' });

// Default logger
export const logger = new Logger();

// Utility for conditional logging
export const devOnly = (fn: () => void): void => {
  if (process.env.NODE_ENV === 'development') {
    fn();
  }
};

export default logger;