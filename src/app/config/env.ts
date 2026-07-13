export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.safaikart.com',
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || 'development',
  IS_DEV: __DEV__,
  ENABLE_DEBUG_LOGS: __DEV__,
};
