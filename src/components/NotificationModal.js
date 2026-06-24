import React, { useState } from 'react';
import { Modal, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useAppDimensions } from '../hooks/useAppDimensions';
import { YStack, XStack, ZStack, Text } from './Stacks';
import * as Haptics from 'expo-haptics';



import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, APP_WIDTH } from '../constants/theme';

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Order Arriving!', message: 'Your rider is 5 minutes away with your fresh laundry.', time: '2m ago', isRead: false, type: 'delivery' },
  { id: '2', title: 'Winter Care Sale ❄️', message: 'Get flat 20% off on all heavy jackets and blankets this weekend.', time: '2h ago', isRead: false, type: 'promo' },
  { id: '3', title: 'Payment Successful', message: 'We received your payment of ₹700 for Order #SK-2398.', time: '1d ago', isRead: true, type: 'system' },
];

export default function NotificationModal({ visible, onClose }) {
  const { width: windowWidth } = useAppDimensions();
  const appWidth = Math.min(windowWidth, 412);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const getIcon = (type) => {
    switch(type) {
      case 'delivery': return { name: 'bicycle', color: COLORS.vibrantYellow };
      case 'promo': return { name: 'pricetag', color: '#D92D20' };
      default: return { name: 'checkmark-circle', color: COLORS.darkGreen };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
      <TouchableOpacity 
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center' }} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <XStack flex={1} justifyContent="center" alignItems="center" width={appWidth} padding={20}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => {}} 
            style={{ width: '100%', maxWidth: 400, maxHeight: 700, height: '85%' }}
          >
            <YStack 
              flex={1}
              paddingTop={30} 
              paddingBottom={20} 
              style={{
                borderRadius: 32,
                backgroundColor: '#FFFFFF',
                elevation: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 30
              }}
            >
            <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={24} marginBottom={24}>
              <Text fontSize={26} fontWeight="900" color={COLORS.black} letterSpacing={-0.5}>Notifications</Text>
              <XStack alignItems="center">
                <TouchableOpacity onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  markAllRead();
                }} style={{ marginRight: 15, backgroundColor: '#F0F5F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                  <Text fontSize={12} fontWeight="bold" color={COLORS.darkGreen}>Mark all read</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={20} color={COLORS.black} />
                </TouchableOpacity>
              </XStack>
            </XStack>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {notifications.map((notif) => {
                const iconObj = getIcon(notif.type);
                return (
                  <XStack 
                    key={notif.id} 
                    padding={16} 
                    marginBottom={12}
                    borderRadius={24}
                    backgroundColor={!notif.isRead ? '#F8FAF9' : '#FFFFFF'}
                    borderWidth={1}
                    borderColor={!notif.isRead ? '#E8F2EC' : '#F0F0F0'}
                    style={{
                      shadowColor: !notif.isRead ? COLORS.darkGreen : '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: !notif.isRead ? 0.05 : 0.02,
                      shadowRadius: 8,
                      elevation: 1
                    }}
                  >
                    <YStack 
                      width={48} 
                      height={48} 
                      borderRadius={24} 
                      alignItems="center" 
                      justifyContent="center" 
                      marginRight={16} 
                      backgroundColor={iconObj.color + '15'}
                    >
                      <Ionicons name={iconObj.name} size={22} color={iconObj.color} />
                    </YStack>
                    <YStack flex={1} justifyContent="center">
                      <XStack justifyContent="space-between" alignItems="center" marginBottom={4}>
                        <Text fontSize={16} fontWeight="800" color={COLORS.black} letterSpacing={-0.3}>{notif.title}</Text>
                        <Text fontSize={11} fontWeight="600" color="#A0A0A0">{notif.time}</Text>
                      </XStack>
                      <Text fontSize={14} lineHeight={20} color="#6B7280" fontWeight="500" paddingRight={10}>{notif.message}</Text>
                    </YStack>
                    {!notif.isRead && (
                      <YStack position="absolute" top={16} right={16} width={10} height={10} borderRadius={5} backgroundColor="#D92D20" borderWidth={2} borderColor={COLORS.white} />
                    )}
                  </XStack>
                );
              })}
            </ScrollView>
            </YStack>
          </TouchableOpacity>
        </XStack>
      </TouchableOpacity>
    </Modal>
  );
}
