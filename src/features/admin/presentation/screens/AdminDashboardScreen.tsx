import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <XStack paddingHorizontal={SIZES.padding} paddingTop={insets.top + 10} paddingBottom={20} alignItems="center" backgroundColor={COLORS.white} elevation={4}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={20} fontWeight="900" color={COLORS.black} marginLeft={12}>Admin Dashboard</Text>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: SIZES.padding }}>
        <Text fontSize={14} color="#666" marginBottom={20}>Welcome to the Safaikart Management Console. Select a module below to proceed.</Text>

        <YStack style={{ gap: 16 }}>
          {/* Catalog Manager Card */}
          <TouchableOpacity onPress={() => navigation.navigate('CatalogManager')}>
            <YStack backgroundColor={COLORS.white} borderRadius={16} padding={20} elevation={4} shadowColor="#000" shadowOpacity={0.05} shadowRadius={8} shadowOffset={{ width: 0, height: 4 }}>
              <XStack alignItems="center" marginBottom={12}>
                <YStack width={48} height={48} borderRadius={24} backgroundColor="#E3F2FD" alignItems="center" justifyContent="center">
                  <Ionicons name="pricetags" size={24} color="#1976D2" />
                </YStack>
                <YStack marginLeft={16} flex={1}>
                  <Text fontSize={18} fontWeight="bold" color={COLORS.black}>Catalog Manager</Text>
                  <Text fontSize={13} color="#666" marginTop={2}>Update prices, edit items</Text>
                </YStack>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </XStack>
            </YStack>
          </TouchableOpacity>

          {/* Order Manager Card */}
          <TouchableOpacity onPress={() => navigation.navigate('AdminOrderManager')}>
            <YStack backgroundColor={COLORS.white} borderRadius={16} padding={20} elevation={4} shadowColor="#000" shadowOpacity={0.05} shadowRadius={8} shadowOffset={{ width: 0, height: 4 }}>
              <XStack alignItems="center" marginBottom={12}>
                <YStack width={48} height={48} borderRadius={24} backgroundColor="#FBE9E7" alignItems="center" justifyContent="center">
                  <Ionicons name="receipt" size={24} color="#D84315" />
                </YStack>
                <YStack marginLeft={16} flex={1}>
                  <Text fontSize={18} fontWeight="bold" color={COLORS.black}>Order Manager</Text>
                  <Text fontSize={13} color="#666" marginTop={2}>View & update customer orders</Text>
                </YStack>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </XStack>
            </YStack>
          </TouchableOpacity>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
