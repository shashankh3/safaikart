import React from 'react';
import { ScrollView, TouchableOpacity, Image, ImageBackground, Alert, Linking } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../../../../shared/ui/primitives/Stacks';




import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import Header from '../../../../shared/ui/components/Header';
import { useAuth } from '../../../auth/application/useAuth';
import { useProfileQuery } from '../../application/useProfileQuery';

const menuItems = [
  { id: '0', title: 'Notifications', icon: 'notifications', tint: '#FFE0B2' },
  { id: '1', title: 'My Addresses', icon: 'location', tint: '#E8F5E9' },
  { id: '2', title: 'Payment Methods', icon: 'card', tint: '#E3F2FD' },
  { id: '3', title: 'Coupons & Offers', icon: 'gift', tint: '#FFF3E0' },
  { id: '4', title: 'Help & Support', icon: 'headset', tint: '#F3E5F5' },
];

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { logout, isAdmin } = useAuth();
  const { data: profile, isLoading } = useProfileQuery();
  const handleMenuPress = (item) => {
    if (item.title === 'Help & Support') {
      Linking.openURL('whatsapp://send?text=Hello SafaiKart! I need some help.&phone=+919691561836');
    } else if (item.title === 'Notifications') {
      navigation.navigate('NotificationCenter');
    } else if (item.title === 'My Addresses') {
      navigation.navigate('AddressList');
    } else {
      navigation.navigate('SubScreen', { title: item.title });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of SafaiKart?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => logout() }
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
          source={require('../../../../../assets/premium-bg.jpg.png')} 
          style={{ backgroundColor: '#1B3B22', borderRadius: SIZES.radius * 1.5, overflow: 'hidden' }} 
          imageStyle={{ borderRadius: SIZES.radius * 1.5, width: '102%', left: '-1%' }}
        >
          <XStack padding={SIZES.padding} backgroundColor="rgba(0,0,0,0.1)">
            <YStack marginRight={20} position="relative">
               <Image source={profile?.photoURL ? { uri: profile.photoURL } : require('../../../../../assets/soumya_profile.png')} style={{ width: 75, height: 75, borderRadius: 37.5, borderWidth: 2, borderColor: '#D4AF37' }} />
               <XStack alignItems="center" backgroundColor="#D4AF37" paddingVertical={4} paddingHorizontal={8} borderRadius={12} position="absolute" bottom={-5} left={10} elevation={4} shadowColor="#000" shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.3} shadowRadius={3}>
                 <Ionicons name="medal" size={12} color={COLORS.black} />
                 <Text fontSize={9} fontWeight="900" color={COLORS.black} marginLeft={4} letterSpacing={0.5}>GOLD</Text>
               </XStack>
            </YStack>
            <YStack flex={1} justifyContent="center">
              {isLoading ? (
                <Text fontSize={18} color="rgba(255,255,255,0.7)" marginBottom={6}>Loading...</Text>
              ) : (
                <>
                  <Text fontSize={22} fontWeight="900" color={COLORS.white} marginBottom={6} letterSpacing={0.5}>{profile?.name || profile?.displayName || 'Guest User'}</Text>
                  <Text fontSize={13} color="rgba(255,255,255,0.7)" marginBottom={2} fontWeight="500">{profile?.phoneNumber || 'No phone number'}</Text>
                  {profile?.email && <Text fontSize={13} color="rgba(255,255,255,0.7)" marginBottom={2} fontWeight="500">{profile.email}</Text>}
                </>
              )}
            </YStack>
          </XStack>
        </ImageBackground>
        </YStack>

        {/* Admin Dashboard */}
        {isAdmin && (
          <YStack marginBottom={SIZES.padding}>
            <Text fontSize={14} fontWeight="800" color="#6200EE" marginBottom={12} letterSpacing={0.5} textTransform="uppercase">Management</Text>
            <YStack backgroundColor={COLORS.cardBg} borderRadius={SIZES.radius * 1.5} paddingHorizontal={16} paddingVertical={8} elevation={8} shadowColor="#6200EE" shadowOffset={{ width: 0, height: 0 }} shadowOpacity={0.4} shadowRadius={12} borderWidth={1} borderColor="rgba(98,0,238,0.1)">
              <TouchableOpacity onPress={() => {
                const adminUrl = __DEV__ ? 'http://localhost:5173' : 'https://admin.safaikart.com';
                Linking.openURL(adminUrl).catch(() => {
                  navigation.navigate('AdminDashboard');
                });
              }}>
                <XStack alignItems="center" paddingVertical={12} borderBottomWidth={0}>
                  <YStack width={38} height={38} borderRadius={19} justifyContent="center" alignItems="center" marginRight={16} backgroundColor="#EDE7F6">
                    <Ionicons name="shield" size={20} color="#6200EE" />
                  </YStack>
                  <Text flex={1} fontSize={15} color="#6200EE" fontWeight="700">Admin Dashboard</Text>
                  <Ionicons name="chevron-forward" size={18} color={'#BDBDBD'} />
                </XStack>
              </TouchableOpacity>
            </YStack>
          </YStack>
        )}

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
