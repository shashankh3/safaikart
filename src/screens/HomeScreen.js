import React, { useRef, useEffect, useState } from 'react';
import { ScrollView, Animated, ImageBackground, TextInput, FlatList, TouchableOpacity, Platform } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../components/Stacks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';




import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import Header from '../components/Header';
import AnimatedPressable from '../components/AnimatedPressable';
import StickyCart from '../components/StickyCart';
import NotificationModal from '../components/NotificationModal';
import * as Haptics from 'expo-haptics';

const CATEGORIES = ["All", "Clothing", "Footwear", "Bags", "Home", "Premium"];

const services = [
  { id: '1', title: 'Daily Laundry', category: 'LAUNDRY', time: '1-2 DAY', img: require('../../assets/laundry_basket.png') },
  { id: '2', title: 'Luxury Garment Care', category: 'DRY CLEANING', time: '1-2 DAY', img: require('../../assets/dry_cleaning_suit.png') },
  { id: '3', title: 'Footwear Revival', category: 'SHOE CLEANING', time: '1-2 DAY', img: require('../../assets/shoe_cleaning.png') },
  { id: '4', title: 'Fabric Finishing', category: 'STEAM PRESS', time: '1-2 DAY', img: require('../../assets/steam_press.png') },
  { id: '5', title: 'Home Textiles', category: 'SOFA CLEANING', time: '1-2 DAY', img: require('../../assets/sofa_cleaning.png') },
  { id: '6', title: 'Specialist Items', category: 'LUXURY CARE', time: '1-2 DAY', img: require('../../assets/luxury_care.png') },
];

const OFFERS = [
  {
    id: '1',
    title: 'SAVE 20%',
    subtitle: 'FIRST-TIME\nCLIENTS WELCOME',
    img: require('../../assets/20percentoff.jpg.png'),
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
    img: require('../../assets/discount_banner_bg.png'),
    btnText: 'CLAIM NOW'
  }
];

export default function HomeScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState("Home");
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
      marginBottom={SIZES.padding}
    >
      <AnimatedPressable onPress={() => navigation.navigate('ServiceDetails', { service: item })}>
        <ImageBackground 
          source={item.img} 
          style={{ width: '100%', height: 160, borderRadius: SIZES.radius, overflow: 'hidden', elevation: 3, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4, backgroundColor: COLORS.cardBg }}
          imageStyle={{ borderRadius: SIZES.radius, width: '100%', height: '100%', resizeMode: 'cover' }}
        >
        <YStack f={1} bg="transparent" borderRadius={SIZES.radius} jc="space-between">
          <YStack py="$1" px="$2" ai="center" bg="rgba(0,0,0,0.4)" borderTopLeftRadius={SIZES.radius} borderTopRightRadius={SIZES.radius}>
            <Text fontSize={13} fontWeight="bold" color={COLORS.white} textAlign="center" textShadowColor="rgba(0,0,0,0.75)" textShadowOffset={{ width: -1, height: 1 }} textShadowRadius={10}>
              {item.title}
            </Text>
            {item.id === '1' && <Text fontSize={9} color={COLORS.white} mt={0}>10+ item list</Text>}
          </YStack>
          
          <YStack py="$1.5" px="$2" bg="rgba(0,0,0,0.5)" borderBottomLeftRadius={SIZES.radius} borderBottomRightRadius={SIZES.radius}>
            <Text fontSize={11} color={COLORS.white} fontWeight="900" textAlign="center" mb="$1" textShadowColor="rgba(0,0,0,0.75)" textShadowOffset={{ width: -1, height: 1 }} textShadowRadius={10}>
              {item.category}
            </Text>
            <XStack jc="space-between" ai="flex-end">
              <XStack bg="rgba(255,255,255,0.8)" px="$2" py="$1" borderRadius={12} ai="center">
                <Text fontSize={9} color={COLORS.black} mr="$1">Est. Time:</Text>
                <Text fontSize={10} fontWeight="bold" color={COLORS.black}>{item.time} &rarr;</Text>
              </XStack>
              <AnimatedPressable onPress={() => navigation.navigate('ServiceDetails', { service: item })} style={{ backgroundColor: COLORS.vibrantYellow, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={20} color={COLORS.black} />
              </AnimatedPressable>
            </XStack>
          </YStack>
        </YStack>
        </ImageBackground>
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
              style={{ flex: 1, marginLeft: 10, fontSize: 14, color: COLORS.black, outlineStyle: 'none' }}
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
            {CATEGORIES.map((cat, i) => {
              const isActive = activeCategory === cat;
              return (
                  <AnimatedPressable 
                  key={i}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(cat);
                  }}
                  style={{
                    backgroundColor: isActive ? COLORS.darkGreen : COLORS.cardBg,
                    paddingHorizontal: 20,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 20,
                    marginRight: 10,
                    borderWidth: 1,
                    borderColor: COLORS.black,
                    elevation: isActive ? 2 : 1,
                    shadowColor: COLORS.cardShadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}
                >
                  <Text color={isActive ? COLORS.white : COLORS.black} fontWeight={isActive ? "bold" : "600"} fontSize={13}>
                    {cat}
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
                  elevation={4} 
                  shadowColor="#000" 
                  shadowOffset={{ width: 0, height: 2 }} 
                  shadowOpacity={0.3} 
                  shadowRadius={4}
                  overflow="hidden"
                >
                  <ImageBackground 
                    source={item.img} 
                    style={{ width: '100%', height: 160 }} 
                    resizeMode="cover"
                    imageStyle={{ borderRadius: SIZES.radius * 1.5 }}
                  >
                    <LinearGradient
                      colors={['rgba(0,0,0,0.9)', 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: SIZES.radius * 1.5 }}
                    />
                    <YStack f={1} bg="rgba(0,0,0,0.15)" borderRadius={SIZES.radius * 1.5} p={20} jc="center" zIndex={5}>
                      <YStack w="70%">
                        <Text color={COLORS.white} fontSize={12} fontWeight="bold" mb="$1" letterSpacing={0.5}>
                          {item.subtitle}
                        </Text>
                        <Text color={COLORS.white} fontSize={30} fontWeight="900" mb="$3">
                          {item.title}
                        </Text>
                        <AnimatedPressable style={{ borderWidth: 1, borderColor: '#F2C94C', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start', backgroundColor: '#D4AF37' }}>
                          <Text color={COLORS.black} fontWeight="bold" fontSize={12}>{item.btnText}</Text>
                        </AnimatedPressable>
                      </YStack>
                    </YStack>
                  </ImageBackground>
                </YStack>
              )}
            />
          )}
        </YStack>

        {/* Services Grid */}
        <XStack fw="wrap" jc="space-between">
          {services.map((item, index) => (
            <React.Fragment key={item.id}>
              {renderServiceCard({ item, index })}
            </React.Fragment>
          ))}
        </XStack>
        
        {/* Padding for sticky cart and floating taskbar */}
        <YStack h={180} />
        </YStack>
      </ScrollView>
      <StickyCart />
      <NotificationModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </YStack>
  );
}
