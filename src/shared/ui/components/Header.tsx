import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ImageBackground, TouchableOpacity, Animated, Platform, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from '../primitives/Stacks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { SIZES } from '../../theme/spacing';
import { useAddresses } from '../../../features/addresses/presentation/hooks/useAddresses';

export default function Header() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { addresses } = useAddresses();
  
  const flameAnim = useRef(new Animated.Value(0)).current;
  const [locationName, setLocationName] = useState<string>('Detecting Location...');
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const fetchGpsLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setLocationName('Enable GPS');
        setIsLoadingLocation(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Location Permission Required');
        setIsLoadingLocation(false);
        return;
      }

      let loc: Location.LocationObject | null = null;
      try {
        loc = await Location.getLastKnownPositionAsync({ maxAge: 10000 });
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Low 
          });
        }
      } catch (err) {
        try {
          loc = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Lowest 
          });
        } catch (_) {}
      }

      if (!loc) {
        setLocationName('Tap to set location');
        setIsLoadingLocation(false);
        return;
      }

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        const locality = place.name || place.district || place.subregion || place.city || '';
        const city = place.city || place.subregion || place.region || '';
        
        if (locality && city && locality !== city) {
          setLocationName(`${locality}, ${city}`);
        } else if (city) {
          setLocationName(`${city}, ${place.country || 'India'}`);
        } else if (locality) {
          setLocationName(`${locality}`);
        } else {
          setLocationName(place.region || 'Current Location');
        }
      } else {
        setLocationName('Current Location');
      }
    } catch (error) {
      console.warn('Location detection note:', error);
      setLocationName('Tap to set location');
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  // Update header location: prioritize saved delivery address if user has one
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      if (defaultAddr) {
        const title = defaultAddr.label ? `${defaultAddr.label.toUpperCase()}` : 'DELIVER TO';
        const place = defaultAddr.city || defaultAddr.line1 || 'Saved Address';
        setLocationName(`${title} • ${place}`);
        return;
      }
    }
    fetchGpsLocation();
  }, [addresses, fetchGpsLocation]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(flameAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' })
    ).start();
  }, []);

  const handleLocationPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      navigation.navigate('AddressList');
    } catch (_) {
      fetchGpsLocation();
    }
  };

  return (
    <YStack 
      borderBottomLeftRadius={SIZES.radius} 
      borderBottomRightRadius={SIZES.radius} 
      overflow="hidden" 
      backgroundColor="#0F301F"
    >
      <ImageBackground 
        source={require('../../../../assets/premium-bg.jpg.png')} 
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
            {/* Logo */}
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

            {/* Location Selector */}
            <TouchableOpacity 
              onPress={handleLocationPress}
              activeOpacity={0.8}
              style={{ maxWidth: '60%' }}
            >
              <YStack marginLeft={15} alignItems="flex-end">
                <XStack alignItems="center">
                  <Text color="rgba(255,255,255,0.7)" fontSize={10} marginBottom={2} fontWeight="600">
                    Delivery Location
                  </Text>
                  <Ionicons name="chevron-down" size={10} color="rgba(255,255,255,0.7)" style={{ marginLeft: 3, marginBottom: 2 }} />
                </XStack>
                
                <XStack alignItems="center">
                  <Ionicons name="location-sharp" size={14} color={COLORS.vibrantYellow} />
                  {isLoadingLocation ? (
                    <XStack alignItems="center" marginLeft={4}>
                      <ActivityIndicator size="small" color={COLORS.vibrantYellow} style={{ transform: [{ scale: 0.7 }] }} />
                      <Text color={COLORS.white} fontSize={12} fontWeight="bold" marginLeft={2}>Locating...</Text>
                    </XStack>
                  ) : (
                    <Text 
                      color={COLORS.white} 
                      fontSize={12} 
                      fontWeight="bold" 
                      marginLeft={4}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {locationName}
                    </Text>
                  )}
                </XStack>
              </YStack>
            </TouchableOpacity>
          </XStack>
        </YStack>
      </ImageBackground>
    </YStack>
  );
}
