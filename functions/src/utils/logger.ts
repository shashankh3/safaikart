import pino from 'pino';
import * as Sentry from '@sentry/node';

// Configure Pino with PII redaction
export const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => {
      const severityMap: Record<string, string> = {
        trace: 'DEBUG',
        debug: 'DEBUG',
        info: 'INFO',
        warn: 'WARNING',
        error: 'ERROR',
        fatal: 'CRITICAL',
      };
      return { severity: severityMap[label] || 'INFO' };
    }
  },
  messageKey: 'message', // GCP Cloud Logging compatibility
  redact: {
    paths: [
      '*.phone', '*.phoneNumber', 'phone', 'phoneNumber',
      '*.email', 'email',
      '*.address', 'address',
      '*.pincode', 'pincode',
      '*.pan', 'pan'
    ],
    censor: '[REDACTED]'
  }
});

interface LogContext {
  userId?: string;
  orderId?: string;
  paymentId?: string;
  [key: string]: any;
}

export class ContextLogger {
  constructor(private context: LogContext) {}

  info(message: string, data?: any) {
    pinoLogger.info({ ...this.context, ...data }, message);
  }

  warn(message: string, data?: any) {
    pinoLogger.warn({ ...this.context, ...data }, message);
  }

  error(message: string, error?: any, data?: any) {
    const logData: any = { ...this.context, ...data };
    
    if (error instanceof Error) {
      logData.error = { message: error.message, stack: error.stack };
    } else if (error) {
      logData.error = error;
    }
    
    pinoLogger.error(logData, message);

    Sentry.withScope((scope) => {
      scope.setExtras(logData);
      
      if (this.context.userId) {
        scope.setUser({ id: this.context.userId });
      }

      if (error instanceof Error) {
        Sentry.captureException(error);
      } else if (error) {
        Sentry.captureException(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
      } else {
        Sentry.captureMessage(message, 'error');
      }
    });
  }
}

export const createLogger = (context: LogContext = {}) => {
  return new ContextLogger(context);
};

// Legacy exports for compatibility
export const logInfo = (message: string, data?: any) => createLogger().info(message, data);
export const logWarn = (message: string, data?: any) => createLogger().warn(message, data);
export const logError = (message: string, error?: any, data?: any) => createLogger().error(message, error, data);
