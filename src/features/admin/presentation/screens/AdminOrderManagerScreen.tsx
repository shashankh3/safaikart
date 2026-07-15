import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, TextInput, ActivityIndicator, Alert, LayoutAnimation } from 'react-native';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, functions } from '../../../../app/config/firebase';
import { collection, onSnapshot, query, orderBy } from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { Order, OrderItem } from '../../../orders/domain/Order';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PAYMENT_PENDING: ['CANCELLED'],
  CONFIRMED: ['PICKUP_SCHEDULED', 'CANCELLED'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['CLEANING_IN_PROGRESS', 'CANCELLED'],
  CLEANING_IN_PROGRESS: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUND_PENDING: [],
  REFUNDED: [],
};

const FILTERS = ['All', 'Active', 'DELIVERED', 'CANCELLED'];

export default function AdminOrderManagerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Active');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // orderId -> { serviceId -> { quantity, unitPriceMinor } }
  const [priceForms, setPriceForms] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Order[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
      Alert.alert('Error', 'Could not load orders.');
    });

    return () => unsubscribe();
  }, []);

  const handleAdvanceStatus = async (orderId: string, newStatus: string) => {
    setActionLoadingId(orderId);
    try {
      const adminUpdateOrderStatus = httpsCallable(functions, 'adminUpdateOrderStatus');
      await adminUpdateOrderStatus({ orderId, newStatus });
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmPrice = async (orderId: string, items: OrderItem[]) => {
    const formState = priceForms[orderId];
    if (!formState) return;

    const payloadItems = items.filter(i => i.priceType === 'variable').map(i => {
      const formItem = formState[i.serviceId];
      return {
        serviceId: i.serviceId,
        quantity: parseInt(formItem?.quantity || i.quantity),
        unitPriceMinor: parseInt(formItem?.unitPriceMinor || '0'),
      };
    });

    if (payloadItems.some(i => i.unitPriceMinor <= 0)) {
       Alert.alert('Invalid Price', 'Please enter valid prices for all variable items.');
       return;
    }

    setActionLoadingId(orderId);
    try {
      const adminConfirmOrderPrice = httpsCallable(functions, 'adminConfirmOrderPrice');
      await adminConfirmOrderPrice({ orderId, items: payloadItems });
      Alert.alert('Success', 'Prices confirmed successfully.');
    } catch (e: any) {
      Alert.alert('Confirmation Failed', e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (orderId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const updatePriceForm = (orderId: string, serviceId: string, field: string, value: string) => {
    setPriceForms(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [serviceId]: {
          ...(prev[orderId]?.[serviceId] || {}),
          [field]: value
        }
      }
    }));
  };

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'DELIVERED') return o.status === 'DELIVERED';
    if (activeFilter === 'CANCELLED') return o.status === 'CANCELLED';
    return o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED';
  });

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      <XStack paddingHorizontal={SIZES.padding} paddingTop={insets.top + 10} paddingBottom={20} alignItems="center" backgroundColor={COLORS.white} elevation={4}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text fontSize={20} fontWeight="900" color={COLORS.black} marginLeft={12}>Order Manager</Text>
      </XStack>

      <XStack padding={SIZES.padding} gap={10} style={{ overflow: 'scroll' }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)}>
            <View style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: activeFilter === f ? COLORS.darkGreen : '#E0E0E0'
            }}>
              <Text color={activeFilter === f ? COLORS.white : COLORS.black} fontWeight="bold">{f}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </XStack>

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={COLORS.darkGreen} />
        </YStack>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SIZES.padding, gap: 16 }}>
          {filteredOrders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const allowedNext = ALLOWED_TRANSITIONS[order.status] || [];
            const needsPriceConfirmation = !order.priceConfirmed && order.items.some(i => i.priceType === 'variable');
            const isWorking = actionLoadingId === order.id;

            return (
              <YStack key={order.id} backgroundColor={COLORS.white} borderRadius={16} padding={16} elevation={2} shadowColor="#000" shadowOpacity={0.05} shadowRadius={8} shadowOffset={{ width: 0, height: 4 }}>
                <TouchableOpacity onPress={() => toggleExpand(order.id)}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                      <Text fontSize={16} fontWeight="bold">Order #{order.id.slice(-6).toUpperCase()}</Text>
                      <Text fontSize={13} color="#666" marginTop={4}>{order.status} • {order.items.length} items</Text>
                    </YStack>
                    <YStack alignItems="flex-end">
                       <Text fontSize={16} fontWeight="bold" color={COLORS.darkGreen}>₹{(order.finalAmountMinor / 100).toFixed(2)}</Text>
                       <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" style={{ marginTop: 4 }} />
                    </YStack>
                  </XStack>
                </TouchableOpacity>

                {isExpanded && (
                  <YStack marginTop={16} paddingTop={16} borderTopWidth={1} borderTopColor="#F0F0F0" gap={16}>
                    <YStack>
                       <Text fontWeight="bold" marginBottom={8}>Items:</Text>
                       {order.items.map((item, idx) => (
                         <XStack key={idx} justifyContent="space-between" marginBottom={4}>
                           <Text>{item.quantity}x {item.nameSnapshot}</Text>
                           <Text>₹{item.priceType === 'variable' ? 'Variable' : ((item.lineTotalMinor || 0) / 100).toFixed(2)}</Text>
                         </XStack>
                       ))}
                    </YStack>

                    <YStack>
                       <Text fontWeight="bold" marginBottom={8}>Address:</Text>
                       <Text color="#666">{order.addressSnapshot?.line1}, {order.addressSnapshot?.line2}</Text>
                       <Text color="#666">{order.addressSnapshot?.city}, {order.addressSnapshot?.pincode}</Text>
                    </YStack>

                    <YStack>
                       <Text fontWeight="bold" marginBottom={8}>Pickup:</Text>
                       <Text color="#666">{order.pickupSlotSnapshot?.date} {order.pickupSlotSnapshot?.startTime} - {order.pickupSlotSnapshot?.endTime}</Text>
                    </YStack>

                    {needsPriceConfirmation && (
                      <YStack backgroundColor="#FFF3E0" padding={12} borderRadius={8}>
                        <Text fontWeight="bold" color="#E65100" marginBottom={12}>Confirm Variable Prices</Text>
                        {order.items.filter(i => i.priceType === 'variable').map(item => {
                           const form = priceForms[order.id]?.[item.serviceId] || {};
                           return (
                             <XStack key={item.serviceId} alignItems="center" gap={10} marginBottom={8}>
                               <Text flex={1} fontSize={12}>{item.nameSnapshot}</Text>
                               <TextInput
                                 placeholder="Qty"
                                 keyboardType="numeric"
                                 style={{ backgroundColor: '#fff', padding: 8, borderRadius: 4, width: 50, borderWidth: 1, borderColor: '#CCC' }}
                                 value={form.quantity || String(item.quantity)}
                                 onChangeText={(v) => updatePriceForm(order.id, item.serviceId, 'quantity', v)}
                               />
                               <TextInput
                                 placeholder="Unit ₹ (paisa)"
                                 keyboardType="numeric"
                                 style={{ backgroundColor: '#fff', padding: 8, borderRadius: 4, flex: 1, borderWidth: 1, borderColor: '#CCC' }}
                                 value={form.unitPriceMinor || ''}
                                 onChangeText={(v) => updatePriceForm(order.id, item.serviceId, 'unitPriceMinor', v)}
                               />
                             </XStack>
                           );
                        })}
                        <TouchableOpacity
                          disabled={isWorking}
                          onPress={() => handleConfirmPrice(order.id, order.items)}
                          style={{ backgroundColor: '#E65100', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 }}
                        >
                          {isWorking ? <ActivityIndicator color="#fff" /> : <Text color="#fff" fontWeight="bold">Confirm Prices</Text>}
                        </TouchableOpacity>
                      </YStack>
                    )}

                    {!needsPriceConfirmation && allowedNext.length > 0 && (
                      <YStack gap={8}>
                        <Text fontWeight="bold" marginBottom={4}>Advance Order:</Text>
                        <XStack flexWrap="wrap" gap={8}>
                          {allowedNext.map(nextStatus => (
                            <TouchableOpacity
                              key={nextStatus}
                              disabled={isWorking}
                              onPress={() => handleAdvanceStatus(order.id, nextStatus)}
                              style={{
                                backgroundColor: nextStatus === 'CANCELLED' ? '#FFEBEE' : COLORS.darkGreen,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                borderRadius: 8,
                                flex: 1,
                                alignItems: 'center'
                              }}
                            >
                               {isWorking ? <ActivityIndicator color={nextStatus === 'CANCELLED' ? '#D32F2F' : '#fff'} /> : (
                                 <Text color={nextStatus === 'CANCELLED' ? '#D32F2F' : '#fff'} fontWeight="bold" fontSize={12}>
                                   {nextStatus.replace(/_/g, ' ')}
                                 </Text>
                               )}
                            </TouchableOpacity>
                          ))}
                        </XStack>
                      </YStack>
                    )}
                  </YStack>
                )}
              </YStack>
            );
          })}
          {filteredOrders.length === 0 && (
             <Text textAlign="center" color="#666" marginTop={20}>No orders found.</Text>
          )}
        </ScrollView>
      )}
    </YStack>
  );
}
