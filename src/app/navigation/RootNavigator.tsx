import React, { useRef, useEffect, useState } from 'react';
import { Platform, ImageBackground, TouchableOpacity, Animated, View } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../../shared/ui/primitives/Stacks';
import * as Haptics from 'expo-haptics';

import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../../features/catalog/presentation/screens/HomeScreen';
import OrdersScreen from '../../features/orders/presentation/screens/OrdersScreen';
import ProfileScreen from '../../features/profile/presentation/screens/ProfileScreen';
import NotificationCenterScreen from '../../features/profile/presentation/screens/NotificationCenterScreen';
import OrderTrackingScreen from '../../features/orders/presentation/screens/OrderTrackingScreen';
import CouponsScreen from '../../features/catalog/presentation/screens/CouponsScreen';
import AuthNavigator from './AuthNavigator';
import ServiceDetailsScreen from '../../features/catalog/presentation/screens/ServiceDetailsScreen';
import AddressListScreen from '../../features/addresses/presentation/screens/AddressListScreen';
import AddressFormScreen from '../../features/addresses/presentation/screens/AddressFormScreen';
import SupportScreen from '../../features/profile/presentation/screens/SupportScreen';
import EditOrderScreen from '../../features/orders/presentation/screens/EditOrderScreen';

import StickyCart from '../../features/cart/presentation/components/StickyCart';
import AnimatedPressable from '../../shared/ui/components/AnimatedPressable';

import CheckoutNavigator from './CheckoutNavigator';
import PaymentCallbackScreen from '../../features/payments/presentation/screens/PaymentCallbackScreen';

import { COLORS } from '../../shared/theme/colors';
import { SIZES } from '../../shared/theme/spacing';
import { useAuth } from '../../features/auth/application/useAuth';
import { useAppConfig } from '../../features/auth/application/useAppConfig';
import { MaintenanceScreen, ForceUpdateScreen, BlockedUserScreen } from './BlockingScreens';
import { ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { setupNotificationListeners, getFcmToken, saveFcmToken, requestNotificationPermission } from '../../core/firebase/messaging';

const Tab = createMaterialTopTabNavigator<any>();
const Stack = createNativeStackNavigator<any>();

const prefix = Linking.createURL('/');
const linking: import('@react-navigation/native').LinkingOptions<any> = {
  prefixes: [prefix, 'safaikart://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Orders: 'orders',
        }
      },
      OrderTracking: 'order/:orderId',
      PaymentCallback: 'payment/:orderId/:status',
    }
  }
};

const CustomTabBar = ({ state, descriptors, navigation, insets, blurTargetRef }: any) => {
  return (
    <XStack
      position="absolute"
      alignSelf="center"
      left={0}
      height={70 + insets.bottom}
      paddingBottom={insets.bottom}
      width="100%"
      bottom={0}
      style={{
        backgroundColor: COLORS.primaryBg,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0'
      }}
    >
      <XStack width="100%" height="100%" alignItems="center" justifyContent="space-around">
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const onPress = () => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) { navigation.navigate(route.name); }
        };

        let iconName: any;
        if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'Orders') iconName = isFocused ? 'bag' : 'bag-outline';
        else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

        const label = route.name.toUpperCase();
        const displayLabel = label;
        const tintColor = isFocused ? '#0F301F' : '#9EB5A8';

        return (
          <AnimatedPressable key={index} onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <YStack alignItems="center" justifyContent="center" height="100%" paddingBottom={4}>
              <Ionicons name={iconName} size={22} color={tintColor} style={{ marginBottom: 4 }} />
              <Text fontSize={9} letterSpacing={0.5} color={tintColor} fontWeight={isFocused ? '900' : '600'}>
                {displayLabel}
              </Text>
              <YStack marginTop={4} width={20} height={3} borderRadius={2} backgroundColor={isFocused ? '#F4C73E' : 'transparent'} />
            </YStack>
          </AnimatedPressable>
        );
      })}
      </XStack>
    </XStack>
  );
};

function BottomTabs() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator id={undefined}
        tabBarPosition="bottom"
        tabBar={(props: any) => <CustomTabBar {...props} insets={insets} />}
        
        screenOptions={{ 
          tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', elevation: 0, borderTopWidth: 0 }
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Orders" component={OrdersScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading: authLoading, isBlocked } = useAuth();
  const { config, loading: configLoading } = useAppConfig();
  const navigationRef = useRef<any>(null);

  const [pendingDeepLink, setPendingDeepLink] = useState<{name: string, params: any} | null>(null);

  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        const token = await getFcmToken();
        if (token) {
          await saveFcmToken(token);
        }
      }
    };
    
    setupNotifications();

    const cleanup = setupNotificationListeners(
      (notification) => {
        console.log('Notification received in foreground:', notification);
      },
      (response) => {
        const data = response?.notification?.request?.content?.data || response?.data;
        if (data?.orderId) {
          if (navigationRef.current?.isReady()) {
            navigationRef.current.navigate('OrderTracking', { orderId: data.orderId });
          } else {
            setPendingDeepLink({ name: 'OrderTracking', params: { orderId: data.orderId } });
          }
        }
      }
    );

    return () => cleanup();
  }, [user]);

  if (authLoading || configLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryBg }}>
        <ActivityIndicator size="large" color={COLORS.darkGreen} />
      </View>
    );
  }

  if (config?.maintenanceMode) {
    return <MaintenanceScreen />;
  }

  const currentVersion = parseFloat(Constants.expoConfig?.version || '1.0');
  if (config?.minAppVersion && config.minAppVersion > currentVersion) {
    return <ForceUpdateScreen />;
  }

  if (user && isBlocked) {
    return <BlockedUserScreen />;
  }

  return (
    <NavigationContainer 
      linking={linking} 
      ref={navigationRef}
      onReady={() => {
        if (pendingDeepLink && navigationRef.current) {
          navigationRef.current.navigate(pendingDeepLink.name, pendingDeepLink.params);
          setPendingDeepLink(null);
        }
      }}
    >
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="AuthNavigator" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabs} />
            <Stack.Screen name="CouponsScreen" component={CouponsScreen} />
            <Stack.Screen name="AddressList" component={AddressListScreen} />
            <Stack.Screen name="AddressForm" component={AddressFormScreen} />
            <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
            <Stack.Screen name="CheckoutFlow" component={CheckoutNavigator} />
            <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <Stack.Screen name="EditOrder" component={EditOrderScreen} />
            <Stack.Screen name="PaymentCallback" component={PaymentCallbackScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
