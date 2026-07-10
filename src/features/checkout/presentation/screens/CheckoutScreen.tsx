import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';

import { useCart } from '../../../cart/presentation/hooks/useCart';
import { useAddresses } from '../../../addresses/presentation/hooks/useAddresses';
import { Address } from '../../../addresses/domain/Address';
import { PickupSlot } from '../../domain/PickupSlot';

import { CheckoutRepository } from '../../infrastructure/CheckoutRepository';
import { CreateOrderDraftUseCase } from '../../application/createOrderDraft.usecase';
import { ValidateCouponUseCase } from '../../application/validateCoupon.usecase';

const repository = new CheckoutRepository();
const createOrderDraftUseCase = new CreateOrderDraftUseCase(repository);
const validateCouponUseCase = new ValidateCouponUseCase(repository);

export default function CheckoutScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const TEMP_USER_ID = 'guest-123';
  
  const { cartItems: contextCartItems, totalPrice: contextTotalPrice } = useCart();
  const { addresses } = useAddresses(TEMP_USER_ID);

  const directItems = route.params?.directItems;
  const itemsToProcess = directItems || contextCartItems;
  
  const calculatedTotalPrice = directItems 
    ? directItems.reduce((sum: number, item: any) => sum + (item.price + (item.addons || []).reduce((a: number, addon: any) => a + (addon.priceMinor || 0) / 100, 0)) * item.quantity, 0)
    : contextTotalPrice;

  // Selected Data State
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<PickupSlot | null>(null);
  const [tncAccepted, setTncAccepted] = useState(false);
  
  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountMinor, setDiscountMinor] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // Placing Order State
  const [placingOrder, setPlacingOrder] = useState(false);

  // Setup initial selected values from params or defaults
  useEffect(() => {
    // Handle Address
    if (route.params?.selectedAddressId) {
      const addr = addresses.find(a => a.id === route.params.selectedAddressId);
      if (addr) setSelectedAddress(addr);
    } else if (addresses.length > 0 && !selectedAddress) {
      // Pick default if exists, else first
      const defaultAddr = addresses.find(a => a.isDefault);
      setSelectedAddress(defaultAddr || addresses[0]);
    }

    // Handle Slot
    if (route.params?.selectedSlot) {
      setSelectedSlot(route.params.selectedSlot);
    }
  }, [addresses, route.params]);

  const subtotalMinor = calculatedTotalPrice * 100; // Assuming totalPrice is in rupees, converting to paise
  const deliveryFeeMinor = 4000; // Flat Rs 40
  const finalAmountMinor = subtotalMinor + deliveryFeeMinor - discountMinor;

  const hasSteamPress = itemsToProcess.some((item: any) => item.categoryId === 'steam_press');
  const hasVariablePricing = itemsToProcess.some((item: any) => item.priceType === 'variable');

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setCouponLoading(true);
    try {
      const result = await validateCouponUseCase.execute(couponInput, subtotalMinor);
      if (result.valid) {
        setAppliedCoupon(couponInput.toUpperCase());
        setDiscountMinor(result.discountMinor);
        setCouponInput('');
      } else {
        Alert.alert('Invalid Coupon', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountMinor(0);
  };

  const handlePlaceOrder = async () => {
    if (itemsToProcess.length === 0) {
      Alert.alert('Cart is empty', 'Add items to your cart first.');
      return;
    }
    
    setPlacingOrder(true);
    try {
      const result = await createOrderDraftUseCase.execute({
        cartItemCount: itemsToProcess.length,
        addressId: selectedAddress?.id || null,
        pickupSlotId: selectedSlot?.id || null,
        couponCode: appliedCoupon,
        directItems: directItems || null
      });

      Alert.alert('Success', `Order Draft Created: ${result.orderId}`, [
        { text: 'OK', onPress: () => navigation.navigate('Payment', { orderId: result.orderId }) }
      ]);
    } catch (error: any) {
      Alert.alert('Checkout Failed', error.message || 'Something went wrong.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const canPlaceOrder = selectedAddress && selectedSlot && tncAccepted && itemsToProcess.length > 0 && !placingOrder && !couponLoading;

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg} paddingTop={insets.top}>
      {/* Header */}
      <XStack padding={SIZES.padding} alignItems="center" backgroundColor={COLORS.white} borderBottomWidth={1} borderBottomColor="#F0F0F0">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={18} fontWeight="bold">Checkout</Text>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: SIZES.padding, paddingBottom: 120 }}>
        
        {/* SECTION 1: Delivery Address */}
        <YStack backgroundColor={COLORS.white} padding={SIZES.padding} borderRadius={SIZES.radius} marginBottom={SIZES.medium} elevation={1}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
            <Text fontWeight="bold" fontSize={16}>Delivery Address</Text>
            {addresses.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('AddressList', { fromCheckout: true })}>
                <Text color={COLORS.darkGreen} fontWeight="bold" fontSize={14}>Change</Text>
              </TouchableOpacity>
            )}
          </XStack>

          {selectedAddress ? (
            <XStack alignItems="flex-start">
              <View style={{ backgroundColor: '#F0F9F4', padding: 6, borderRadius: 20, marginRight: 12 }}>
                <Ionicons name="location-outline" size={20} color={COLORS.darkGreen} />
              </View>
              <YStack flex={1}>
                <XStack alignItems="center" marginBottom={4}>
                  <Text fontWeight="bold" fontSize={15} marginRight={8}>{selectedAddress.name}</Text>
                  <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text fontSize={10} fontWeight="bold">{selectedAddress.label}</Text>
                  </View>
                </XStack>
                <Text color={COLORS.textSecondary} fontSize={13} lineHeight={20}>{selectedAddress.line1}, {selectedAddress.line2}</Text>
                <Text color={COLORS.textSecondary} fontSize={13}>{selectedAddress.city}, {selectedAddress.pincode}</Text>
                <Text color={COLORS.black} fontSize={13} marginTop={4} fontWeight="600">{selectedAddress.phoneNumber}</Text>
              </YStack>
            </XStack>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('AddressList', { fromCheckout: true })}>
              <XStack padding={12} borderWidth={1} borderColor={COLORS.darkGreen} borderRadius={SIZES.radius} borderStyle="dashed" alignItems="center" justifyContent="center">
                <Ionicons name="add" size={20} color={COLORS.darkGreen} />
                <Text color={COLORS.darkGreen} fontWeight="bold" marginLeft={8}>Select or Add Address</Text>
              </XStack>
            </TouchableOpacity>
          )}
        </YStack>

        {/* SECTION 2: Pickup Slot */}
        <YStack backgroundColor={COLORS.white} padding={SIZES.padding} borderRadius={SIZES.radius} marginBottom={SIZES.medium} elevation={1}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
            <Text fontWeight="bold" fontSize={16}>Pickup Slot</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PickupSlot')}>
              <Text color={COLORS.darkGreen} fontWeight="bold" fontSize={14}>{selectedSlot ? 'Change' : 'Select'}</Text>
            </TouchableOpacity>
          </XStack>

          {selectedSlot ? (
            <XStack alignItems="center">
              <View style={{ backgroundColor: '#F0F9F4', padding: 6, borderRadius: 20, marginRight: 12 }}>
                <Ionicons name="time-outline" size={20} color={COLORS.darkGreen} />
              </View>
              <YStack>
                <Text fontWeight="bold" fontSize={15}>{selectedSlot.dateLabel}</Text>
                <Text color={COLORS.textSecondary} fontSize={13} marginTop={2}>{selectedSlot.displayLabel}</Text>
              </YStack>
            </XStack>
          ) : (
            <Text color={COLORS.textSecondary} fontSize={14}>No pickup slot selected.</Text>
          )}
        </YStack>

        {/* SECTION 3: Order Summary */}
        <YStack backgroundColor={COLORS.white} padding={SIZES.padding} borderRadius={SIZES.radius} marginBottom={SIZES.medium} elevation={1}>
          <Text fontWeight="bold" fontSize={16} marginBottom={12}>Order Summary</Text>
          
          {itemsToProcess.map((item: any, idx: number) => {
            const hasAddons = item.addons && item.addons.length > 0;
            const addonPriceMinor = hasAddons ? item.addons.reduce((sum: number, a: any) => sum + (a.priceMinor || 0), 0) : 0;
            const itemTotal = item.priceType === 'variable' 
              ? 0 
              : ((item.price * 100 + addonPriceMinor) * item.quantity) / 100;
              
            return (
              <XStack key={idx} justifyContent="space-between" marginBottom={12}>
                <YStack flex={1} marginRight={12}>
                  <Text fontWeight="600" fontSize={14}>{item.name}</Text>
                  {hasAddons && (
                    <Text color="#0F9D58" fontSize={11} marginTop={2}>
                      {item.addons.map((a: any) => a.name).join(', ')} added
                    </Text>
                  )}
                  {item.priceType === 'variable' ? (
                    <Text color={COLORS.textSecondary} fontSize={12} marginTop={2}>{item.quantity} x Rs {item.price} - Variable</Text>
                  ) : (
                    <Text color={COLORS.textSecondary} fontSize={12} marginTop={2}>{item.quantity} x Rs {(item.price * 100 + addonPriceMinor) / 100}</Text>
                  )}
                </YStack>
                <YStack alignItems="flex-end">
                  {item.priceType === 'variable' ? (
                    <Text fontWeight="600" fontSize={14}>Est. range</Text>
                  ) : (
                    <Text fontWeight="600" fontSize={14}>Rs {itemTotal}</Text>
                  )}
                </YStack>
              </XStack>
            );
          })}
          
          <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 }} />
          
          <XStack justifyContent="space-between" marginBottom={8}>
            <Text color={COLORS.textSecondary} fontSize={14}>Subtotal</Text>
            <Text fontWeight="600" fontSize={14}>Rs {subtotalMinor / 100}</Text>
          </XStack>
          <XStack justifyContent="space-between" marginBottom={8}>
            <Text color={COLORS.textSecondary} fontSize={14}>Delivery Fee</Text>
            <Text fontWeight="600" fontSize={14}>Rs {deliveryFeeMinor / 100}</Text>
          </XStack>
          {appliedCoupon && (
            <XStack justifyContent="space-between" marginBottom={8}>
              <Text color="#0F9D58" fontSize={14}>Discount ({appliedCoupon})</Text>
              <Text color="#0F9D58" fontWeight="600" fontSize={14}>- Rs {discountMinor / 100}</Text>
            </XStack>
          )}
          
          <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 }} />
          
          <XStack justifyContent="space-between">
            <Text fontWeight="bold" fontSize={16}>{hasVariablePricing ? 'Estimated Total' : 'Total'}</Text>
            <YStack alignItems="flex-end">
              <Text fontWeight="bold" fontSize={18} color={COLORS.darkGreen}>Rs {finalAmountMinor / 100}</Text>
              {hasVariablePricing && (
                <Text color={COLORS.textSecondary} fontSize={10} marginTop={4}>Final price confirmed after pickup</Text>
              )}
            </YStack>
          </XStack>
        </YStack>

        {/* SECTION 4: Coupon */}
        <YStack backgroundColor={COLORS.white} padding={SIZES.padding} borderRadius={SIZES.radius} marginBottom={SIZES.medium} elevation={1}>
          <Text fontWeight="bold" fontSize={16} marginBottom={12}>Coupons</Text>
          
          {appliedCoupon ? (
            <XStack backgroundColor="#F0F9F4" padding={12} borderRadius={SIZES.radius} justifyContent="space-between" alignItems="center" borderWidth={1} borderColor="#A5D6A7">
              <XStack alignItems="center">
                <Ionicons name="pricetag" size={16} color="#0F9D58" style={{ marginRight: 8 }} />
                <Text fontWeight="bold" color="#0F9D58">{appliedCoupon} applied</Text>
              </XStack>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text color="#E51A1A" fontWeight="bold" fontSize={12}>Remove</Text>
              </TouchableOpacity>
            </XStack>
          ) : (
            <XStack>
              <TextInput
                style={{ flex: 1, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', borderRightWidth: 0, borderTopLeftRadius: SIZES.radius, borderBottomLeftRadius: SIZES.radius, padding: 12 }}
                placeholder="Enter coupon code"
                autoCapitalize="characters"
                value={couponInput}
                onChangeText={setCouponInput}
              />
              <TouchableOpacity 
                onPress={handleApplyCoupon} 
                disabled={couponLoading || !couponInput}
                style={{ backgroundColor: couponInput ? COLORS.darkGreen : '#E0E0E0', paddingHorizontal: 20, justifyContent: 'center', borderTopRightRadius: SIZES.radius, borderBottomRightRadius: SIZES.radius }}
              >
                {couponLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text color={COLORS.white} fontWeight="bold">Apply</Text>}
              </TouchableOpacity>
            </XStack>
          )}
        </YStack>

        {/* SECTION 5: T&C */}
        <XStack alignItems="flex-start" marginBottom={40}>
          <TouchableOpacity onPress={() => setTncAccepted(!tncAccepted)} style={{ padding: 4 }}>
            <Ionicons name={tncAccepted ? 'checkbox' : 'square-outline'} size={24} color={tncAccepted ? COLORS.darkGreen : COLORS.textSecondary} />
          </TouchableOpacity>
          <Text color={COLORS.textSecondary} fontSize={13} marginLeft={8} flex={1} lineHeight={20}>
            I agree to the Terms & Conditions. Please check your garments for any damage before placing the order. SafaiKart is not liable for normal wear and tear.
            {hasSteamPress && (
              <Text style={{ fontWeight: 'bold' }}> Note: Steam Press excludes sofa covers, curtains, shoes, carpets, ties, and heavy household items.</Text>
            )}
          </Text>
        </XStack>

      </ScrollView>

      {/* Sticky Bottom Bar */}
      <YStack position="absolute" bottom={0} left={0} right={0} padding={SIZES.padding} paddingBottom={insets.bottom || SIZES.padding} backgroundColor={COLORS.white} borderTopWidth={1} borderTopColor="#F0F0F0" style={{ elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10 }}>
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text color={COLORS.textSecondary} fontSize={12} fontWeight="600">Total to pay</Text>
            <Text fontWeight="900" fontSize={22} color={COLORS.darkGreen}>Rs {finalAmountMinor / 100}</Text>
          </YStack>
          <AnimatedPressable onPress={handlePlaceOrder} disabled={!canPlaceOrder}>
            <YStack backgroundColor={canPlaceOrder ? COLORS.darkGreen : '#A0A0A0'} paddingVertical={14} paddingHorizontal={32} borderRadius={30}>
              {placingOrder ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text color={COLORS.white} fontSize={16} fontWeight="bold">Place Order</Text>
              )}
            </YStack>
          </AnimatedPressable>
        </XStack>
      </YStack>
    </YStack>
  );
}
