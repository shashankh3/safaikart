import React from 'react';
import { TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCouponsQuery } from '../../../checkout/application/useCouponsQuery';

export default function CouponsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: coupons, isLoading, error } = useCouponsQuery();

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg} paddingTop={insets.top}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={SIZES.padding} paddingVertical={15} backgroundColor={COLORS.white} borderBottomWidth={1} borderBottomColor="#F0F0F0" elevation={2} shadowColor="#000" shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.05} shadowRadius={3}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={18} fontWeight="800" color={COLORS.black}>Coupons & Offers</Text>
        <YStack width={40} />
      </XStack>
      
      <ScrollView contentContainerStyle={{ padding: SIZES.padding }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <YStack flex={1} justifyContent="center" alignItems="center" minHeight={200}>
            <ActivityIndicator size="large" color={COLORS.darkGreen} />
            <Text marginTop={12} color={COLORS.textSecondary}>Loading offers...</Text>
          </YStack>
        ) : error ? (
          <YStack flex={1} justifyContent="center" alignItems="center" minHeight={200} backgroundColor={COLORS.cardBg} borderRadius={16} padding={20} borderWidth={1} borderColor={COLORS.border}>
            <Ionicons name="alert-circle-outline" size={48} color={'#E51A1A'} />
            <Text fontSize={16} fontWeight="bold" color={COLORS.black} marginTop={12}>Failed to load coupons</Text>
            <Text fontSize={14} color={COLORS.textSecondary} textAlign="center" marginTop={8}>Please check your connection and try again.</Text>
          </YStack>
        ) : coupons && coupons.length > 0 ? (
          <YStack>
            {coupons.map((coupon, index) => {
              const discountText = coupon.type === 'percent' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`;
              return (
                <YStack key={coupon.id || index} backgroundColor={COLORS.cardBg} padding={0} borderRadius={16} elevation={2} overflow="hidden" marginBottom={16} borderWidth={1} borderColor="#F0F0F0">
                  <XStack>
                    <YStack backgroundColor={COLORS.vibrantYellow} padding={16} justifyContent="center" alignItems="center" width="30%">
                      <Text fontSize={20} fontWeight="900" color={COLORS.black}>{discountText}</Text>
                      <Text fontSize={12} fontWeight="700" color={COLORS.black}>OFF</Text>
                    </YStack>
                    <YStack padding={16} flex={1}>
                      <Text fontSize={16} fontWeight="800" color={COLORS.black} marginBottom={4}>{coupon.code}</Text>
                      <Text fontSize={12} color={COLORS.textSecondary}>{coupon.description || `Save ${discountText} on your order.`}</Text>
                      {coupon.minimumOrderAmount > 0 && (
                        <Text fontSize={11} color={COLORS.textSecondary} marginTop={4}>Min. order: ₹{coupon.minimumOrderAmount}</Text>
                      )}
                    </YStack>
                  </XStack>
                </YStack>
              );
            })}
          </YStack>
        ) : (
          <YStack flex={1} justifyContent="center" alignItems="center" minHeight={200} backgroundColor={COLORS.cardBg} borderRadius={16} padding={20} borderWidth={1} borderColor={COLORS.border}>
            <Ionicons name="ticket-outline" size={48} color={COLORS.textSecondary} />
            <Text fontSize={16} fontWeight="bold" color={COLORS.black} marginTop={12}>No coupons available right now</Text>
            <Text fontSize={14} color={COLORS.textSecondary} textAlign="center" marginTop={8}>Check back later for exciting offers and discounts!</Text>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
