import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, TextInput, ActivityIndicator, Alert, ImageBackground } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useToast } from '../../../../core/providers/ToastContext';
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
import { checkoutSchema } from '../../../../shared/validation';

const repository = new CheckoutRepository();
const createOrderDraftUseCase = new CreateOrderDraftUseCase(repository);
const validateCouponUseCase = new ValidateCouponUseCase(repository);

export default function CheckoutScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { cartItems: contextCartItems, totalPrice: contextTotalPrice, setQuantity, removeFromCart, clearCart } = useCart();
  const { addresses } = useAddresses();

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

  // Delivery Fee State
  const [deliveryFeeMinor, setDeliveryFeeMinor] = useState(4000);

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

  useEffect(() => {
    repository.getDeliveryFee().then(fee => setDeliveryFeeMinor(fee));
  }, []);

  const subtotalMinor = calculatedTotalPrice * 100; // Assuming totalPrice is in rupees, converting to paise
  const finalAmountMinor = subtotalMinor + deliveryFeeMinor - discountMinor;

  const hasSteamPress = itemsToProcess.some((item: any) => item.categoryId === 'steam_press');
  const hasVariablePricing = itemsToProcess.some((item: any) => item.priceType === 'variable');

  // A4: Stale Coupon State Revalidation
  useEffect(() => {
    if (appliedCoupon && subtotalMinor > 0) {
      validateCouponUseCase.execute(appliedCoupon, subtotalMinor).then(result => {
        if (result.valid) {
          setDiscountMinor(result.discountMinor);
        } else {
          setAppliedCoupon(null);
          setDiscountMinor(0);
          Alert.alert('Coupon Removed', 'Your cart no longer meets the requirements for this coupon.');
        }
      }).catch(() => {
        setAppliedCoupon(null);
        setDiscountMinor(0);
      });
    }
  }, [subtotalMinor, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCouponUseCase.execute(
        couponInput.trim().toUpperCase(),
        Math.round(calculatedTotalPrice * 100)
      );

      if (result.valid) {
        setAppliedCoupon(couponInput.trim().toUpperCase());
        setDiscountMinor(result.discountMinor);
        setCouponInput('');
        showToast(result.message || 'Coupon applied successfully!', 'success');
      } else {
        showToast(result.message || 'Invalid coupon code', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to apply coupon', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountMinor(0);
  };

  const handlePlaceOrder = async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      showToast('No internet connection. Please check your network and try again.', 'error');
      return;
    }

    if (itemsToProcess.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }
    
    const draft = {
      addressId: selectedAddress?.id || '',
      pickupSlotId: selectedSlot?.id || '',
      couponCode: appliedCoupon || '',
      notes: '',
      acceptedTc: tncAccepted
    };

    const validation = checkoutSchema.safeParse(draft);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0].message;
      Alert.alert('Missing Information', firstError);
      return;
    }
    
    setPlacingOrder(true);
    try {
      const formattedItems = itemsToProcess.map((item: any) => ({
        serviceId: item.serviceId || item.id || 'service',
        nameSnapshot: item.nameSnapshot || item.name || 'Service Item',
        quantity: item.quantity || 1,
        priceMinor: item.priceMinor !== undefined ? item.priceMinor : (item.price ? Math.round(item.price * 100) : 0),
        addons: item.addons || []
      }));

      const result = await createOrderDraftUseCase.execute({
        cartItemCount: itemsToProcess.length,
        addressId: validation.data.addressId,
        pickupSlotId: validation.data.pickupSlotId,
        couponCode: validation.data.couponCode || null,
        directItems: formattedItems,
        idempotencyKey: Math.random().toString(36).substring(2) + Date.now().toString(36)
      });

      // Clear the live cart immediately so old/completed items never reappear in checkout prompt!
      try {
        await clearCart();
      } catch (e) {
        console.warn('Cart clear note:', e);
      }

      // Success -> Navigate directly to Payment
      navigation.replace('Payment', { orderId: result.orderId, amount: result.finalAmountMinor });
    } catch (error: any) {
      Alert.alert('Checkout Failed', error.message || 'Something went wrong.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const canPlaceOrder = !placingOrder && !couponLoading;

  if (itemsToProcess.length === 0) {
    return (
      <YStack flex={1} backgroundColor={COLORS.primaryBg}>
        <ImageBackground
          source={require('../../../../../assets/premium-bg.jpg.png')}
          style={{ paddingTop: insets.top, width: '100%', overflow: 'hidden' }}
          imageStyle={{ width: '102%', left: '-1%' }}
          resizeMode="cover"
        >
          <XStack alignItems="center" paddingHorizontal={SIZES.padding} paddingVertical={14}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={{ 
                width: 38, 
                height: 38, 
                borderRadius: 19, 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: 12
              }}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text fontSize={18} fontWeight="900" color={COLORS.white}>Checkout</Text>
          </XStack>
        </ImageBackground>

        <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal={30}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="cart-outline" size={40} color={COLORS.darkGreen} />
          </View>
          <Text fontSize={20} fontWeight="800" color={COLORS.black} marginBottom={8} textAlign="center">
            Your Cart is Empty
          </Text>
          <Text fontSize={14} color={COLORS.textSecondary} textAlign="center" marginBottom={24} lineHeight={20}>
            You don't have any items in your cart. Add services to proceed with pickup and checkout.
          </Text>
          <AnimatedPressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            style={{
              backgroundColor: COLORS.darkGreen,
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Text color={COLORS.white} fontWeight="bold" fontSize={15} marginRight={6}>Explore Services</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </AnimatedPressable>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      {/* Premium Header */}
      <ImageBackground
        source={require('../../../../../assets/premium-bg.jpg.png')}
        style={{ paddingTop: insets.top, width: '100%', overflow: 'hidden' }}
        imageStyle={{ width: '102%', left: '-1%' }}
        resizeMode="cover"
      >
        <XStack alignItems="center" paddingHorizontal={SIZES.padding} paddingVertical={14}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ 
              width: 38, 
              height: 38, 
              borderRadius: 19, 
              backgroundColor: 'rgba(255,255,255,0.15)', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: 12
            }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <YStack flex={1}>
            <Text fontSize={18} fontWeight="900" color={COLORS.white}>Checkout</Text>
            <Text fontSize={12} color="rgba(255,255,255,0.7)" fontWeight="500">Review address, slot & order summary</Text>
          </YStack>
        </XStack>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: SIZES.padding, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: Delivery Address */}
        <YStack 
          backgroundColor={COLORS.white} 
          padding={16} 
          borderRadius={18} 
          marginBottom={14} 
          borderWidth={1} 
          borderColor="rgba(0,0,0,0.05)"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}
        >
          <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
            <XStack alignItems="center">
              <View style={{ backgroundColor: '#E8F5E9', padding: 7, borderRadius: 12, marginRight: 10 }}>
                <Ionicons name="location-sharp" size={18} color={COLORS.darkGreen} />
              </View>
              <Text fontWeight="800" fontSize={15} color={COLORS.black}>Delivery Address</Text>
            </XStack>
            {addresses.length > 0 && (
              <TouchableOpacity 
                onPress={() => navigation.navigate('AddressList', { fromCheckout: true })}
                style={{ backgroundColor: '#F0F9F4', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#C8E6C9' }}
              >
                <Text color={COLORS.darkGreen} fontWeight="800" fontSize={12}>Change</Text>
              </TouchableOpacity>
            )}
          </XStack>

          {selectedAddress ? (
            <YStack backgroundColor="#F9FAF9" padding={12} borderRadius={12} borderWidth={1} borderColor="#EAEAEA">
              <XStack alignItems="center" justifyContent="space-between" marginBottom={6}>
                <Text fontWeight="800" fontSize={14} color={COLORS.black}>{selectedAddress.name}</Text>
                <View style={{ backgroundColor: COLORS.darkGreen, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text fontSize={10} fontWeight="bold" color={COLORS.white}>{selectedAddress.label.toUpperCase()}</Text>
                </View>
              </XStack>
              <Text color={COLORS.textSecondary} fontSize={13} lineHeight={19}>
                {selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}
              </Text>
              <Text color={COLORS.textSecondary} fontSize={13} marginTop={2}>
                {selectedAddress.city} - {selectedAddress.pincode}
              </Text>
              <Text color={COLORS.black} fontSize={13} marginTop={6} fontWeight="700">
                📞 {selectedAddress.phoneNumber}
              </Text>
            </YStack>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('AddressList', { fromCheckout: true })}>
              <XStack padding={14} borderWidth={1.5} borderColor={COLORS.darkGreen} borderRadius={12} borderStyle="dashed" alignItems="center" justifyContent="center" backgroundColor="#F0F9F4">
                <Ionicons name="add-circle" size={20} color={COLORS.darkGreen} />
                <Text color={COLORS.darkGreen} fontWeight="800" marginLeft={8} fontSize={14}>Select or Add Address</Text>
              </XStack>
            </TouchableOpacity>
          )}
        </YStack>

        {/* SECTION 2: Pickup Slot */}
        <YStack 
          backgroundColor={COLORS.white} 
          padding={16} 
          borderRadius={18} 
          marginBottom={14} 
          borderWidth={1} 
          borderColor="rgba(0,0,0,0.05)"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}
        >
          <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
            <XStack alignItems="center">
              <View style={{ backgroundColor: '#E8F5E9', padding: 7, borderRadius: 12, marginRight: 10 }}>
                <Ionicons name="calendar" size={18} color={COLORS.darkGreen} />
              </View>
              <Text fontWeight="800" fontSize={15} color={COLORS.black}>Pickup Schedule</Text>
            </XStack>
            <TouchableOpacity 
              onPress={() => navigation.navigate('PickupSlot')}
              style={{ backgroundColor: '#F0F9F4', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#C8E6C9' }}
            >
              <Text color={COLORS.darkGreen} fontWeight="800" fontSize={12}>{selectedSlot ? 'Change' : 'Select'}</Text>
            </TouchableOpacity>
          </XStack>

          {selectedSlot ? (
            <XStack alignItems="center" backgroundColor="#F9FAF9" padding={12} borderRadius={12} borderWidth={1} borderColor="#EAEAEA">
              <View style={{ backgroundColor: '#FFF9C4', padding: 8, borderRadius: 10, marginRight: 12 }}>
                <Ionicons name="time" size={20} color="#F57F17" />
              </View>
              <YStack flex={1}>
                <Text fontWeight="800" fontSize={14} color={COLORS.black}>{selectedSlot.dateLabel}</Text>
                <Text color={COLORS.darkGreen} fontSize={13} marginTop={2} fontWeight="600">{selectedSlot.displayLabel}</Text>
              </YStack>
            </XStack>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('PickupSlot')}>
              <XStack padding={14} borderWidth={1.5} borderColor={COLORS.darkGreen} borderRadius={12} borderStyle="dashed" alignItems="center" justifyContent="center" backgroundColor="#F0F9F4">
                <Ionicons name="time-outline" size={20} color={COLORS.darkGreen} />
                <Text color={COLORS.darkGreen} fontWeight="800" marginLeft={8} fontSize={14}>Select Pickup Slot</Text>
              </XStack>
            </TouchableOpacity>
          )}
        </YStack>

        {/* SECTION 3: Order Summary */}
        <YStack 
          backgroundColor={COLORS.white} 
          padding={16} 
          borderRadius={18} 
          marginBottom={14} 
          borderWidth={1} 
          borderColor="rgba(0,0,0,0.05)"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}
        >
          <XStack alignItems="center" marginBottom={14}>
            <View style={{ backgroundColor: '#E8F5E9', padding: 7, borderRadius: 12, marginRight: 10 }}>
              <Ionicons name="shirt" size={18} color={COLORS.darkGreen} />
            </View>
            <Text fontWeight="800" fontSize={15} color={COLORS.black}>Order Items ({itemsToProcess.length})</Text>
          </XStack>
          
          {itemsToProcess.map((item: any, idx: number) => {
            const hasAddons = item.addons && item.addons.length > 0;
            const addonPriceMinor = hasAddons ? item.addons.reduce((sum: number, a: any) => sum + (a.priceMinor || 0), 0) : 0;
            const basePriceMinor = item.priceMinor !== undefined ? item.priceMinor : (item.price ? Math.round(item.price * 100) : 0);
            const itemTotal = item.priceType === 'variable' 
              ? 0 
              : ((basePriceMinor + addonPriceMinor) * item.quantity) / 100;
              
            return (
              <XStack key={idx} justifyContent="space-between" alignItems="center" paddingVertical={10} borderBottomWidth={1} borderBottomColor="#F5F5F5">
                <YStack flex={1} marginRight={12}>
                  <Text fontWeight="700" fontSize={14} color={COLORS.black}>{item.nameSnapshot || item.name || 'Item'}</Text>
                  {hasAddons && (
                    <Text color={COLORS.darkGreen} fontSize={11} marginTop={2} fontWeight="600">
                      + {item.addons.map((a: any) => a.name).join(', ')}
                    </Text>
                  )}
                  
                  {/* Quantity Editor for Cart Items */}
                  {!directItems && (
                    <XStack alignItems="center" marginTop={8}>
                      <TouchableOpacity 
                        onPress={() => setQuantity(item.serviceId || item.id, item.quantity - 1)}
                        style={{ width: 26, height: 26, backgroundColor: '#F0F0F0', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="remove" size={14} color={COLORS.black} />
                      </TouchableOpacity>
                      <Text marginHorizontal={10} fontWeight="800" fontSize={13}>{item.quantity}</Text>
                      <TouchableOpacity 
                        onPress={() => setQuantity(item.serviceId || item.id, item.quantity + 1)}
                        style={{ width: 26, height: 26, backgroundColor: '#F0F0F0', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="add" size={14} color={COLORS.black} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => removeFromCart(item.serviceId || item.id)}
                        style={{ padding: 4, marginLeft: 12 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={'#E51A1A'} />
                      </TouchableOpacity>
                    </XStack>
                  )}
                </YStack>
                <YStack alignItems="flex-end">
                  {item.priceType === 'variable' ? (
                    <Text fontWeight="700" fontSize={14} color={COLORS.textSecondary}>Variable</Text>
                  ) : (
                    <Text fontWeight="800" fontSize={15} color={COLORS.black}>₹{itemTotal}</Text>
                  )}
                </YStack>
              </XStack>
            );
          })}
          
          <YStack marginTop={12} backgroundColor="#F9FAF9" padding={12} borderRadius={12}>
            <XStack justifyContent="space-between" marginBottom={6}>
              <Text color={COLORS.textSecondary} fontSize={13}>Item Total</Text>
              <Text fontWeight="700" fontSize={13} color={COLORS.black}>₹{subtotalMinor / 100}</Text>
            </XStack>
            <XStack justifyContent="space-between" marginBottom={6}>
              <Text color={COLORS.textSecondary} fontSize={13}>Delivery Fee</Text>
              <Text fontWeight="700" fontSize={13} color={deliveryFeeMinor === 0 ? COLORS.darkGreen : COLORS.black}>
                {deliveryFeeMinor === 0 ? 'FREE' : `₹${deliveryFeeMinor / 100}`}
              </Text>
            </XStack>
            {appliedCoupon && (
              <XStack justifyContent="space-between" marginBottom={6}>
                <Text color="#0F9D58" fontSize={13} fontWeight="600">Discount ({appliedCoupon})</Text>
                <Text color="#0F9D58" fontWeight="800" fontSize={13}>- ₹{discountMinor / 100}</Text>
              </XStack>
            )}
            
            <View style={{ height: 1, backgroundColor: '#EAEAEA', marginVertical: 8 }} />
            
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="900" fontSize={15} color={COLORS.black}>{hasVariablePricing ? 'Estimated Total' : 'Grand Total'}</Text>
              <YStack alignItems="flex-end">
                <Text fontWeight="900" fontSize={18} color={COLORS.darkGreen}>₹{finalAmountMinor / 100}</Text>
                {hasVariablePricing && (
                  <Text color={COLORS.textSecondary} fontSize={10} marginTop={2}>Final price after pickup</Text>
                )}
              </YStack>
            </XStack>
          </YStack>
        </YStack>

        {/* SECTION 4: Coupon */}
        <YStack 
          backgroundColor={COLORS.white} 
          padding={16} 
          borderRadius={18} 
          marginBottom={14} 
          borderWidth={1} 
          borderColor="rgba(0,0,0,0.05)"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}
        >
          <XStack alignItems="center" marginBottom={12}>
            <View style={{ backgroundColor: '#FFF9C4', padding: 7, borderRadius: 12, marginRight: 10 }}>
              <Ionicons name="pricetag" size={18} color="#F57F17" />
            </View>
            <Text fontWeight="800" fontSize={15} color={COLORS.black}>Offers & Coupons</Text>
          </XStack>
          
          {appliedCoupon ? (
            <XStack backgroundColor="#F0F9F4" padding={12} borderRadius={12} justifyContent="space-between" alignItems="center" borderWidth={1} borderColor="#A5D6A7">
              <XStack alignItems="center">
                <Ionicons name="checkmark-circle" size={18} color="#0F9D58" style={{ marginRight: 8 }} />
                <Text fontWeight="800" color="#0F9D58" fontSize={14}>'{appliedCoupon}' Applied</Text>
              </XStack>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text color="#E51A1A" fontWeight="800" fontSize={13}>Remove</Text>
              </TouchableOpacity>
            </XStack>
          ) : (
            <XStack alignItems="center">
              <TextInput
                style={{ 
                  flex: 1, 
                  backgroundColor: '#F9FAF9', 
                  borderWidth: 1, 
                  borderColor: '#E0E0E0', 
                  borderRightWidth: 0, 
                  borderTopLeftRadius: 12, 
                  borderBottomLeftRadius: 12, 
                  paddingHorizontal: 14, 
                  paddingVertical: 10,
                  fontSize: 14,
                  fontWeight: '600',
                  color: COLORS.black
                }}
                placeholder="Enter promo / coupon code"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="characters"
                value={couponInput}
                onChangeText={setCouponInput}
              />
              <TouchableOpacity 
                onPress={handleApplyCoupon} 
                disabled={couponLoading || !couponInput}
                style={{ 
                  backgroundColor: couponInput ? COLORS.darkGreen : '#E0E0E0', 
                  paddingHorizontal: 18, 
                  paddingVertical: 12, 
                  justifyContent: 'center', 
                  borderTopRightRadius: 12, 
                  borderBottomRightRadius: 12 
                }}
              >
                {couponLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text color={COLORS.white} fontWeight="800" fontSize={14}>Apply</Text>}
              </TouchableOpacity>
            </XStack>
          )}
        </YStack>

        {/* SECTION 5: T&C */}
        <XStack alignItems="flex-start" marginBottom={30} backgroundColor="#F0F9F4" padding={14} borderRadius={14} borderWidth={1} borderColor="#C8E6C9">
          <TouchableOpacity onPress={() => setTncAccepted(!tncAccepted)} style={{ padding: 2 }}>
            <Ionicons name={tncAccepted ? 'checkbox' : 'square-outline'} size={22} color={tncAccepted ? COLORS.darkGreen : COLORS.textSecondary} />
          </TouchableOpacity>
          <Text color={COLORS.darkGreen} fontSize={12} marginLeft={10} flex={1} lineHeight={18}>
            I agree to the SafaiKart Terms & Conditions. Please ensure all pockets are empty before pickup.
            {hasSteamPress && (
              <Text style={{ fontWeight: 'bold' }}> Note: Steam Press excludes sofa covers, curtains, shoes, carpets, and heavy household items.</Text>
            )}
          </Text>
        </XStack>

      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <YStack 
        position="absolute" 
        bottom={0} 
        left={0} 
        right={0} 
        paddingHorizontal={16} 
        paddingTop={12} 
        paddingBottom={insets.bottom > 0 ? insets.bottom + 6 : 16} 
        backgroundColor={COLORS.white} 
        borderTopWidth={1} 
        borderTopColor="#F0F0F0" 
        style={{ elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10 }}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text color={COLORS.textSecondary} fontSize={12} fontWeight="600">Total Payable</Text>
            <Text fontWeight="900" fontSize={22} color={COLORS.darkGreen}>₹{finalAmountMinor / 100}</Text>
          </YStack>
          <AnimatedPressable onPress={handlePlaceOrder} disabled={!canPlaceOrder}>
            <XStack 
              backgroundColor={canPlaceOrder ? COLORS.vibrantYellow : '#E0E0E0'} 
              paddingVertical={13} 
              paddingHorizontal={28} 
              borderRadius={30}
              alignItems="center"
              style={{ elevation: canPlaceOrder ? 3 : 0 }}
            >
              {placingOrder ? (
                <ActivityIndicator size="small" color={COLORS.black} />
              ) : (
                <>
                  <Text color={canPlaceOrder ? COLORS.black : '#999'} fontSize={16} fontWeight="900" marginRight={8}>Place Order</Text>
                  <Ionicons name="arrow-forward" size={18} color={canPlaceOrder ? COLORS.black : '#999'} />
                </>
              )}
            </XStack>
          </AnimatedPressable>
        </XStack>
      </YStack>
    </YStack>
  );
}
