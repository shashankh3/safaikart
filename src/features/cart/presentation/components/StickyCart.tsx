import React, { useRef, useEffect } from 'react';
import { Animated, ImageBackground, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { COLORS } from '../../../../shared/theme/colors';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';

export default function StickyCart() {
  const { totalItems, totalPrice } = useCart();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const bottomPosition = 70 + insets.bottom; 
  const translateY = useRef(new Animated.Value(150)).current;

  useEffect(() => {
    if (totalItems > 0) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 12,
        speed: 12,
        delay: 300, 
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 150,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [totalItems]);

  const handleCheckoutPress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('CheckoutFlow', { screen: 'Checkout' });
  };

  if (totalItems === 0) return null;

  return (
    <Animated.View style={{
      position: 'absolute', left: 0, right: 0, zIndex: 100,
      elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15, shadowRadius: 10,
      bottom: bottomPosition, transform: [{ translateY }]
    }}>
      <AnimatedPressable onPress={handleCheckoutPress}>
        <ImageBackground 
          source={require('../../../../../assets/premium-bg.jpg.png')} 
          style={{ width: '100%', overflow: 'hidden' }}
          imageStyle={{ width: '102%', left: '-1%' }}
          resizeMode="cover"
        >
          <XStack width="100%" alignItems="center" justifyContent="space-between" paddingVertical={12} paddingHorizontal={16}>
            <XStack alignItems="center">
              <XStack alignItems="center" width={58}>
                <YStack zIndex={3} width={26} height={26} borderRadius={13} backgroundColor="#264233" alignItems="center" justifyContent="center">
                  <Text fontSize={12}>👕</Text>
                </YStack>
                <YStack zIndex={2} marginLeft={-10} width={26} height={26} borderRadius={13} backgroundColor="#264233" alignItems="center" justifyContent="center">
                  <Text fontSize={12}>👟</Text>
                </YStack>
                <YStack zIndex={1} marginLeft={-10} width={26} height={26} borderRadius={13} backgroundColor="#264233" alignItems="center" justifyContent="center">
                  <Text fontSize={12}>👜</Text>
                </YStack>
              </XStack>
              <YStack marginLeft={4}>
                <Text color={COLORS.white} fontSize={14} fontWeight="800">
                  {totalItems} items <Text color="rgba(255,255,255,0.5)" fontWeight="normal" fontSize={14}> | </Text><Text color={COLORS.vibrantYellow} fontWeight="900" fontSize={15}>₹{totalPrice}</Text>
                </Text>
              </YStack>
            </XStack>
            
            <AnimatedPressable style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.vibrantYellow, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30 }} onPress={handleCheckoutPress}>
              <Text fontSize={16} fontWeight="bold" color={COLORS.black} marginRight={8}>Checkout</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
            </AnimatedPressable>
          </XStack>
        </ImageBackground>
      </AnimatedPressable>
    </Animated.View>
  );
}
