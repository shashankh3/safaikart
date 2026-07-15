import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubScreen({ route, navigation }: any) {
  const { title } = route.params || { title: 'Details' };
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg} paddingTop={insets.top}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={SIZES.padding} paddingVertical={15} backgroundColor={COLORS.white} borderBottomWidth={1} borderBottomColor="#F0F0F0" elevation={2} shadowColor="#000" shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.05} shadowRadius={3}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={18} fontWeight="800" color={COLORS.black}>{title}</Text>
        <YStack width={40} />
      </XStack>
      <ScrollView contentContainerStyle={{ padding: SIZES.padding }} showsVerticalScrollIndicator={false}>

        {title === 'Payment Methods' && (
          <YStack>
            <YStack backgroundColor="#1E3120" padding={20} borderRadius={16} elevation={4} shadowColor={COLORS.darkGreen} shadowOffset={{ width: 0, height: 4 }} shadowOpacity={0.2} shadowRadius={8} marginBottom={16}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
                <Text color={COLORS.white} fontWeight="900" fontSize={18} letterSpacing={2}>VISA</Text>
                <Ionicons name="radio" size={20} color={COLORS.white} />
              </XStack>
              <Text color={COLORS.white} fontSize={20} fontWeight="600" letterSpacing={3} marginBottom={16}>**** **** **** 4242</Text>
              <XStack justifyContent="space-between">
                <Text color="rgba(255,255,255,0.7)" fontSize={12} fontWeight="500">Sarah Johnson</Text>
                <Text color="rgba(255,255,255,0.7)" fontSize={12} fontWeight="500">12/28</Text>
              </XStack>
            </YStack>
            <TouchableOpacity style={{ backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#F0F0F0' }}>
              <Ionicons name="add" size={20} color={COLORS.black} />
              <Text marginLeft={10} fontWeight="700" color={COLORS.black}>Add Payment Method</Text>
            </TouchableOpacity>
          </YStack>
        )}

        {title === 'Coupons & Offers' && (
          <YStack>
            <YStack backgroundColor={COLORS.cardBg} padding={0} borderRadius={16} elevation={2} overflow="hidden" marginBottom={16} borderWidth={1} borderColor="#F0F0F0">
              <XStack>
                <YStack backgroundColor={COLORS.vibrantYellow} padding={16} justifyContent="center" alignItems="center" width="30%">
                  <Text fontSize={20} fontWeight="900" color={COLORS.black}>20%</Text>
                  <Text fontSize={12} fontWeight="700" color={COLORS.black}>OFF</Text>
                </YStack>
                <YStack padding={16} flex={1}>
                  <Text fontSize={16} fontWeight="800" color={COLORS.black} marginBottom={4}>WELCOME20</Text>
                  <Text fontSize={12} color={COLORS.textSecondary}>Valid on your first order. Max discount ₹100.</Text>
                </YStack>
              </XStack>
            </YStack>
            <YStack backgroundColor={COLORS.cardBg} padding={0} borderRadius={16} elevation={2} overflow="hidden" marginBottom={16} borderWidth={1} borderColor="#F0F0F0" opacity={0.6}>
              <XStack>
                <YStack backgroundColor="#E0E0E0" padding={16} justifyContent="center" alignItems="center" width="30%">
                  <Text fontSize={20} fontWeight="900" color="#888">₹50</Text>
                  <Text fontSize={12} fontWeight="700" color="#888">OFF</Text>
                </YStack>
                <YStack padding={16} flex={1}>
                  <Text fontSize={16} fontWeight="800" color="#888" marginBottom={4}>WEEKEND50</Text>
                  <Text fontSize={12} color="#AAA">Expired on 12 June 2026.</Text>
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
