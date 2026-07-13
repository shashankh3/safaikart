import appCheckModule from '@react-native-firebase/app-check';

let appCheck: any = null;

try {
  const rnAppCheck = appCheckModule();
  const provider = rnAppCheck.newReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
      debugToken: 'SOME-DEBUG-TOKEN-IF-NEEDED'
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
    },
  });

  rnAppCheck.initializeAppCheck({
    provider: provider,
    isTokenAutoRefreshEnabled: true,
  });

  appCheck = rnAppCheck;
  console.log('React Native Firebase App Check initialized');
} catch (error) {
  console.warn('Failed to initialize App Check', error);
}

export { appCheck };
