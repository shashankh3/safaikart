import React, { useRef, useEffect, useState } from 'react';
import { Animated, ImageBackground, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useAppDimensions } from '../hooks/useAppDimensions';
import { YStack, XStack, ZStack, Text } from './Stacks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';


import { COLORS, SIZES } from '../constants/theme';
import AnimatedPressable from './AnimatedPressable';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const DATES = [
  { id: 1, day: 'Today', date: '22 Jun' },
  { id: 2, day: 'Tomorrow', date: '23 Jun' },
  { id: 3, day: 'Wed', date: '24 Jun' },
  { id: 4, day: 'Thu', date: '25 Jun' },
];

const TIMES = [
  { id: 1, slot: '09:00 AM - 11:00 AM' },
  { id: 2, slot: '12:00 PM - 02:00 PM' },
  { id: 3, slot: '03:00 PM - 05:00 PM' },
  { id: 4, slot: '06:00 PM - 08:00 PM' },
];

export default function StickyCart() {
  const { width: windowWidth, height: windowHeight } = useAppDimensions();
  const appWidth = Math.min(windowWidth, 412);
  const appHeight = Math.min(windowHeight, 892);
  const insets = useSafeAreaInsets();
  
  const bottomPosition = 70 + insets.bottom; 
  
  const translateY = useRef(new Animated.Value(150)).current;
  const [isModalVisible, setModalVisible] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedDate, setSelectedDate] = useState(DATES[0].id);
  const [selectedTime, setSelectedTime] = useState(TIMES[0].id);
  const [isAnimatingWash, setIsAnimatingWash] = useState(false);
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const washAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 12,
      speed: 12,
      delay: 500, 
    }).start();
  }, []);

  const handlePlaceOrder = () => {
    if (!selectedDate || !selectedTime || isAnimatingWash || orderPlaced) return;
    setIsAnimatingWash(true);

    Animated.timing(washAnim, {
      toValue: 1, 
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      setIsAnimatingWash(false);
      washAnim.setValue(0);
      setOrderPlaced(true);
      
      Animated.sequence([
        Animated.spring(checkmarkScale, { toValue: 1, bounciness: 15, useNativeDriver: true }),
        Animated.delay(1500)
      ]).start(() => {
        setModalVisible(false);
        setTimeout(() => { setOrderPlaced(false); checkmarkScale.setValue(0); }, 500);
      });
    });
  };

  return (
    <>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, zIndex: 100,
        elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15, shadowRadius: 10,
        bottom: bottomPosition, transform: [{ translateY }]
      }}>
        <AnimatedPressable onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setModalVisible(true);
        }}>
          <ImageBackground 
            source={require('../../assets/premium-bg.jpg.png')} 
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
                    Laundry <Text color="rgba(255,255,255,0.5)" fontWeight="normal" fontSize={14}> | </Text><Text color={COLORS.vibrantYellow} fontWeight="900" fontSize={15}>₹700</Text>
                  </Text>
                </YStack>
              </XStack>
              
              <AnimatedPressable style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.vibrantYellow, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30 }} onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setModalVisible(true);
              }}>
                <Text fontSize={16} fontWeight="bold" color={COLORS.black} marginRight={8}>Checkout</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
              </AnimatedPressable>
            </XStack>
          </ImageBackground>
        </AnimatedPressable>
      </Animated.View>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <YStack flex={1} backgroundColor="transparent" alignItems="center">
          <YStack height="100%" backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end" width={appWidth}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => !orderPlaced && setModalVisible(false)} />
            <YStack backgroundColor={COLORS.white} borderTopLeftRadius={30} borderTopRightRadius={30} padding={24} minHeight={appHeight * 0.5}>
            {!orderPlaced ? (
              <>
                <YStack width={40} height={5} backgroundColor="#DDD" borderRadius={3} alignSelf="center" marginBottom={20} />
                <Text fontSize={22} fontWeight="900" marginBottom={10} style={{ fontFamily: 'Inter_900Black' }}>Order Summary</Text>
                
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: appHeight * 0.6 }}>
                  
                  <Text fontSize={16} fontWeight="800" marginBottom={10} marginTop={15}>Pickup Date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {DATES.map(d => (
                      <AnimatedPressable key={d.id} onPress={() => setSelectedDate(d.id)} style={[{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', marginRight: 10, alignItems: 'center', backgroundColor: '#FFF' }, selectedDate === d.id && { backgroundColor: COLORS.vibrantYellow, borderColor: COLORS.vibrantYellow }]}>
                        <Text fontSize={12} color={selectedDate === d.id ? COLORS.black : '#666'} marginBottom={4}>{d.day}</Text>
                        <Text fontSize={16} fontWeight="bold" color={COLORS.black}>{d.date}</Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>

                  <Text fontSize={16} fontWeight="800" marginBottom={10} marginTop={15}>Pickup Time</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {TIMES.map(t => (
                      <AnimatedPressable key={t.id} onPress={() => setSelectedTime(t.id)} style={[{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', marginRight: 10, justifyContent: 'center', backgroundColor: '#FFF' }, selectedTime === t.id && { backgroundColor: COLORS.vibrantYellow, borderColor: COLORS.vibrantYellow }]}>
                        <Text fontSize={14} fontWeight="bold" color={COLORS.black}>{t.slot}</Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                  
                  <YStack height={1} backgroundColor="#EEE" marginVertical={20} />
                  <Text fontSize={16} fontWeight="800" marginBottom={10} marginTop={0} style={{ fontFamily: 'Inter_900Black' }}>Order Summary</Text>
                  <XStack justifyContent="space-between" marginBottom={15}>
                    <Text fontSize={16} color="#444" fontWeight="600">2x Premium Shirt Wash</Text>
                    <Text fontSize={16} fontWeight="bold" color={COLORS.darkGreen}>₹300</Text>
                  </XStack>
                  <XStack justifyContent="space-between" marginBottom={15}>
                    <Text fontSize={16} color="#444" fontWeight="600">1x Leather Jacket Care</Text>
                    <Text fontSize={16} fontWeight="bold" color={COLORS.darkGreen}>₹400</Text>
                  </XStack>

                  <YStack height={1} backgroundColor="#EEE" marginVertical={20} />
                  
                  <XStack justifyContent="space-between" marginBottom={10}>
                    <Text fontSize={14} color="#666">Subtotal</Text>
                    <Text fontSize={14} fontWeight="bold">₹700</Text>
                  </XStack>
                  <XStack justifyContent="space-between" marginBottom={10}>
                    <Text fontSize={14} color="#666">Delivery Fee</Text>
                    <Text fontSize={14} fontWeight="bold" color="#27AE60">FREE</Text>
                  </XStack>
                  <XStack justifyContent="space-between" marginBottom={10} marginTop={10}>
                    <Text fontSize={18} fontWeight="900">Grand Total</Text>
                    <Text fontSize={24} fontWeight="900" color={COLORS.darkGreen}>₹700</Text>
                  </XStack>
                </ScrollView>

                <AnimatedPressable 
                  style={[{ backgroundColor: COLORS.vibrantYellow, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 30, shadowColor: COLORS.vibrantYellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }, (!selectedDate || !selectedTime) && { backgroundColor: '#A0A0A0', shadowOpacity: 0, elevation: 0 }]} 
                  onPress={handlePlaceOrder}
                >
                  {isAnimatingWash ? (
                    <XStack alignItems="center">
                      <YStack position="relative" marginRight={12}>
                        <Animated.View style={{ transform: [{ rotate: washAnim.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], outputRange: ['0deg', '-15deg', '15deg', '-15deg', '15deg', '-15deg', '15deg', '-15deg', '15deg', '-15deg', '0deg'] }) }] }}>
                          <MaterialIcons name="local-laundry-service" size={28} color={COLORS.black} />
                        </Animated.View>
                        <Animated.View style={{ position: 'absolute', top: -5, left: -5, opacity: washAnim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: washAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }, { translateX: washAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -10, -5] }) }] }}>
                          <MaterialIcons name="circle" size={10} color="rgba(255,255,255,0.9)" />
                        </Animated.View>
                        <Animated.View style={{ position: 'absolute', top: 5, right: -10, opacity: washAnim.interpolate({ inputRange: [0, 0.3, 0.9, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: washAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }, { translateX: washAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, 5] }) }] }}>
                          <MaterialIcons name="circle" size={14} color="rgba(255,255,255,0.8)" />
                        </Animated.View>
                        <Animated.View style={{ position: 'absolute', top: -10, left: 10, opacity: washAnim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: washAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }] }}>
                          <MaterialIcons name="circle" size={6} color="#FFF" />
                        </Animated.View>
                      </YStack>
                      <Text color={COLORS.black} fontSize={16} fontWeight="900" letterSpacing={1}>REVITALIZING FABRICS...</Text>
                    </XStack>
                  ) : (
                    <Text color={COLORS.black} fontSize={16} fontWeight="900" letterSpacing={1}>PLACE ORDER</Text>
                  )}
                </AnimatedPressable>
              </>
            ) : (
              <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical={50}>
                <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                  <YStack width={100} height={100} borderRadius={50} backgroundColor="#27AE60" alignItems="center" justifyContent="center" marginBottom={20}>
                    <Ionicons name="checkmark" size={60} color={COLORS.white} />
                  </YStack>
                </Animated.View>
                <Text fontSize={28} fontWeight="900" color="#1B3B22" marginBottom={10}>Order Placed!</Text>
                <Text fontSize={16} color="#666">Our rider will be there soon.</Text>
              </YStack>
            )}
            </YStack>
          </YStack>
        </YStack>
      </Modal>
    </>
  );
}
