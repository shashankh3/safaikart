import React from 'react';
import { ScrollView, TouchableOpacity, Image, ImageBackground, Alert, Linking } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { auth } from '../../../../app/config/firebase';import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import Header from '../../../../shared/ui/components/Header';
import { useAuth } from '../../../auth/application/useAuth';
import { useProfileQuery } from '../../application/useProfileQuery';

const menuItems = [
  { id: '0', title: 'Notifications', icon: 'notifications', tint: '#FFE0B2' },
  { id: '1', title: 'My Addresses', icon: 'location', tint: '#E8F5E9' },
  { id: '3', title: 'Coupons & Offers', icon: 'gift', tint: '#FFF3E0' },
  { id: '4', title: 'Help & Support', icon: 'headset', tint: '#F3E5F5' },
];

import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export default function ProfileScreen({ navigation }: { navigation: BottomTabNavigationProp<any, any> }) {
  const insets = useSafeAreaInsets();
  const { logout, isAdmin } = useAuth();
  const { data: profile, isLoading } = useProfileQuery();
  const handleMenuPress = (item: any) => {
    if (item.title === 'Help & Support') {
      navigation.navigate('Support');
    } else if (item.title === 'Notifications') {
      navigation.navigate('NotificationCenter');
    } else if (item.title === 'My Addresses') {
      navigation.navigate('AddressList');
    } else if (item.title === 'Coupons & Offers') {
      navigation.navigate('CouponsScreen');
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

  const renderMenuItem = (item: any) => (
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

  const getInitials = (name: string | undefined | null) => {
    if (!name) return '?';
    return name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join('') || '?';
  };

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
               {profile?.photoURL ? (
                 <Image source={{ uri: profile.photoURL }} style={{ width: 75, height: 75, borderRadius: 37.5, borderWidth: 2, borderColor: '#D4AF37' }} />
               ) : (
                 <YStack width={75} height={75} borderRadius={37.5} borderWidth={2} borderColor="#D4AF37" backgroundColor={COLORS.darkGreen} justifyContent="center" alignItems="center">
                   <Text color={COLORS.white} fontSize={28} fontWeight="bold">{getInitials(profile?.name || profile?.displayName)}</Text>
                 </YStack>
               )}
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

        {/* Danger Zone */}
        <Text fontSize={14} fontWeight="800" color="#FF3B30" marginTop={SIZES.large} marginBottom={12} letterSpacing={0.5} textTransform="uppercase">Danger Zone</Text>
        
        <YStack backgroundColor={COLORS.cardBg} borderRadius={SIZES.radius * 1.5} paddingHorizontal={16} paddingVertical={8} elevation={8} shadowColor="#FF3B30" shadowOffset={{ width: 0, height: 0 }} shadowOpacity={0.4} shadowRadius={12} borderWidth={1} borderColor="#FFEBEE">
          <TouchableOpacity onPress={handleLogout}>
            <XStack alignItems="center" paddingVertical={12} borderBottomWidth={1} borderBottomColor="#F5F5F5">
              <YStack width={38} height={38} borderRadius={19} justifyContent="center" alignItems="center" marginRight={16} backgroundColor="#FFEBEE">
                <Ionicons name="log-out" size={20} color="#FF3B30" />
              </YStack>
              <Text flex={1} fontSize={15} color="#FF3B30" fontWeight="600">Log Out</Text>
            </XStack>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            Alert.alert(
              "Delete Account",
              "Are you sure you want to permanently delete your account? This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Delete Account", 
                  style: "destructive", 
                  onPress: async () => {
                    try {
                      // Optionally call a backend endpoint to clean up user data before deleting
                      await auth.currentUser?.delete();
                    } catch (e: any) {
                      if (e.code === 'auth/requires-recent-login') {
                        Alert.alert('Recent Login Required', 'For security reasons, please log out and log in again before deleting your account.');
                      } else {
                        Alert.alert('Error', e.message || 'Failed to delete account.');
                      }
                    }
                  } 
                }
              ]
            );
          }}>
            <XStack alignItems="center" paddingVertical={12} borderBottomWidth={0}>
              <YStack width={38} height={38} borderRadius={19} justifyContent="center" alignItems="center" marginRight={16} backgroundColor="#FFEBEE">
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </YStack>
              <Text flex={1} fontSize={15} color="#FF3B30" fontWeight="600">Delete Account</Text>
            </XStack>
          </TouchableOpacity>
        </YStack>

        {/* Padding for sticky cart */}
        <YStack height={100 + insets.bottom} />
      </ScrollView>
    </YStack>
  );
}
