import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, ImageBackground, Modal, StyleSheet } from 'react-native';
import { useAppDimensions } from '../../../../shared/hooks/useAppDimensions';
import { YStack, XStack, ZStack, Text } from '../../../../shared/ui/primitives/Stacks';




import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import Header from '../../../../shared/ui/components/Header';
import { useCart } from '../../../../features/cart/presentation/hooks/useCart';

export default function OrdersScreen({ navigation }) {
  const { width: windowWidth } = useAppDimensions();
  const appWidth = Math.min(windowWidth, 412);
  const insets = useSafeAreaInsets();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { orderHistory } = useCart();

  const renderOrderCard = (order) => {
    // For our dynamic mock data, all placed orders are "Processing"
    const isDelivered = false;
    const statusBgColor = isDelivered ? '#E6F4EA' : '#FEF6E0'; 
    const statusTextColor = isDelivered ? COLORS.darkGreen : '#B58600';

    return (
      <YStack 
        key={order.id}
        backgroundColor={COLORS.cardBg}
        borderRadius={SIZES.radius * 1.5}
        marginBottom={SIZES.padding}
        padding={SIZES.padding}
        elevation={8}
        shadowColor={COLORS.vibrantYellow}
        shadowOffset={{ width: 0, height: 0 }}
        shadowOpacity={0.6}
        shadowRadius={12}
        borderWidth={1}
        borderColor="rgba(0,0,0,0.03)"
      >
        <XStack justifyContent="space-between" alignItems="flex-start" borderBottomWidth={1} borderBottomColor="#F0F0F0" paddingBottom={14} marginBottom={14}>
          <YStack>
            <Text fontSize={16} fontWeight="800" color={COLORS.black} letterSpacing={0.5}>Order {order.id}</Text>
            <Text fontSize={12} color={COLORS.textSecondary} marginTop={4}>Date: {new Date(order.timestamp).toLocaleDateString()}</Text>
          </YStack>
          <XStack alignItems="center" paddingHorizontal={10} paddingVertical={4} borderRadius={20} backgroundColor={statusBgColor}>
            {isDelivered ? <Ionicons name="checkmark-circle" size={14} color={statusTextColor} style={{ marginRight: 4 }} /> : <Ionicons name="time" size={14} color={statusTextColor} style={{ marginRight: 4 }} />}
            <Text fontSize={12} fontWeight="800" letterSpacing={0.2} color={statusTextColor}>
              Processing
            </Text>
          </XStack>
        </XStack>

        <XStack alignItems="center" marginBottom={18}>
          <ImageBackground source={order.items[0]?.img || require('../../../../../assets/laundry_basket.png')} style={{ width: 65, height: 65, marginRight: 16, backgroundColor: '#EAEAEA', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} imageStyle={{ borderRadius: SIZES.radius }} />
          <YStack flex={1} justifyContent="center">
            <Text fontSize={14} fontWeight="600" color="#2C2C2C" marginBottom={6}>{order.items.map(i => `${i.quantity} x ${i.title}`).join(', ')}</Text>
            <Text fontSize={18} fontWeight="900" color={COLORS.darkGreen}>₹{order.totalPrice}</Text>
          </YStack>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center" backgroundColor="#FAFBF9" padding={14} borderRadius={SIZES.radius} marginHorizontal={-8} marginBottom={-8}>
          {order.readyBy ? (
            <XStack alignItems="center">
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text fontSize={12} color={COLORS.textSecondary} fontWeight="600" marginLeft={4}>Ready in 1-2 Days</Text>
            </XStack>
          ) : (
            <TouchableOpacity style={{ paddingVertical: 4, paddingHorizontal: 8 }} onPress={() => setSelectedOrder(order)}>
              <Text fontSize={13} color={COLORS.darkGreen} fontWeight="700" textDecorationLine="underline">View Receipt</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[{ backgroundColor: isDelivered ? COLORS.white : COLORS.vibrantYellow, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 25 }, isDelivered ? { borderWidth: 1, borderColor: '#E0E0E0', elevation: 0, shadowOpacity: 0 } : { elevation: 2, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 }]}
            onPress={() => !isDelivered && navigation.navigate('OrderTracking')}
          >
            <Text color={isDelivered ? '#333333' : COLORS.black} fontWeight="800" fontSize={13}>Track</Text>
          </TouchableOpacity>
        </XStack>
      </YStack>
    );
  };

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <Header />
      <ScrollView contentContainerStyle={{ padding: SIZES.padding }} showsVerticalScrollIndicator={false}>
        <Text fontSize={20} fontWeight="900" color={COLORS.darkGreen} marginBottom={SIZES.padding} letterSpacing={0.5}>MY ORDERS</Text>
        
        {orderHistory.length === 0 ? (
          <YStack flex={1} justifyContent="center" alignItems="center" marginTop={40}>
            <Ionicons name="receipt-outline" size={60} color="#D0D0D0" />
            <Text fontSize={18} fontWeight="bold" color="#888" marginTop={16}>No Orders Yet</Text>
            <Text fontSize={14} color="#AAA" marginTop={8} textAlign="center">Looks like you haven't placed any orders. Go back to Home and add some services!</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginTop: 24, backgroundColor: COLORS.darkGreen, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 }}>
              <Text color={COLORS.white} fontWeight="bold">Start Shopping</Text>
            </TouchableOpacity>
          </YStack>
        ) : (
          orderHistory.map(renderOrderCard)
        )}
        
        <YStack height={100 + insets.bottom} />
      </ScrollView>

      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <YStack flex={1} backgroundColor="transparent" alignItems="center">
          <YStack height="100%" backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end" width={appWidth}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedOrder(null)} />
            <YStack backgroundColor={COLORS.white} borderTopLeftRadius={30} borderTopRightRadius={30} padding={24} minHeight="60%">
            <YStack width={40} height={5} backgroundColor="#DDD" borderRadius={3} alignSelf="center" marginBottom={20} />
            <Text fontSize={22} fontWeight="900" marginBottom={4}>Digital Receipt</Text>
            
            {selectedOrder && (
              <>
                <Text fontSize={16} fontWeight="700" color={COLORS.darkGreen}>Order {selectedOrder.id}</Text>
                <Text fontSize={12} color={COLORS.textSecondary} marginBottom={10}>{selectedOrder.date}</Text>
                
                <YStack height={1} backgroundColor="#EEE" marginVertical={15} />
                
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
                  <XStack justifyContent="space-between" marginBottom={10}>
                    <Text fontSize={16} color="#444" fontWeight="600">{selectedOrder.items.map(i => `${i.quantity} x ${i.title}`).join(', ')}</Text>
                    <Text fontSize={14} fontWeight="bold">₹{selectedOrder.totalPrice}</Text>
                  </XStack>
                </ScrollView>
                
                <YStack height={1} backgroundColor="#EEE" marginVertical={15} />
                
                <XStack justifyContent="space-between" marginBottom={10}>
                  <Text fontSize={14} color="#666">Subtotal</Text>
                  <Text fontSize={14} fontWeight="bold">₹{selectedOrder.totalPrice}</Text>
                </XStack>
                <XStack justifyContent="space-between" marginBottom={10}>
                  <Text fontSize={14} color="#666">Delivery Fee</Text>
                  <Text fontSize={14} fontWeight="bold" color="#27AE60">FREE</Text>
                </XStack>
                <XStack justifyContent="space-between" marginBottom={10} marginTop={10}>
                  <Text fontSize={18} fontWeight="900">Total Paid</Text>
                  <Text fontSize={24} fontWeight="900" color={COLORS.black}>₹{selectedOrder.totalPrice}</Text>
                </XStack>

                <TouchableOpacity 
                  style={{ backgroundColor: '#1B3B22', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 30 }} 
                  onPress={() => { alert('Receipt downloaded successfully!'); setSelectedOrder(null); }}
                >
                  <Ionicons name="download-outline" size={20} color={COLORS.white} />
                  <Text color={COLORS.white} fontSize={14} fontWeight="900" letterSpacing={1} marginLeft={10}>DOWNLOAD PDF</Text>
                </TouchableOpacity>
              </>
            )}
          </YStack>
        </YStack>
        </YStack>
      </Modal>
    </YStack>
  );
}
