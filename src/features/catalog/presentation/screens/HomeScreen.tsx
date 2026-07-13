import React, { useRef, useEffect, useState } from 'react';
import { ScrollView, Animated, ImageBackground, TextInput, FlatList, TouchableOpacity, Platform, Easing, useWindowDimensions } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import Header from '../../../../shared/ui/components/Header';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import StickyCart from '../../../../features/cart/presentation/components/StickyCart';
import NotificationModal from '../../../../shared/ui/feedback/NotificationModal';
import { useCart } from '../../../../features/cart/presentation/hooks/useCart';
import { useCategoriesQuery, useServicesQuery } from '../../application/useServicesQuery';
import * as Haptics from 'expo-haptics';

const CATEGORIES = [
  { name: "All", icon: "view-grid-outline" },
  { name: "Clothing", icon: "tshirt-crew-outline" },
  { name: "Footwear", icon: "shoe-sneaker" },
  { name: "Bags", icon: "bag-personal-outline" },
  { name: "Home", icon: "home-outline" },
  { name: "Premium", icon: "star-outline" }
];

const services = [
  { id: '1', title: 'Daily Laundry', category: 'LAUNDRY', time: '1-2 DAY', img: require('../../../../../assets/laundry_basket.png'), icon: 'washing-machine', chipCategories: ['Clothing'] },
  { id: '2', title: 'Luxury Garment Care', category: 'DRY CLEANING', time: '1-2 DAY', img: require('../../../../../assets/dry_cleaning_suit.png'), icon: 'hanger', chipCategories: ['Clothing'] },
  { id: '3', title: 'Footwear Revival', category: 'SHOE CLEANING', time: '1-2 DAY', img: require('../../../../../assets/shoe_cleaning.png'), icon: 'shoe-sneaker', chipCategories: ['Footwear'] },
  { id: '4', title: 'Fabric Finishing', category: 'STEAM PRESS', time: '1-2 DAY', img: require('../../../../../assets/steam_press.png'), icon: 'iron', chipCategories: ['Clothing'] },
  { id: '5', title: 'Home Textiles', category: 'SOFA CLEANING', time: '1-2 DAY', img: require('../../../../../assets/sofa_cleaning.png'), icon: 'sofa', chipCategories: ['Home'] },
  { id: '6', title: 'Specialist Items', category: 'LUXURY CARE', time: '1-2 DAY', img: require('../../../../../assets/luxury_care.png'), icon: 'star', chipCategories: ['Premium', 'Bags'] },
];

const OFFERS = [
  {
    id: '1',
    title: 'SAVE 20%',
    subtitle: 'FIRST-TIME\nCLIENTS WELCOME',
    img: require('../../../../../assets/20percentoff.jpg.png'),
    btnText: 'GET CODE'
  },
  {
    id: '2',
    title: 'WINTER CARE',
    subtitle: 'PREMIUM\nJACKET WASH',
    img: { uri: 'https://picsum.photos/id/1025/600/300' }, // Reliable dog in blanket/winter vibe image
    btnText: 'VIEW OFFER'
  },
  {
    id: '3',
    title: 'FLAT ₹150 OFF',
    subtitle: 'ON MINIMUM\nORDER OF ₹500',
    img: require('../../../../../assets/discount_banner_bg.png'),
    btnText: 'CLAIM NOW'
  }
];

const AnimatedServiceIcon = ({ iconName }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  
  // Assign a unique animation perfectly suited to each specific icon
  const animType = (() => {
    if (iconName === 'washing-machine') return 'spin';
    if (iconName === 'iron') return 'glide';
    if (iconName === 'shoe-sneaker') return 'bounce';
    if (iconName === 'star') return 'pulse';
    if (iconName === 'hanger') return 'float';
    return 'wobble'; // Sofa and default
  })();

  useEffect(() => {
    if (animType === 'spin') {
      // Realistic washing machine "Spin Cycle" vibration
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
          Animated.delay(1500)
        ])
      ).start();
    } else if (animType === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    } else if (animType === 'float') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
      ).start();
    } else if (animType === 'wobble') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: -1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(1000)
        ])
      ).start();
    } else if (animType === 'glide') {
      // Iron gliding back and forth
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: -1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else if (animType === 'bounce') {
      // Shoe Tapping Toe!
      Animated.loop(
        Animated.sequence([
          // Tap 1 (Toe goes up, then strikes down)
          Animated.timing(animValue, { toValue: -1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          // Tap 2
          Animated.timing(animValue, { toValue: -1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          // Pause between beats
          Animated.delay(1500)
        ])
      ).start();
    }
  }, [animType]);

  // Apply the specific transform based on the assigned type
  let transform = [];
  if (animType === 'spin') {
    transform.push({ translateX: animValue.interpolate({ inputRange: [-1, 1], outputRange: [-2, 2] }) });
    transform.push({ rotate: animValue.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }) });
  } else if (animType === 'pulse') {
    transform.push({ scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) });
  } else if (animType === 'float') {
    transform.push({ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) });
  } else if (animType === 'wobble') {
    transform.push({ rotate: animValue.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '15deg'] }) });
  } else if (animType === 'glide') {
    transform.push({ translateX: animValue.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) });
  } else if (animType === 'bounce') {
    // Tapping Toe: Rotate the toe up (-25deg) and adjust X/Y to fake a heel pivot point
    transform.push({
      rotate: animValue.interpolate({
        inputRange: [-1, 0],
        outputRange: ['-25deg', '0deg']
      })
    });
    transform.push({
      translateX: animValue.interpolate({
        inputRange: [-1, 0],
        outputRange: [2, 0]
      })
    });
    transform.push({
      translateY: animValue.interpolate({
        inputRange: [-1, 0],
        outputRange: [-2, 0]
      })
    });
  }

  return (
    <Animated.View style={{ transform }}>
      <MaterialCommunityIcons name={iconName} size={22} color={COLORS.white} />
    </Animated.View>
  );
};

