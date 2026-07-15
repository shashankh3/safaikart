import appCheck from '@react-native-firebase/app-check';

let appCheckInstance: any = null;

try {
  const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
    },
  });

  appCheck().initializeAppCheck({ provider, isTokenAutoRefreshEnabled: true });
  appCheckInstance = appCheck();
  console.log('Firebase App Check initialized');
} catch (error) {
  console.warn('Failed to initialize App Check', error);
}

export { appCheckInstance as appCheck };
