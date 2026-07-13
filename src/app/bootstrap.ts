import crashlytics from '@react-native-firebase/crashlytics';

export function bootstrap() {
  if (!__DEV__) {
    try {
      const defaultHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        crashlytics().recordError(error);
        defaultHandler(error, isFatal);
      });

      const defaultRejectionHandler = global.onunhandledrejection;
      global.onunhandledrejection = (event) => {
        if (event && event.reason) {
          crashlytics().recordError(event.reason);
        }
        if (defaultRejectionHandler) {
          defaultRejectionHandler.call(global, event);
        }
      };
    } catch (e) {
      console.log('Crashlytics initialization failed', e);
    }
  }
}
