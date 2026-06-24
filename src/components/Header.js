import React, { useEffect, useRef, useState } from 'react';
import { ImageBackground, TouchableOpacity, Animated, Platform } from 'react-native';
import { YStack, XStack, ZStack, Text } from './Stacks';




import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { COLORS, SIZES } from '../constants/theme';

export default function Header() {
  const insets = useSafeAreaInsets();
  
  const flameAnim = useRef(new Animated.Value(0)).current;
  const [locationName, setLocationName] = useState('New Delhi, India');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoadingLocation(true);
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setLocationName('GPS Disabled');
          return;
        }

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationName('Location Denied');
          return;
        }

        let location;
        try {
          location = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
          if (!location) {
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          }
        } catch (locError) {
          console.warn('Primary location fetch failed:', locError);
          location = await Location.getLastKnownPositionAsync({});
        }

        if (!location) {
          setLocationName('New Delhi, India');
          return;
        }

        let reverseGeocode;
        try {
          reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        } catch (e) {
          console.warn('Reverse geocode failed:', e);
        }
        
        if (reverseGeocode && reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          const city = place.city || place.subregion || place.region || 'Unknown City';
          const country = place.country || 'Unknown Country';
          setLocationName(`${city}, ${country}`);
        } else {
          setLocationName('New Delhi, India');
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        setLocationName('New Delhi, India'); // Silent fallback instead of 'Location Error'
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(flameAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' })
    ).start();
  }, []);

  return (
    <YStack 
      borderBottomLeftRadius={SIZES.radius} 
      borderBottomRightRadius={SIZES.radius} 
      overflow="hidden" 
      backgroundColor="#0F301F"
    >
      <ImageBackground 
        source={require('../../assets/premium-bg.jpg.png')} 
        style={{ width: '102%', left: '-1%' }} 
        imageStyle={{ borderBottomLeftRadius: SIZES.radius, borderBottomRightRadius: SIZES.radius }}
        resizeMode="cover"
      >
        <YStack backgroundColor="transparent" paddingTop={insets.top}>
          <XStack 
            justifyContent="space-between" 
            alignItems="center" 
            paddingHorizontal={SIZES.padding} 
            paddingVertical={10} 
            backgroundColor="transparent"
          >
            <XStack alignItems="flex-end">
              <Text fontSize={24} fontFamily="Inter_900Black" letterSpacing={0.75} color={COLORS.vibrantYellow}>Safa</Text>
              <YStack alignItems="center" position="relative">
                <Animated.View style={{ 
                  position: 'absolute', 
                  top: Platform.OS === 'android' ? 2 : -1.5, 
                  zIndex: 10, 
                  transform: [
                    { translateX: Platform.OS === 'android' ? -1.7 : -0.5 },
                    { scaleX: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.95, 1, 0.95, 1] }) },
                    { rotate: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-3deg', '0deg', '3deg', '0deg'] }) }
                  ], 
                  opacity: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0.9, 1, 0.85, 1, 0.9] }) 
                }}>
                  <Ionicons name="water" size={11} color="#E51A1A" />
                </Animated.View>
                <Text fontSize={24} fontFamily="Inter_900Black" color={COLORS.vibrantYellow} letterSpacing={0} marginRight={1.5}>ı</Text>
              </YStack>
              <Text fontSize={24} fontFamily="Inter_900Black" letterSpacing={0.75} color={COLORS.white}>Kart</Text>
            </XStack>

            <XStack alignItems="center">
              <YStack marginLeft={15} alignItems="flex-end">
                <Text color="rgba(255,255,255,0.7)" fontSize={10} marginBottom={2} fontWeight="600">Current Location</Text>
                <XStack alignItems="center">
                  <TouchableOpacity onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}>
                    <Ionicons name="location-sharp" size={14} color={COLORS.vibrantYellow} />
                  </TouchableOpacity>
                  <Text color={COLORS.white} fontSize={12} fontWeight="bold" marginLeft={4}>
                    {isLoadingLocation ? 'Locating...' : locationName}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={COLORS.white} style={{ marginLeft: 2 }} />
                </XStack>
              </YStack>
            </XStack>
          </XStack>
        </YStack>
      </ImageBackground>
    </YStack>
  );
}
