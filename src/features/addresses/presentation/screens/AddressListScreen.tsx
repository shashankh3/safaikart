import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { useAddresses } from '../hooks/useAddresses';
import { Address } from '../../domain/Address';

export default function AddressListScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { addresses, loading, refresh, deleteAddress } = useAddresses();
  
  const isFromCheckout = route?.params?.fromCheckout;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handlePressAddress = (address: Address) => {
    if (isFromCheckout) {
      // Navigate back to Checkout with selected address
      navigation.navigate('Checkout', { selectedAddressId: address.id });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress(id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const renderItem = ({ item }: { item: Address }) => {
    let icon = 'location-outline';
    if (item.label.toLowerCase() === 'home') icon = 'home-outline';
    if (item.label.toLowerCase() === 'work') icon = 'briefcase-outline';

    return (
      <AnimatedPressable onPress={() => handlePressAddress(item)}>
        <YStack
          backgroundColor={COLORS.white}
          padding={SIZES.padding}
          borderRadius={SIZES.radius}
          marginBottom={SIZES.medium}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.05}
          shadowRadius={5}
          elevation={2}
          borderWidth={1}
          borderColor="#F0F0F0"
        >
          <XStack justifyContent="space-between" alignItems="center" marginBottom={8}>
            <XStack alignItems="center">
              <View style={{ backgroundColor: '#F0F9F4', padding: 6, borderRadius: 20, marginRight: 8 }}>
                <Ionicons name={icon as any} size={16} color={COLORS.darkGreen} />
              </View>
              <Text fontWeight="bold" fontSize={14}>{item.label}</Text>
              {item.isDefault && (
                <View style={{ backgroundColor: COLORS.darkGreen, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                  <Text color={COLORS.white} fontSize={10} fontWeight="bold">DEFAULT</Text>
                </View>
              )}
            </XStack>
            <XStack>
              <TouchableOpacity onPress={() => navigation.navigate('AddressForm', { mode: 'edit', addressId: item.id, address: item })}>
                <Ionicons name="pencil" size={18} color={COLORS.textSecondary} style={{ marginRight: 16 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={18} color={deletingId === item.id ? '#CCC' : '#E51A1A'} />
              </TouchableOpacity>
            </XStack>
          </XStack>
          
          <Text fontWeight="600" fontSize={16} marginBottom={4}>{item.name} • {item.phoneNumber}</Text>
          <Text color={COLORS.textSecondary} fontSize={13} lineHeight={20}>
            {item.line1}{item.line2 ? `, ${item.line2}` : ''}
          </Text>
          <Text color={COLORS.textSecondary} fontSize={13}>
            {item.city}, {item.state} - {item.pincode}
          </Text>
        </YStack>
      </AnimatedPressable>
    );
  };

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg} paddingTop={insets.top}>
      {/* Header */}
      <XStack padding={SIZES.padding} alignItems="center" backgroundColor={COLORS.white} borderBottomWidth={1} borderBottomColor="#F0F0F0">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={18} fontWeight="bold">My Addresses</Text>
      </XStack>

      {/* List */}
      <FlatList
        data={addresses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SIZES.padding, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={() => (
          !loading ? (
            <YStack alignItems="center" justifyContent="center" marginTop={40}>
              <Ionicons name="location-outline" size={60} color="#DDD" />
              <Text fontSize={16} color={COLORS.textSecondary} marginTop={12}>No addresses found.</Text>
            </YStack>
          ) : null
        )}
      />

      {/* Bottom Button */}
      <YStack position="absolute" bottom={0} left={0} right={0} padding={SIZES.padding} paddingBottom={insets.bottom || SIZES.padding} backgroundColor={COLORS.white} borderTopWidth={1} borderTopColor="#F0F0F0">
        <AnimatedPressable onPress={() => navigation.navigate('AddressForm', { mode: 'add' })}>
          <YStack backgroundColor={COLORS.darkGreen} padding={16} borderRadius={SIZES.radius} alignItems="center">
            <Text color={COLORS.white} fontSize={16} fontWeight="bold">+ Add New Address</Text>
          </YStack>
        </AnimatedPressable>
      </YStack>
    </YStack>
  );
}
