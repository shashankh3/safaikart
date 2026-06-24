import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../components/Stacks';




import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubScreen({ route, navigation }) {
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
      <YStack flex={1} justifyContent="center" alignItems="center" padding={SIZES.padding * 2}>
        <Ionicons name="construct-outline" size={60} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />
        <Text marginTop={16} fontSize={16} color={COLORS.textSecondary} textAlign="center" fontWeight="500" lineHeight={24}>This section is currently under construction.</Text>
      </YStack>
    </YStack>
  );
}
