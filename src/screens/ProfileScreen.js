import React from 'react';
import { ScrollView, TouchableOpacity, Image, ImageBackground, Alert } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../components/Stacks';




import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../constants/theme';
import Header from '../components/Header';

const menuItems = [
  { id: '1', title: 'My Addresses', icon: 'location', tint: '#E8F5E9' },
  { id: '2', title: 'Payment Methods', icon: 'card', tint: '#E3F2FD' },
  { id: '3', title: 'Coupons & Offers', icon: 'gift', tint: '#FFF3E0' },
  { id: '4', title: 'Help & Support', icon: 'headset', tint: '#F3E5F5' },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const handleMenuPress = (item) => {
    navigation.navigate('SubScreen', { title: item.title });
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of SafaiKart?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => console.log('User logged out') }
      ]
    );
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity key={item.id} onPress={() => handleMenuPress(item)}>
      <XStack alignItems="center" paddingVertical={12} borderBottomWidth={1} borderBottomColor="#F5F5F5">
        <YStack width={38} height={38} borderRadius={19} justifyContent="center" alignItems="center" marginRight={16} backgroundColor={item.tint}>
          <Ionicons name={item.icon} size={20} color={COLORS.darkGreen} />
        </YStack>
        <Text flex={1} fontSize={15} color={COLORS.black} fontWeight="600">{item.title}</Text>
        <Ionicons name="chevron-forward" size={18} color={'#BDBDBD'} />
      </XStack>
    </TouchableOpacity>
  );

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <Header />
      <ScrollView contentContainerStyle={{ padding: SIZES.padding }} showsVerticalScrollIndicator={false}>
        <Text fontSize={20} fontWeight="900" color={COLORS.darkGreen} marginBottom={SIZES.padding} letterSpacing={0.5}>MY PROFILE</Text>

        {/* Premium User Card */}
        <YStack
          borderRadius={SIZES.radius * 1.5} 
          marginBottom={SIZES.padding * 1.5} 
          elevation={8} 
          shadowColor={COLORS.vibrantYellow} 
          shadowOffset={{ width: 0, height: 0 }} 
          shadowOpacity={0.6} 
          shadowRadius={12}
        >
        <ImageBackground 
          source={require('../../assets/premium-bg.jpg.png')} 
          style={{ backgroundColor: '#1B3B22', borderRadius: SIZES.radius * 1.5, overflow: 'hidden' }} 
          imageStyle={{ borderRadius: SIZES.radius * 1.5, width: '102%', left: '-1%' }}
        >
          <XStack padding={SIZES.padding} backgroundColor="rgba(0,0,0,0.1)">
            <YStack marginRight={20} position="relative">
               <Image source={{ uri: 'https://i.pravatar.cc/150?img=47' }} style={{ width: 75, height: 75, borderRadius: 37.5, borderWidth: 2, borderColor: '#D4AF37' }} />
               <XStack alignItems="center" backgroundColor="#D4AF37" paddingVertical={4} paddingHorizontal={8} borderRadius={12} position="absolute" bottom={-5} left={10} elevation={4} shadowColor="#000" shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.3} shadowRadius={3}>
                 <Ionicons name="medal" size={12} color={COLORS.black} />
                 <Text fontSize={9} fontWeight="900" color={COLORS.black} marginLeft={4} letterSpacing={0.5}>GOLD</Text>
               </XStack>
            </YStack>
            <YStack flex={1} justifyContent="center">
              <Text fontSize={22} fontWeight="900" color={COLORS.white} marginBottom={6} letterSpacing={0.5}>Sarah Johnson</Text>
              <Text fontSize={13} color="rgba(255,255,255,0.7)" marginBottom={2} fontWeight="500">+91 9876543210</Text>
              <Text fontSize={13} color="rgba(255,255,255,0.7)" marginBottom={2} fontWeight="500">sarah.j@example.com</Text>
            </YStack>
          </XStack>
        </ImageBackground>
        </YStack>

        {/* Settings section */}
        <Text fontSize={14} fontWeight="800" color={COLORS.textSecondary} marginBottom={12} letterSpacing={0.5} textTransform="uppercase">Settings</Text>
        
        <YStack backgroundColor={COLORS.cardBg} borderRadius={SIZES.radius * 1.5} paddingHorizontal={16} paddingVertical={8} elevation={8} shadowColor={COLORS.vibrantYellow} shadowOffset={{ width: 0, height: 0 }} shadowOpacity={0.6} shadowRadius={12} marginBottom={SIZES.padding} borderWidth={1} borderColor="rgba(0,0,0,0.02)">
          {menuItems.map(renderMenuItem)}
        </YStack>

        {/* Logout section */}
        <YStack backgroundColor={COLORS.cardBg} borderRadius={SIZES.radius * 1.5} paddingHorizontal={16} paddingVertical={8} elevation={8} shadowColor={COLORS.vibrantYellow} shadowOffset={{ width: 0, height: 0 }} shadowOpacity={0.6} shadowRadius={12} borderWidth={1} borderColor="#FFEBEE">
          <TouchableOpacity onPress={handleLogout}>
            <XStack alignItems="center" paddingVertical={12} borderBottomWidth={0}>
              <YStack width={38} height={38} borderRadius={19} justifyContent="center" alignItems="center" marginRight={16} backgroundColor="#FFEBEE">
                <Ionicons name="log-out" size={20} color="#D32F2F" />
              </YStack>
              <Text flex={1} fontSize={15} color="#D32F2F" fontWeight="600">Log Out</Text>
            </XStack>
          </TouchableOpacity>
        </YStack>

        {/* Padding for sticky cart */}
        <YStack height={100 + insets.bottom} />
      </ScrollView>
    </YStack>
  );
}
