import React, { useRef, useEffect } from 'react';
import { Platform, ImageBackground, TouchableOpacity, Animated, View } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../components/Stacks';
import * as Haptics from 'expo-haptics';




import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import SubScreen from '../screens/SubScreen';
import EntryScreen from '../screens/EntryScreen';
import ServiceDetailsScreen from '../screens/ServiceDetailsScreen';

import StickyCart from '../components/StickyCart';
import AnimatedPressable from '../components/AnimatedPressable';

import { COLORS, SIZES } from '../constants/theme';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

// Removed AnimatedTabIcon to implement the premium sliding bubble

const CustomTabBar = ({ state, descriptors, navigation, insets, blurTargetRef }) => {
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
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) { navigation.navigate(route.name); }
        };

        let iconName;
        if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'Orders') iconName = isFocused ? 'bag' : 'bag-outline';
        else if (route.name === 'OrderTracking') iconName = isFocused ? 'location' : 'location-outline';
        else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

        const label = route.name.toUpperCase();
        const displayLabel = label === 'ORDERTRACKING' ? 'TRACK' : label;
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
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
        screenOptions={{ 
          headerShown: false,
          tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', elevation: 0, borderTopWidth: 0 }
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Orders" component={OrdersScreen} />
        <Tab.Screen 
          name="OrderTracking" 
          component={OrderTrackingScreen} 
          options={{ tabBarLabel: 'Track', swipeEnabled: false }} 
        />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Entry">
        <Stack.Screen name="Entry" component={EntryScreen} />
        <Stack.Screen name="MainTabs" component={BottomTabs} />
        <Stack.Screen name="SubScreen" component={SubScreen} />
        <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
