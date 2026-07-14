import React, { useEffect, useRef, useState } from 'react';
import { Animated, StatusBar, ImageBackground, Platform, View, StyleSheet, Easing, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDimensions } from '../../../../shared/hooks/useAppDimensions';

const ANIMATIONS_ENABLED = true;

const floatingIconsData = [
  // Top Zone
  { id: 1, name: 'iron', Component: MaterialCommunityIcons, size: 70, color: 'rgba(255,255,255,0.25)', delay: 0, top: '6%', left: '8%', spinDuration: 25000, floatDuration: 4000, reverse: false },
  { id: 2, name: 'sofa', Component: MaterialCommunityIcons, size: 60, color: 'rgba(255,255,255,0.2)', delay: 1000, top: '12%', right: '12%', spinDuration: 20000, floatDuration: 3500, reverse: true },
  { id: 5, name: 'basket', Component: MaterialCommunityIcons, size: 50, color: 'rgba(242, 201, 76, 0.25)', delay: 1500, top: '4%', left: '40%', spinDuration: 22000, floatDuration: 4200, reverse: false },
  { id: 6, name: 'spray-bottle', Component: MaterialCommunityIcons, size: 45, color: 'rgba(255,255,255,0.15)', delay: 500, top: '8%', right: '40%', spinDuration: 18000, floatDuration: 3200, reverse: true },
  // Bottom Zone
  { id: 3, name: 'hanger', Component: MaterialCommunityIcons, size: 80, color: 'rgba(242, 201, 76, 0.35)', delay: 2000, top: '68%', left: '12%', spinDuration: 30000, floatDuration: 5000, reverse: false },
  { id: 4, name: 'tshirt-crew', Component: MaterialCommunityIcons, size: 65, color: 'rgba(255,255,255,0.25)', delay: 800, top: '74%', right: '10%', spinDuration: 22000, floatDuration: 4500, reverse: true },
  { id: 7, name: 'washing-machine', Component: MaterialCommunityIcons, size: 55, color: 'rgba(255,255,255,0.2)', delay: 2500, top: '80%', left: '35%', spinDuration: 26000, floatDuration: 3800, reverse: false },
  { id: 8, name: 'rug', Component: MaterialCommunityIcons, size: 50, color: 'rgba(242, 201, 76, 0.2)', delay: 1200, top: '66%', right: '35%', spinDuration: 24000, floatDuration: 4100, reverse: true },
];

