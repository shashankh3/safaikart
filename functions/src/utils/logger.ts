import pino from 'pino';
import * as Sentry from '@sentry/node';

// Configure Pino with PII redaction
export const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => {
      // Map pino level to GCP Cloud Logging severity
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

export const logInfo = (message: string, data?: any) => {
  if (data) {
    pinoLogger.info(data, message);
  } else {
    pinoLogger.info(message);
  }
};

export const logWarn = (message: string, data?: any) => {
  if (data) {
    pinoLogger.warn(data, message);
  } else {
    pinoLogger.warn(message);
  }
};

export const logError = (message: string, error?: any, data?: any) => {
  // Log to Pino
  const logData = { ...data };
  if (error instanceof Error) {
    logData.error = { message: error.message, stack: error.stack };
  } else if (error) {
    logData.error = error;
  }
  
  pinoLogger.error(logData, message);

  // Send to Sentry
  Sentry.withScope((scope) => {
    if (data) {
      scope.setExtras(data);
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else if (error) {
       Sentry.captureException(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
    } else {
      Sentry.captureMessage(message, 'error');
    }
  });
};
