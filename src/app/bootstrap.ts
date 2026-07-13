import { Platform, UIManager } from 'react-native';
import { initializeAuth } from '../core/firebase/auth';
import { initializeMessaging } from '../core/firebase/messaging';
import './config/firebase'; // Ensure Firebase is initialized
import { appCheck } from '../core/firebase/appCheck';

export const bootstrap = async () => {
  try {
    // 1. Enable LayoutAnimation on Android
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    // 2. Setup Global Error Handlers (Console only for Expo Go)
    const defaultErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      console.error('Global Error:', error);
      if (defaultErrorHandler) {
        defaultErrorHandler.call(global, error, isFatal);
      }
    });

    const defaultRejectionHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      if (defaultRejectionHandler) {
        defaultRejectionHandler.call(global, event);
      }
    };
  } catch (e) {
    console.log('Initialization failed', e);
  }
};
