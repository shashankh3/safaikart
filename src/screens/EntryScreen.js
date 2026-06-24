import React, { useEffect, useRef, useState } from 'react';
import { Animated, StatusBar, ImageBackground, FlatList, useWindowDimensions, Platform } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../components/Stacks';




import { COLORS, SIZES } from '../constants/theme';
import AnimatedPressable from '../components/AnimatedPressable';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const floatingIconsData = [
  { id: 1, name: 'iron', Component: MaterialCommunityIcons, size: 70, color: 'rgba(255,255,255,0.25)', delay: 0, top: '8%', left: '10%', spinDuration: 25000, floatDuration: 4000, reverse: false },
  { id: 2, name: 'shoe-sneaker', Component: MaterialCommunityIcons, size: 60, color: 'rgba(255,255,255,0.2)', delay: 1000, top: '15%', right: '15%', spinDuration: 20000, floatDuration: 3500, reverse: true },
  { id: 3, name: 'hanger', Component: MaterialCommunityIcons, size: 80, color: 'rgba(242, 201, 76, 0.35)', delay: 2000, top: '28%', left: '20%', spinDuration: 30000, floatDuration: 5000, reverse: false },
  { id: 4, name: 'tshirt-crew', Component: MaterialCommunityIcons, size: 65, color: 'rgba(255,255,255,0.25)', delay: 500, top: '40%', right: '10%', spinDuration: 22000, floatDuration: 4500, reverse: true },
];

const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: "PREMIUM\nGARMENT\nCARE.",
    subtitle: "Professional washing and delicate dry cleaning delivered straight to your door.",
    buttonText: "GET STARTED"
  },
  {
    id: '2',
    title: "ECO-\nFRIENDLY\nPROCESS.",
    subtitle: "We use sustainable, chemical-free solvents that are gentle on your clothes and the planet.",
    buttonText: "NEXT"
  },
  {
    id: '3',
    title: "FAST &\nRELIABLE\nSERVICE.",
    subtitle: "Schedule a pickup today and get your fresh clothes back in 48 hours or less.",
    buttonText: "ENTER"
  }
];

const FloatingIcon = ({ data }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: 1, duration: data.floatDuration, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: data.floatDuration, useNativeDriver: true })
        ])
      ).start();

      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: data.spinDuration, useNativeDriver: true })
      ).start();
    }, data.delay);
  }, []);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: data.reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'] });

  const IconComponent = data.Component;

  return (
    <Animated.View 
      style={{
        position: 'absolute',
        top: data.top,
        left: data.left,
        right: data.right,
        transform: [{ translateY }, { rotate }]
      }}
    >
      <IconComponent name={data.name} size={data.size} color={data.color} />
    </Animated.View>
  );
};

import { useAppDimensions } from '../hooks/useAppDimensions';

export default function EntryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useAppDimensions();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      setReady(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: Platform.OS !== 'web' })
      ]).start();
    };

    Animated.loop(
      Animated.timing(flameAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' })
    ).start();

    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        // Add a tiny extra frame delay just to ensure the browser has painted
        setTimeout(startAnimation, 50);
      });
    } else {
      const timer = setTimeout(startAnimation, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <YStack flex={1} backgroundColor="#0F2C15" overflow="hidden">
      <StatusBar barStyle="light-content" />
      
      <ImageBackground 
        source={require('../../assets/premium-bg.jpg.png')} 
        style={{ flex: 1, width: '100%', height: '100%' }}
        imageStyle={{ opacity: 0.35, resizeMode: "cover" }}
      >
        {floatingIconsData.map(data => (
          <FloatingIcon key={data.id} data={data} />
        ))}

        <Animated.View style={{ flex: 1, opacity: ready ? fadeAnim : 0, transform: [{ translateY: ready ? slideAnim : 60 }], justifyContent: 'flex-end' }}>
          
          <XStack alignItems="flex-end" marginBottom={10} paddingHorizontal={24}>
            <Text fontSize={32} fontFamily="Inter_900Black" letterSpacing={1} color={COLORS.vibrantYellow}>Safa</Text>
            <YStack alignItems="center" position="relative">
              <Animated.View style={{ 
                position: 'absolute', 
                top: Platform.OS === 'android' ? 3 : -2, 
                zIndex: 10, 
                transform: [
                  { translateX: Platform.OS === 'android' ? -2.3 : -0.5 },
                  { scaleX: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.95, 1, 0.95, 1] }) },
                  { rotate: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-3deg', '0deg', '3deg', '0deg'] }) }
                ], 
                opacity: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0.9, 1, 0.85, 1, 0.9] }) 
              }}>
                <Ionicons name="water" size={14} color="#E51A1A" />
              </Animated.View>
              <Text fontSize={32} fontFamily="Inter_900Black" color={COLORS.vibrantYellow} letterSpacing={0} marginRight={2}>ı</Text>
            </YStack>
            <Text fontSize={32} fontFamily="Inter_900Black" letterSpacing={1} color={COLORS.white}>Kart</Text>
          </XStack>

          <FlatList
            ref={flatListRef}
            data={ONBOARDING_SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={item => item.id}
            style={{ flexGrow: 0, height: 250, marginBottom: 10 }}
            getItemLayout={(data, index) => (
              {length: width, offset: width * index, index}
            )}
            renderItem={({ item }) => (
              <YStack width={width} paddingHorizontal={24} paddingBottom={0}>
                <Text fontSize={56} fontFamily="Inter_900Black" color={COLORS.white} letterSpacing={2} lineHeight={60} marginBottom={20}>
                  {item.title}
                </Text>

                <Text fontSize={16} color="rgba(255,255,255,0.6)" fontFamily="Inter_500Medium" lineHeight={24} marginBottom={10} maxWidth="90%">
                  {item.subtitle}
                </Text>
              </YStack>
            )}
          />

          <YStack paddingHorizontal={24} style={{ paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <XStack marginBottom={30}>
              {ONBOARDING_SLIDES.map((_, index) => (
                <YStack 
                  key={index} 
                  height={8}
                  width={currentIndex === index ? 24 : 8}
                  borderRadius={4}
                  marginRight={8}
                  backgroundColor={currentIndex === index ? COLORS.vibrantYellow : 'rgba(255,255,255,0.3)'}
                />
              ))}
            </XStack>

            <AnimatedPressable style={{ backgroundColor: COLORS.vibrantYellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 12 }} onPress={handleNext}>
              <Text fontSize={16} fontFamily="Inter_900Black" color={COLORS.black} letterSpacing={2}>{ONBOARDING_SLIDES[currentIndex].buttonText}</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.black} style={{ marginLeft: 8 }} />
            </AnimatedPressable>
          </YStack>

        </Animated.View>
      </ImageBackground>
    </YStack>
  );
}
