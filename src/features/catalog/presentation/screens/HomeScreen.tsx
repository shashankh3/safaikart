import React, { useRef, useEffect, useState } from 'react';
import { ScrollView, Animated, ImageBackground, TextInput, FlatList, TouchableOpacity, Platform, Easing, useWindowDimensions, ActivityIndicator } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import Header from '../../../../shared/ui/components/Header';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import StickyCart from '../../../../features/cart/presentation/components/StickyCart';

import { useCart } from '../../../../features/cart/presentation/hooks/useCart';
import { useCatalogV2Query } from '../../application/useServicesQuery';
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
  { id: '1', title: 'Everyday Dry Cleaning', category: 'LAUNDRY', time: '1-2 DAY', img: require('../../../../../assets/laundry_basket.png'), icon: 'washing-machine', chipCategories: ['Clothing'] },
  { id: '2', title: 'Luxury & Ethnic Wear', category: 'DRY CLEANING', time: '1-2 DAY', img: require('../../../../../assets/dry_cleaning_suit.png'), icon: 'hanger', chipCategories: ['Clothing', 'Premium'] },
  { id: '3', title: 'Shoe Cleaning', category: 'SHOE CLEANING', time: '1-2 DAY', img: require('../../../../../assets/shoe_cleaning.png'), icon: 'shoe-sneaker', chipCategories: ['Footwear'] },
  { id: '4', title: 'Steam Press', category: 'STEAM PRESS', time: '1-2 DAY', img: require('../../../../../assets/steam_press.png'), icon: 'iron', chipCategories: ['Clothing'] },
  { id: '5', title: 'Home Textiles', category: 'SOFA CLEANING', time: '1-2 DAY', img: require('../../../../../assets/sofa_cleaning.png'), icon: 'sofa', chipCategories: ['Home'] },
  { id: '6', title: 'Winter & Outerwear', category: 'WINTER CARE', time: '1-2 DAY', img: require('../../../../../assets/luxury_care.png'), icon: 'star', chipCategories: ['Premium', 'Clothing'] },
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
    img: require('../../../../../assets/premium-bg.jpg.png'),
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
  const { totalItems, clearCart } = useCart();
  const { data: catalogV2, isLoading: isCatalogLoading, error: catalogError, refetch: refetchCatalog } = useCatalogV2Query();
  
  if (catalogError) console.error('Catalog query ERROR:', catalogError);

  const finalCategories = CATEGORIES;
  const realServices = catalogV2?.services || [];

  // Create a mapping of UI metadata (icons, images, colors) for specific service names
  const UIMetaMapping: Record<string, any> = {
    'Everyday Dry Cleaning': { img: require('../../../../../assets/laundry_basket.png'), icon: 'washing-machine', chipCategories: ['Clothing'] },
    'Luxury & Ethnic Wear': { img: require('../../../../../assets/dry_cleaning_suit.png'), icon: 'hanger', chipCategories: ['Clothing', 'Premium'] },
    'Shoe Cleaning': { img: require('../../../../../assets/shoe_cleaning.png'), icon: 'shoe-sneaker', chipCategories: ['Footwear'] },
    'Steam Press': { img: require('../../../../../assets/steam_press.png'), icon: 'iron', chipCategories: ['Clothing'] },
    'Home Textiles': { img: require('../../../../../assets/sofa_cleaning.png'), icon: 'sofa', chipCategories: ['Home'] },
    'Winter & Outerwear': { img: require('../../../../../assets/luxury_care.png'), icon: 'star', chipCategories: ['Premium', 'Clothing'] },
    // Fallbacks for the 3 current services in the old JSON if the names don't perfectly match yet
    'Dry Cleaning': { img: require('../../../../../assets/laundry_basket.png'), icon: 'washing-machine', chipCategories: ['Clothing'] }
  };
  
  const finalServices = realServices && realServices.length > 0 
    ? realServices.map((s) => {
        const defaultMeta = { img: require('../../../../../assets/laundry_basket.png'), icon: 'star', chipCategories: ['General'] };
        const meta = UIMetaMapping[s.name || ''] || defaultMeta;
        return {
          id: s.id,
          title: s.name,
          category: (s.categoryId || s.name || '').toUpperCase(),
          time: s.estimatedDuration || '1-2 DAY',
          img: s.imageUrl ? { uri: s.imageUrl } : meta.img,
          icon: s.iconName || meta.icon,
          chipCategories: s.chipCategories || meta.chipCategories,
          price: s.priceMinor ? s.priceMinor / 100 : 0
        };
      })
    : services;
  const { width } = useWindowDimensions();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const flatListRef = useRef(null);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);

  const filteredServices = finalServices && finalServices.length > 0 
    ? finalServices.filter((item: any) => {
        const matchesCategory = activeCategory === 'All' || item.chipCategories?.includes(activeCategory);
        const query = searchQuery.trim().toLowerCase();
        if (!query) return matchesCategory;
        const matchesSearch = 
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.category && item.category.toLowerCase().includes(query));
        return matchesCategory && matchesSearch;
      })
    : [];

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



  const renderServiceCard = ({ item, index }: { item: any; index: number }) => (
    <YStack 
      opacity={1} y={0}
      width="48%"
      marginBottom={16}
    >
      <AnimatedPressable onPress={() => navigation.navigate('ServiceDetails', { service: item })}>
        <YStack
          borderRadius={16} 
          elevation={3} 
          shadowColor="#000" 
          shadowOffset={{ width: 0, height: 2 }} 
          shadowOpacity={0.1} 
          shadowRadius={6}
          bg={COLORS.white} 
        >
          <YStack borderRadius={16} overflow="hidden" borderWidth={1} borderColor="#F3F4F6">
            {/* Top Half: Image */}
            <ImageBackground 
              source={item.img} 
              style={{ width: '100%', height: 160 }}
              imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            >
              <YStack f={1} jc="center" ai="center" bg="rgba(15, 48, 31, 0.4)" px={12}>
                <Text 
                  fontSize={16} 
                  fontWeight="bold" 
                  color={COLORS.white} 
                  textAlign="center" 
                  textShadowColor="rgba(0,0,0,0.6)" 
                  textShadowOffset={{ width: 0, height: 2 }} 
                  textShadowRadius={4}
                  numberOfLines={2}
                  lineHeight={22}
                >
                  {item.title}
                </Text>
              </YStack>
            </ImageBackground>
            
            {/* Bottom Half: White Info Section */}
            <XStack px={10} py={12} ai="center" jc="space-between">
              <XStack ai="center" f={1} mr={6}>
                {/* Left Icon */}
                <YStack bg={COLORS.darkGreen} w={36} h={36} borderRadius={10} jc="center" ai="center" flexShrink={0}>
                  <AnimatedServiceIcon iconName={item.icon} />
                </YStack>
                
                {/* Middle Text */}
                <YStack ml={8} jc="center" f={1}>
                  <Text fontSize={11} fontWeight="bold" color={COLORS.black} letterSpacing={0.3} numberOfLines={2} lineHeight={14}>
                    {item.category}
                  </Text>
                  <Text fontSize={10} fontWeight="600" color={COLORS.textSecondary} mt={2} numberOfLines={1}>
                    Est. Time: {item.time}
                  </Text>
                </YStack>
              </XStack>

              {/* Right Button */}
              <YStack bg={COLORS.vibrantYellow} w={28} h={28} borderRadius={8} jc="center" ai="center" elevation={1} flexShrink={0}>
                <Ionicons name="add" size={18} color={COLORS.darkGreen} />
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
          <XStack f={1} h={48} bg={COLORS.cardBg} borderRadius={24} borderWidth={1} borderColor="#E5E7EB" px={16} ai="center" elevation={2} shadowColor={COLORS.cardShadow} shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.05} shadowRadius={4} mr={12}>
            <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
            <TextInput 
              placeholder="Search for a service..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, marginLeft: 10, fontSize: 14, color: COLORS.black, outlineStyle: 'none' } as any}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </XStack>
          
          <AnimatedPressable onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('NotificationCenter');
          }} style={{ position: 'relative', backgroundColor: COLORS.cardBg, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
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
        {isCatalogLoading ? (
          <YStack f={1} jc="center" ai="center" minHeight={200}>
            <ActivityIndicator size="large" color={COLORS.darkGreen} />
            <Text color={COLORS.textSecondary} marginTop={12}>Loading services...</Text>
          </YStack>
        ) : catalogError ? (
          <YStack f={1} jc="center" ai="center" minHeight={200} padding={20} backgroundColor={COLORS.cardBg} borderRadius={16} borderWidth={1} borderColor={COLORS.border}>
            <Ionicons name="alert-circle-outline" size={48} color={'#E51A1A'} />
            <Text color={COLORS.black} fontSize={16} fontWeight="bold" marginTop={12}>Oops! Something went wrong.</Text>
            <Text color={COLORS.textSecondary} fontSize={14} textAlign="center" marginTop={8}>We couldn't load the services right now. Please check your connection and try again.</Text>
            <AnimatedPressable 
              onPress={() => refetchCatalog()}
              style={{ marginTop: 20, backgroundColor: COLORS.darkGreen, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
            >
              <Text color={COLORS.white} fontWeight="bold">Retry</Text>
            </AnimatedPressable>
          </YStack>
        ) : (
          <XStack fw="wrap" jc="space-between">
            {filteredServices && filteredServices.length > 0 ? (
              filteredServices.map((item: any, index: number) => (
                <React.Fragment key={item.id}>
                  {renderServiceCard({ item, index })}
                </React.Fragment>
              ))
            ) : (
              <YStack f={1} jc="center" ai="center" py={40} w="100%">
                <Ionicons name="search-outline" size={40} color={COLORS.textSecondary} style={{ opacity: 0.4, marginBottom: 8 }} />
                <Text color={COLORS.black} fontSize={16} fontWeight="bold" ta="center">
                  No services found
                </Text>
                <Text color={COLORS.textSecondary} fontSize={13} ta="center" mt={4}>
                  {searchQuery ? `No results for "${searchQuery}"` : 'No services in this category.'}
                </Text>
              </YStack>
            )}
          </XStack>
        )}

        
        {/* Padding for sticky cart and floating taskbar */}
        <YStack h={180} />
        </YStack>
      </ScrollView>
      {totalItems > 0 ? <StickyCart /> : null}
    </YStack>
  );
}
