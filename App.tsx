import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/app/navigation/RootNavigator';
import { COLORS } from './src/shared/theme/colors';
import { YStack } from './src/shared/ui/primitives/Stacks';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { CartProvider } from './src/features/cart/presentation/hooks/useCart';
import { AppProvider } from './src/app/AppProvider';
import { NotificationProvider } from './src/core/firebase/NotificationProvider';
import { ToastProvider } from './src/core/providers/ToastContext';
import { ErrorBoundary } from './src/app/ErrorBoundary';
import { bootstrap } from './src/app/bootstrap';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// let Sentry: any;
// if (!isExpoGo) {
//   try {
//     Sentry = require('@sentry/react-native');
//     Sentry.init({
//       dsn: "YOUR_SENTRY_DSN",
//       debug: false, 
//     });
//   } catch (e) {
//     console.log('Sentry initialization failed', e);
//   }
// }

SplashScreen.preventAutoHideAsync();

const MOBILE_WIDTH = 412;
const MOBILE_HEIGHT = 892;

function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    InterBold: Inter_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
  });

  const [bootstrapReady, setBootstrapReady] = React.useState(false);

  useEffect(() => {
    bootstrap().then(() => {
      setBootstrapReady(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        (NavigationBar as any).setPositionAsync('absolute');
        (NavigationBar as any).setBackgroundColorAsync('#FEF9EA');
        (NavigationBar as any).setButtonStyleAsync('dark');
        (NavigationBar as any).setBehaviorAsync('overlay-swipe');
      } catch (e) {}
    }
    if (fontsLoaded && bootstrapReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, bootstrapReady]);

  if (!fontsLoaded || !bootstrapReady) return null;

  return (
    <SafeAreaProvider>
      <YStack 
        flex={1} 
        backgroundColor={COLORS.primaryBg}
      >
        <StatusBar style="auto" />
        <AppProvider>
          <ToastProvider>
            <CartProvider>
              <NotificationProvider>
                <ErrorBoundary>
                  <AppNavigator />
                </ErrorBoundary>
              </NotificationProvider>
            </CartProvider>
          </ToastProvider>
        </AppProvider>
      </YStack>
    </SafeAreaProvider>
  );
}

// export default isExpoGo ? App : (Sentry ? Sentry.wrap(App) : App);
export default App;


