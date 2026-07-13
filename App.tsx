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
import { ErrorBoundary } from './src/app/ErrorBoundary';
import { bootstrap } from './src/app/bootstrap';
import Constants from 'expo-constants';

bootstrap();

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

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        (NavigationBar as any).setPositionAsync('absolute');
        (NavigationBar as any).setBackgroundColorAsync('#FEF9EA');
        (NavigationBar as any).setButtonStyleAsync('dark');
        (NavigationBar as any).setBehaviorAsync('overlay-swipe');
      } catch (e) {}
    }
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && windowWidth > 450;

  if (!fontsLoaded) return null;

  // Calculate dynamic scale to fit the mobile container inside the browser window
  // with a small padding (e.g., 0.95) to account for taskbars or margins.
  const scale = isLargeScreen 
    ? Math.min((windowWidth * 0.95) / MOBILE_WIDTH, (windowHeight * 0.95) / MOBILE_HEIGHT, 1) 
    : 1;

  return (
    <SafeAreaProvider>
      <YStack 
        flex={1} 
        backgroundColor={isLargeScreen ? '#f5f5f5' : COLORS.primaryBg}
        alignItems="center"
        justifyContent="center"
      >
        <View 
          style={{
            flex: isLargeScreen ? undefined : 1,
            width: isLargeScreen ? MOBILE_WIDTH : '100%',
            height: isLargeScreen ? MOBILE_HEIGHT : '100%',
            backgroundColor: COLORS.primaryBg,
            ...(isLargeScreen ? {
              transform: [{ scale }],
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            } : {})
          }}
        >
          <StatusBar style="auto" />
          <AppProvider>
            <CartProvider>
              <NotificationProvider>
                <ErrorBoundary>
                  <AppNavigator />
                </ErrorBoundary>
              </NotificationProvider>
            </CartProvider>
          </AppProvider>
        </View>
      </YStack>
    </SafeAreaProvider>
  );
}

// export default isExpoGo ? App : (Sentry ? Sentry.wrap(App) : App);
export default App;