const FloatingIcon = ({ data }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const swayXAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ANIMATIONS_ENABLED) return;
    setTimeout(() => {
      // Y-axis float
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: 1, duration: data.floatDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: data.floatDuration, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
      ).start();

      // X-axis drift (different duration for complex curve)
      Animated.loop(
        Animated.sequence([
          Animated.timing(swayXAnim, { toValue: 1, duration: data.floatDuration * 1.35, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(swayXAnim, { toValue: 0, duration: data.floatDuration * 1.35, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
      ).start();

      // Rotation sway
      Animated.loop(
        Animated.sequence([
          Animated.timing(spinAnim, { toValue: 1, duration: data.spinDuration / 4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(spinAnim, { toValue: 0, duration: data.spinDuration / 4, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
      ).start();
    }, data.delay);
  }, []);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
  const translateX = swayXAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const scale = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: data.reverse ? ['-15deg', '15deg'] : ['15deg', '-15deg'] });

  const IconComponent = data.Component;

  if (!ANIMATIONS_ENABLED) return null;

  return (
    <Animated.View 
      style={{
        position: 'absolute',
        top: data.top,
        left: data.left,
        right: data.right,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }]
      }}
    >
      <IconComponent name={data.name} size={data.size} color={data.color} />
    </Animated.View>
  );
};

const AnimatedCard = ({ title, subtitle, icon, delay, width = 120 }: any) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Start immediately without delay so it is never static
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web'
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1500, useNativeDriver: Platform.OS !== 'web' })
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={{ width, marginVertical: 8, marginHorizontal: '1.5%', height: 130, elevation: 8, shadowColor: COLORS.vibrantYellow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12 }}>
      <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <Animated.View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: COLORS.vibrantYellow,
          opacity: pulseAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0.15, 0.6] })
        }} />

        <Animated.View style={{
          position: 'absolute',
          top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
          transform: [{ rotate: spin }]
        }}>
          {/* We place the bright white core exactly at 0.5 so it intersects the borders! */}
          <LinearGradient
            colors={['transparent', 'rgba(244,199,62,0.1)', COLORS.vibrantYellow, '#FFF', COLORS.vibrantYellow, 'rgba(244,199,62,0.1)', 'transparent']}
            locations={[0, 0.4, 0.48, 0.5, 0.52, 0.6, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
        
        <View style={{
          position: 'absolute',
          top: 2, left: 2, right: 2, bottom: 2,
          backgroundColor: '#0F2C15',
          borderRadius: 10,
          alignItems: 'center',
          padding: 6,
          justifyContent: 'center'
        }}>
          <MaterialCommunityIcons name={icon} size={28} color={COLORS.vibrantYellow} style={{ marginBottom: 6 }} />
          <Text fontSize={12} fontFamily="Inter_900Black" color={COLORS.white} textAlign="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</Text>
          <Text fontSize={10} fontFamily="Inter_500Medium" color="rgba(255,255,255,0.7)" textAlign="center" marginTop={4} lineHeight={14}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
};

export default function EntryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useAppDimensions();
  const [ready, setReady] = useState(false);

  const handleNext = () => {
    navigation.navigate('PhoneLogin');
  };

  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ANIMATIONS_ENABLED) {
      setReady(true);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    const startAnimation = () => {
      setReady(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: Platform.OS !== 'web' })
      ]).start();
    };

    if (ANIMATIONS_ENABLED) {
      Animated.loop(
        Animated.timing(flameAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' })
      ).start();
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
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
        source={require('../../../../../assets/premium-bg.jpg.png')} 
        style={{ flex: 1, width: '100%', height: '100%' }}
        imageStyle={{ opacity: 0.35, resizeMode: "cover" }}
      >
        {/* floatingIconsData.map(data => (
          <FloatingIcon key={data.id} data={data} />
        )) */}

        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24 }}>
          
          <YStack alignItems="center" marginBottom={40}>
            {/* Title */}
            <XStack alignItems="flex-end" marginBottom={0} paddingHorizontal={24} style={styles.titleContainer}>
              <Text fontSize={64} fontFamily="Inter_900Black" letterSpacing={1} color={COLORS.vibrantYellow} style={styles.shinyText}>Safa</Text>
              <YStack alignItems="center" position="relative">
                <Animated.View style={{ 
                  position: 'absolute', 
                  top: Platform.OS === 'android' ? 7 : -5, 
                  zIndex: 10, 
                  transform: [
                    { translateX: Platform.OS === 'android' ? -4.5 : -1.5 },
                    { scaleX: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.95, 1, 0.95, 1] }) },
                    { rotate: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-3deg', '0deg', '3deg', '0deg'] }) }
                  ], 
                  opacity: flameAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0.9, 1, 0.85, 1, 0.9] }) 
                }}>
                  <Ionicons name="water" size={28} color="#E51A1A" />
                </Animated.View>
                <Text fontSize={64} fontFamily="Inter_900Black" color={COLORS.vibrantYellow} letterSpacing={0} marginRight={2} style={styles.shinyText}>ı</Text>
              </YStack>
              <Text fontSize={64} fontFamily="Inter_900Black" letterSpacing={1} color={COLORS.white} style={styles.shinyText}>Kart</Text>
            </XStack>

            {/* Subtitle */}
            <Text fontSize={28} fontFamily="Inter_900Black" color={COLORS.white} marginTop={16} textAlign="center" letterSpacing={0.5} lineHeight={36}>
              PREMIUM SERVICES.{'\n'}24-HOUR LAUNDRY DELIVERY.
            </Text>

            {/* Services Cards */}
            <XStack marginTop={40} width="100%" flexWrap="wrap" justifyContent="center">
              <AnimatedCard 
                title="Laundry" 
                subtitle="Wash & Fold. Delivered." 
                icon="washing-machine" 
                delay={0} 
                width="30%"
              />
              <AnimatedCard 
                title="Drycleaning" 
                subtitle="Premium fabric care." 
                icon="hanger" 
                delay={1000} 
                width="30%"
              />
              <AnimatedCard 
                title="Sofa Cleaning" 
                subtitle="Stain & Odor Removal." 
                icon="sofa" 
                delay={2000} 
                width="30%"
              />
              <AnimatedCard 
                title="Carpet Cleaning" 
                subtitle="Deep dust extraction." 
                icon="rug" 
                delay={3000} 
                width="30%"
              />
              <AnimatedCard 
                title="Steam Press" 
                subtitle="Crisp & wrinkle-free." 
                icon="iron" 
                delay={4000} 
                width="30%"
              />
            </XStack>
          </YStack>

        </View>

        <View>
          <YStack paddingHorizontal={24} style={{ paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <AnimatedPressable 
              style={[
                styles.shinyButton, 
                { backgroundColor: COLORS.vibrantYellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, borderRadius: 16 }
              ]} 
              onPress={handleNext}
            >
              <Text fontSize={22} fontFamily="Inter_900Black" color={COLORS.black} letterSpacing={1}>Get Started</Text>
            </AnimatedPressable>
          </YStack>
        </View>
      </ImageBackground>
    </YStack>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shinyText: {
    textShadowColor: 'rgba(244, 199, 62, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  shinyButton: {
    shadowColor: COLORS.vibrantYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  }
});
