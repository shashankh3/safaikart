import { Platform, UIManager } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import './config/firebase'; // Ensure Firebase is initialized

export const bootstrap = async () => {
  try {
    // 1. Enable LayoutAnimation on Android
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    // 2. Setup Global Error Handlers (Native Crashlytics)
    const defaultErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      console.error('Global Error:', error);
      crashlytics().recordError(error);
      if (defaultErrorHandler) {
        defaultErrorHandler.call(global, error, isFatal);
      }
    });

    const defaultRejectionHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      crashlytics().recordError(event.reason);
      if (defaultRejectionHandler) {
        defaultRejectionHandler.call(global, event);
      }
    };
  } catch (e) {
    console.log('Initialization failed', e);
  }
};
