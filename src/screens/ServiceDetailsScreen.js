import React, { useState } from 'react';
import { Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { YStack, XStack, ZStack, Text } from '../components/Stacks';




import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from '../components/AnimatedPressable';
import { COLORS, SIZES } from '../constants/theme';

const MOCK_ITEMS = [
  { id: '1', name: 'T-Shirt / Shirt', price: 50 },
  { id: '2', name: 'Trousers / Jeans', price: 70 },
  { id: '3', name: 'Jacket / Coat', price: 150 },
  { id: '4', name: 'Dress / Gown', price: 200 },
];

export default function ServiceDetailsScreen({ route, navigation }) {
  const { service } = route.params;
  const [quantities, setQuantities] = useState({});

  const updateQuantity = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = MOCK_ITEMS.reduce((sum, item) => sum + (quantities[item.id] || 0) * item.price, 0);

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header Image Area */}
        <YStack width="100%" height={320} position="relative">
          <Image source={service.img} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <YStack {...StyleSheet.absoluteFillObject} backgroundColor="rgba(15, 44, 21, 0.3)" />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
          />

          <TouchableOpacity style={{ position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <YStack position="absolute" bottom={40} left={20} zIndex={5}>
            <Text color={COLORS.vibrantYellow} fontSize={12} fontWeight="bold" letterSpacing={1} marginBottom={5}>{service.category}</Text>
            <Text color={COLORS.white} fontSize={28} fontWeight="900">{service.title}</Text>
          </YStack>
        </YStack>

        {/* Content Area */}
        <YStack padding={24}>
          <Text fontSize={18} fontWeight="bold" marginBottom={20}>Select Garments</Text>
          
          {MOCK_ITEMS.map(item => {
            const qty = quantities[item.id] || 0;
            return (
              <XStack key={item.id} justifyContent="space-between" alignItems="center" backgroundColor={COLORS.white} padding={16} borderRadius={12} marginBottom={12} shadowColor={COLORS.vibrantYellow} shadowOffset={{ width: 0, height: 0 }} shadowOpacity={0.6} shadowRadius={12} elevation={8}>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="bold" marginBottom={4}>{item.name}</Text>
                  <Text fontSize={14} color="#666">₹{item.price} / pc</Text>
                </YStack>
                
                <XStack alignItems="center" backgroundColor="#F0F0F0" borderRadius={20} padding={4}>
                  <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 }} onPress={() => updateQuantity(item.id, -1)}>
                    <Ionicons name="remove" size={18} color={COLORS.black} />
                  </TouchableOpacity>
                  <Text width={30} textAlign="center" fontSize={16} fontWeight="bold">{qty}</Text>
                  <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 }} onPress={() => updateQuantity(item.id, 1)}>
                    <Ionicons name="add" size={18} color={COLORS.black} />
                  </TouchableOpacity>
                </XStack>
              </XStack>
            );
          })}
        </YStack>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      {totalItems > 0 && (
        <XStack position="absolute" bottom={0} left={0} right={0} backgroundColor={COLORS.white} justifyContent="space-between" alignItems="center" paddingHorizontal={24} paddingTop={16} paddingBottom={30} shadowColor="#000" shadowOffset={{ width: 0, height: -4 }} shadowOpacity={0.1} shadowRadius={10} elevation={10} borderTopLeftRadius={24} borderTopRightRadius={24}>
          <YStack>
            <Text fontSize={14} color="#666" fontWeight="500">{totalItems} items</Text>
            <Text fontSize={24} fontWeight="900" color={COLORS.black}>₹{totalPrice}</Text>
          </YStack>
          <AnimatedPressable style={{ backgroundColor: '#1B3B22', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30 }} onPress={() => navigation.navigate('Home')}>
            <Text color={COLORS.white} fontSize={16} fontWeight="bold">Add to Cart</Text>
          </AnimatedPressable>
        </XStack>
      )}
    </YStack>
  );
}
