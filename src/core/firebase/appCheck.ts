import appCheck from '@react-native-firebase/app-check';

let appCheckInstance: any = null;

export const initializeAppCheckAsync = async () => {
  if (appCheckInstance) return appCheckInstance;

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

    await appCheck().initializeAppCheck({ provider, isTokenAutoRefreshEnabled: true });
    appCheckInstance = appCheck();
  } catch (error) {
    console.warn('Failed to initialize App Check', error);
  }
  return appCheckInstance;
};

export { appCheckInstance as appCheck };
