import React, { useState, useEffect } from 'react';
import { Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, View } from 'react-native';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { COLORS } from '../../../../shared/theme/colors';
import { useCart } from '../../../../features/cart/presentation/hooks/useCart';
import { useCatalogV2Query } from '../../application/useServicesQuery';

export default function ServiceDetailsScreen({ route, navigation }: any) {
  const { service } = route.params;
  const { data: catalogV2, isLoading } = useCatalogV2Query();
  
  // State for quantities and selected addons
  const [quantities, setQuantities] = useState<any>({});
  const [selectedAddons, setSelectedAddons] = useState<any>({});
  
  // State for nested tabs
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);

  const { addToCart } = useCart();

  // Find the matching service from V2 catalog
  const currentService = catalogV2?.services?.find(
    (s: any) => 
      s.name.toUpperCase() === service.title?.toUpperCase() || 
      s.name.toUpperCase() === service.category?.toUpperCase()
  );



  const currentCategory = currentService?.categories?.[selectedCategoryIdx];
  const items = currentCategory?.items || [];

  const updateQuantity = (id: string, delta: number) => {
    setQuantities((prev: any) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const toggleAddon = (itemId: string, addon: any) => {
    setSelectedAddons((prev: any) => {
      const itemAddons = prev[itemId] || [];
      const exists = itemAddons.find((a: any) => a.id === addon.id);
      if (exists) {
        return { ...prev, [itemId]: itemAddons.filter((a: any) => a.id !== addon.id) };
      } else {
        return { ...prev, [itemId]: [...itemAddons, addon] };
      }
    });
  };

  const totalItems = (Object.values(quantities) as any[]).reduce((a, b) => a + b, 0);
  
  // We need to calculate total price across all items, not just the visible ones
  const calculateTotalPrice = () => {
    let sum = 0;
    // Iterate over all items in the current service
    currentService?.categories?.forEach((cat: any) => {
      cat.items?.forEach((item: any) => {
        const qty = quantities[item.id] || 0;
        if (qty > 0) {
          const itemAddons = selectedAddons[item.id] || [];
          const addonsPriceMinor = itemAddons.reduce((a: number, addon: any) => a + (addon.priceMinor || 0), 0);
          const itemTotal = ((item.price || item.priceMinor/100 || 0) + (addonsPriceMinor/100)) * qty;
          sum += itemTotal;
        }
      });
    });
    return sum;
  };
  
  const totalPrice = calculateTotalPrice();

  const getCartItemsPayload = () => {
    const itemsToAdd: any[] = [];
    currentService?.categories?.forEach((cat: any) => {
      cat.items?.forEach((item: any) => {
        const qty = quantities[item.id] || 0;
        if (qty > 0) {
          itemsToAdd.push({
            id: item.id,
            serviceId: item.id,
            name: item.name,
            price: item.price || item.priceMinor/100 || 0,
            priceType: item.priceType || 'fixed',
            unit: item.unit || 'piece',
            quantity: qty,
            addons: selectedAddons[item.id] || [],
            categoryId: cat.id
          });
        }
      });
    });
    return itemsToAdd;
  };

  const handleAddToCart = async () => {
    const itemsToAdd = getCartItemsPayload();
    if (itemsToAdd.length > 0) {
      try {
        await addToCart(itemsToAdd);
        navigation.navigate('MainTabs', { screen: 'Home' });
      } catch (error: any) {
        Alert.alert('Cart Error', error.message || 'Failed to update cart');
      }
    } else {
      navigation.navigate('MainTabs', { screen: 'Home' });
    }
  };

  const handleBuyNow = () => {
    const itemsToAdd = getCartItemsPayload();
    if (itemsToAdd.length > 0) {
      navigation.navigate('CheckoutFlow', { screen: 'Checkout', params: { directItems: itemsToAdd } });
    }
  };

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} stickyHeaderIndices={[2]}>
        
        {/* Header Image Area */}
        <YStack width="100%" height={280} position="relative">
          <Image source={service.img} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <YStack {...StyleSheet.absoluteFill} backgroundColor="rgba(15, 44, 21, 0.4)" />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 }}
          />

          <TouchableOpacity style={{ position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <YStack position="absolute" bottom={30} left={20} zIndex={5}>
            <Text color={COLORS.vibrantYellow} fontSize={12} fontWeight="bold" letterSpacing={1} marginBottom={5}>{service.category}</Text>
            <Text color={COLORS.white} fontSize={28} fontWeight="900">{service.title}</Text>
            <Text color="#ccc" fontSize={12} marginTop={4}>Estimated delivery in 2 days</Text>
          </YStack>
        </YStack>

        {/* T&C Area */}
        <YStack padding={20} paddingBottom={0}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
            <Text fontSize={18} fontWeight="bold">Select Garments</Text>
            {isLoading && <ActivityIndicator size="small" color={COLORS.darkGreen} />}
          </XStack>
          
          <YStack backgroundColor="#F0F9F4" padding={12} borderRadius={8} marginBottom={20} borderWidth={1} borderColor="#A5D6A7">
            <Text fontSize={12} color={COLORS.darkGreen} lineHeight={18}>
              <Text fontWeight="bold">Terms & Conditions:{'\n\n'}</Text>
              {currentService?.termsAndConditions ? 
                currentService.termsAndConditions.map((tc: string, i: number) => (
                  <Text key={i}>• {tc}{'\n'}</Text>
                )) : 
                'While SafaiKart handles every item with care, SafaiKart is not liable for normal wear and tear that may occur during the process.'
              }
            </Text>
          </YStack>
        </YStack>

        {/* Sticky Tabs Area */}
        <YStack backgroundColor={COLORS.primaryBg}>
          {currentService?.categories && currentService.categories.length > 0 && (
            <YStack paddingHorizontal={20} paddingBottom={10}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack>
                  {currentService.categories.map((cat: any, idx: number) => (
                    <TouchableOpacity key={cat.id} onPress={() => setSelectedCategoryIdx(idx)}>
                      <YStack 
                        paddingVertical={10} 
                        paddingHorizontal={20} 
                        marginRight={12}
                        borderRadius={24}
                        backgroundColor={selectedCategoryIdx === idx ? COLORS.darkGreen : COLORS.white}
                        borderWidth={1}
                        borderColor={selectedCategoryIdx === idx ? COLORS.darkGreen : '#E0E0E0'}
                        elevation={selectedCategoryIdx === idx ? 2 : 0}
                      >
                        <Text 
                          color={selectedCategoryIdx === idx ? COLORS.white : COLORS.black}
                          fontWeight={selectedCategoryIdx === idx ? 'bold' : '500'}
                          fontSize={14}
                        >
                          {cat.name}
                        </Text>
                      </YStack>
                    </TouchableOpacity>
                  ))}
                </XStack>
              </ScrollView>
            </YStack>
          )}


        </YStack>

        {/* Content Area (Items) */}
        <YStack padding={20} paddingTop={5}>
          {items.map((item: any) => {
            const qty = quantities[item.id] || 0;
            const itemAddons = selectedAddons[item.id] || [];
            const hasStarchOption = item.addons && item.addons.length > 0;
            const price = item.price || item.priceMinor/100 || 0;
            const maxPrice = item.maxPrice || item.priceMaxMinor/100 || 0;
            
            return (
              <YStack key={item.id} backgroundColor={COLORS.white} padding={16} borderRadius={12} marginBottom={12} elevation={2} shadowColor="#000" shadowOpacity={0.05} shadowRadius={8} shadowOffset={{ width: 0, height: 2 }}>
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1}>
                    <Text fontSize={16} fontWeight="bold" marginBottom={4}>{item.name}</Text>
                    {item.isRange || item.priceType === 'variable' ? (
                      <Text fontSize={14} color="#666">Rs {price} - {maxPrice} (est.) / {item.unit || 'piece'}</Text>
                    ) : (
                      <Text fontSize={14} color="#666">Rs {price} / {item.unit || 'piece'}</Text>
                    )}
                  </YStack>
                  
                  <XStack alignItems="center" backgroundColor="#F5F5F5" borderRadius={20} padding={4}>
                    <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', elevation: 1 }} onPress={() => updateQuantity(item.id, -1)}>
                      <Ionicons name="remove" size={18} color={COLORS.black} />
                    </TouchableOpacity>
                    <Text width={30} textAlign="center" fontSize={16} fontWeight="bold">{qty}</Text>
                    <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', elevation: 1 }} onPress={() => updateQuantity(item.id, 1)}>
                      <Ionicons name="add" size={18} color={COLORS.black} />
                    </TouchableOpacity>
                  </XStack>
                </XStack>
                
                {/* Add-ons Section (Starch) */}
                {hasStarchOption && qty > 0 && (
                  <YStack marginTop={12} paddingTop={12} borderTopWidth={1} borderTopColor="#F0F0F0">
                    {item.addons.map((addon: any) => {
                      const isSelected = itemAddons.find((a: any) => a.id === addon.id);
                      return (
                        <TouchableOpacity key={addon.id} onPress={() => toggleAddon(item.id, addon)}>
                          <XStack alignItems="center" alignSelf="flex-start" backgroundColor={isSelected ? '#E8F5E9' : '#F5F5F5'} paddingVertical={6} paddingHorizontal={12} borderRadius={16} borderWidth={1} borderColor={isSelected ? '#81C784' : '#E0E0E0'}>
                            <Ionicons name={isSelected ? "checkmark-circle" : "add-circle-outline"} size={16} color={isSelected ? COLORS.darkGreen : "#666"} style={{ marginRight: 6 }} />
                            <Text fontSize={12} color={isSelected ? COLORS.darkGreen : "#666"} fontWeight={isSelected ? "bold" : "normal"}>
                              Add {addon.name} (+Rs {addon.priceMinor/100}/{item.unit || 'piece'})
                            </Text>
                          </XStack>
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>
                )}
              </YStack>
            );
          })}
        </YStack>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      {totalItems > 0 ? (
        <XStack position="absolute" bottom={0} left={0} right={0} backgroundColor={COLORS.white} justifyContent="space-between" alignItems="center" paddingHorizontal={20} paddingTop={16} paddingBottom={30} elevation={10} shadowColor="#000" shadowOffset={{ width: 0, height: -4 }} shadowOpacity={0.1} shadowRadius={10} borderTopLeftRadius={24} borderTopRightRadius={24}>
          <YStack flex={1}>
            <Text fontSize={13} color="#666" fontWeight="500">{totalItems} items</Text>
            <Text fontSize={20} fontWeight="900" color={COLORS.black}>Rs {totalPrice}</Text>
          </YStack>
          
          <XStack>
            <AnimatedPressable style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.darkGreen, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, marginRight: 8 }} onPress={handleAddToCart}>
              <Text color={COLORS.darkGreen} fontSize={14} fontWeight="bold">Add to Cart</Text>
            </AnimatedPressable>
            
            <AnimatedPressable style={{ backgroundColor: COLORS.darkGreen, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24 }} onPress={handleBuyNow}>
              <Text color={COLORS.white} fontSize={14} fontWeight="bold">Buy Now</Text>
            </AnimatedPressable>
          </XStack>
        </XStack>
      ) : null}
    </YStack>
  );
}