export default function HomeScreen({ navigation }) {
  const { totalItems } = useCart();
  const { data: remoteCategories, isLoading: isCategoriesLoading } = useCategoriesQuery();
  const { data: remoteServices, isLoading: isServicesLoading } = useServicesQuery();

  const finalCategories = remoteCategories && remoteCategories.length > 0 
    ? [{ name: "All", icon: "view-grid-outline" }, ...remoteCategories.map(c => ({ name: c.name, icon: c.icon }))] 
    : CATEGORIES;

  const finalServices = remoteServices && remoteServices.length > 0 
    ? remoteServices.map(s => ({
        id: s.id,
        title: s.name,
        category: remoteCategories?.find(c => c.id === s.categoryId)?.name?.toUpperCase() || 'SERVICE',
        time: `${Math.round(s.estimatedDurationHours / 24)} DAY`,
        img: s.imageUrl ? { uri: s.imageUrl } : require('../../../../../assets/laundry_basket.png'),
        icon: 'washing-machine', // Can map category id to icon in future
        chipCategories: [remoteCategories?.find(c => c.id === s.categoryId)?.name || 'All'],
        price: s.priceMinor ? s.priceMinor / 100 : 0,
        priceMinor: s.priceMinor
      }))
    : services;

  const { width } = useWindowDimensions();
  const [activeCategory, setActiveCategory] = useState("All");
  const [notifVisible, setNotifVisible] = useState(false);
  const flatListRef = useRef(null);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);

  useEffect(() => {
    // 4-second auto-swipe logic
    const timer = setInterval(() => {
      let nextIndex = currentOfferIndex + 1;
      if (nextIndex >= OFFERS.length) {
        nextIndex = 0;
      }
      setCurrentOfferIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [currentOfferIndex]);

  const renderServiceCard = ({ item, index }) => (
    <YStack 
      opacity={1} y={0}
      width="48%"
      marginBottom={16}
    >
      <AnimatedPressable onPress={() => navigation.navigate('ServiceDetails', { service: item })}>
        <YStack
          borderRadius={14} 
          elevation={8} 
          shadowColor={COLORS.vibrantYellow} 
          shadowOffset={{ width: 0, height: 0 }} 
          shadowOpacity={0.6} 
          shadowRadius={12}
          bg={COLORS.white} 
        >
          <YStack borderRadius={14} overflow="hidden" borderWidth={1} borderColor="#F0F0F0">
            {/* Top Half: Image */}
            <ImageBackground 
            source={item.img} 
            style={{ width: '100%', height: 160 }}
            imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          >
            <YStack py="$1" px="$2" ai="center" bg="rgba(27,59,34,0.4)">
              <Text fontSize={12} fontWeight="bold" color={COLORS.white} textAlign="center" textShadowColor="rgba(0,0,0,0.75)" textShadowOffset={{ width: -1, height: 1 }} textShadowRadius={10}>
                {item.title}
              </Text>
              {item.id === '1' && <Text fontSize={9} color={COLORS.white} mt={0}>10+ item list</Text>}
            </YStack>
          </ImageBackground>
          
          {/* Bottom Half: White Info Section */}
          <XStack p={6} ai="center">
            {/* Left Icon */}
            <YStack bg={COLORS.darkGreen} w={38} h={38} borderRadius={10} jc="center" ai="center">
              <AnimatedServiceIcon iconName={item.icon} />
            </YStack>
            
            {/* Middle Text */}
            <YStack f={1} ml={8} mr={4} jc="center">
              <Text fontSize={11} fontFamily="Inter_900Black" color={COLORS.black} numberOfLines={1}>{item.category}</Text>
              <Text fontSize={9} fontFamily="Inter_500Medium" color={COLORS.textSecondary} mt={2}>Est. Time: {item.time}</Text>
            </YStack>

            {/* Right Button */}
            <YStack bg={COLORS.vibrantYellow} w={28} h={28} borderRadius={8} jc="center" ai="center">
              <Ionicons name="add" size={18} color={COLORS.black} />
            </YStack>
          </XStack>
          </YStack>
        </YStack>
      </AnimatedPressable>
    </YStack>
  );

  return (
    <YStack f={1} bg={COLORS.primaryBg}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Header />
        <YStack px={SIZES.padding} pt={15}>
        
        {/* Search Bar & Notifications */}
        <XStack mb={12} ai="center">
          <XStack f={1} h={48} bg={COLORS.cardBg} borderRadius={24} borderWidth={1} borderColor={COLORS.black} px={20} ai="center" elevation={2} shadowColor={COLORS.cardShadow} shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.05} shadowRadius={4} mr={15}>
            <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
            <TextInput 
              placeholder="Search for a service..."
              placeholderTextColor={COLORS.textSecondary}
              style={{ flex: 1, marginLeft: 10, fontSize: 14, color: COLORS.black, outlineStyle: 'none' } as any} // }}
            />
          </XStack>
          
          <AnimatedPressable onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setNotifVisible(true);
          }} style={{ position: 'relative', backgroundColor: COLORS.cardBg, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, elevation: 2, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
            <Ionicons name="notifications" size={22} color={COLORS.darkGreen} />
            <YStack position="absolute" top={10} right={12} backgroundColor="#D92D20" borderRadius={6} width={10} height={10} justifyContent="center" alignItems="center" borderWidth={1.5} borderColor={COLORS.white} />
          </AnimatedPressable>
        </XStack>

        {/* Category Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, paddingBottom: 4 }}>
          <XStack>
            {finalCategories.map((cat, i) => {
              const isActive = activeCategory === cat.name;
              return (
                  <AnimatedPressable 
                  key={i}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(cat.name);
                  }}
                  style={{
                    backgroundColor: isActive ? COLORS.darkGreen : COLORS.cardBg,
                    paddingHorizontal: 16,
                    height: 40,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 20,
                    marginRight: 10,
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.darkGreen : '#E5E5E5',
                    elevation: isActive ? 2 : 1,
                    shadowColor: COLORS.cardShadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}
                >
                  <MaterialCommunityIcons 
                    name={cat.icon as any} 
                    size={18} 
                    color={isActive ? COLORS.white : COLORS.darkGreen} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text color={isActive ? COLORS.white : COLORS.black} fontWeight={isActive ? "bold" : "600"} fontSize={13}>
                    {cat.name}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </XStack>
        </ScrollView>

        <YStack 
          marginBottom={SIZES.padding}
          onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
        >
          {carouselWidth > 0 && (
            <FlatList
              ref={flatListRef}
              data={OFFERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToAlignment="start"
              decelerationRate="fast"
              keyExtractor={item => item.id}
              getItemLayout={(data, index) => (
                {length: carouselWidth, offset: carouselWidth * index, index}
              )}
              renderItem={({ item }) => (
                <YStack 
                  width={carouselWidth} 
                  borderRadius={SIZES.radius * 1.5} 
                  bg="#1E3120" 
                  elevation={8} 
                  shadowColor={COLORS.vibrantYellow} 
                  shadowOffset={{ width: 0, height: 0 }} 
                  shadowOpacity={0.6} 
                  shadowRadius={12}
                >
                  <YStack borderRadius={SIZES.radius * 1.5} overflow="hidden" flex={1}>
                    <ImageBackground 
                    source={item.img} 
                    style={{ width: '100%', height: 160 }} 
                    resizeMode="cover"
                    imageStyle={{ borderRadius: SIZES.radius * 1.5 }}
                  >
                    <LinearGradient
                      colors={['rgba(27,59,34,0.95)', 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: SIZES.radius * 1.5 }}
                    />
                    <YStack f={1} bg="rgba(27,59,34,0.15)" borderRadius={SIZES.radius * 1.5} p={20} jc="center" zIndex={5}>
                      <YStack w="70%">
                        <Text color={COLORS.white} fontSize={12} fontWeight="bold" mb="$1" letterSpacing={0.5}>
                          {item.subtitle}
                        </Text>
                        <Text color={COLORS.white} fontSize={30} fontWeight="900" mb="$3">
                          {item.title}
                        </Text>
                        <AnimatedPressable 
                          onPress={() => alert(`Discount Code ${item.btnText === 'GET CODE' ? 'SAVE20' : ''} applied to your account!`)}
                          style={{ borderWidth: 1, borderColor: '#F2C94C', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start', backgroundColor: '#D4AF37' }}
                        >
                          <Text color={COLORS.black} fontWeight="bold" fontSize={12}>{item.btnText}</Text>
                        </AnimatedPressable>
                      </YStack>
                    </YStack>
                  </ImageBackground>
                  </YStack>
                </YStack>
              )}
            />
          )}
        </YStack>

        {/* Services Grid */}
        <XStack fw="wrap" jc="space-between">
          {finalServices
            .filter(item => activeCategory === 'All' || item.chipCategories?.includes(activeCategory))
            .map((item, index) => (
            <React.Fragment key={item.id}>
              {renderServiceCard({ item, index })}
            </React.Fragment>
          ))}
        </XStack>
        
        {/* Padding for sticky cart and floating taskbar */}
        <YStack h={180} />
        </YStack>
      </ScrollView>
      {totalItems > 0 ? <StickyCart /> : null}
      <NotificationModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </YStack>
  );
}
