import * as logger from 'firebase-functions/logger';

export const logInfo = (message: string, data?: any) => {
  logger.info(message, { structuredData: true, ...data });
};

export const logWarn = (message: string, data?: any) => {
  logger.warn(message, { structuredData: true, ...data });
};

export const logError = (message: string, error?: any, data?: any) => {
  logger.error(message, { 
    structuredData: true, 
    error: error?.message || error,
    stack: error?.stack,
    ...data 
  });
};
