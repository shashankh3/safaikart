import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { Order } from '../../domain/Order';
import { ORDER_STATUS_FLOW } from '../../domain/OrderStatus';
import { getOrderStatusMeta } from '../../domain/orderStatusMeta';
import { GetOrderTrackingUseCase } from '../../application/getOrderTracking.usecase';
import { CancelOrderUseCase } from '../../application/cancelOrder.usecase';
import { OrdersRepository } from '../../infrastructure/OrdersRepository';
import { Ionicons } from '@expo/vector-icons';
import { useReorder } from '../../application/useReorder';

type RouteParams = RouteProp<{ Tracking: { orderId: string } }, 'Tracking'>;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [timeRemainingSecs, setTimeRemainingSecs] = useState<number>(0);

  const { reorder } = useReorder();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const repository = new OrdersRepository();
    const trackingUseCase = new GetOrderTrackingUseCase(repository);

    const unsubscribe = trackingUseCase.execute(orderId, (updatedOrder) => {
      setOrder(updatedOrder);
      setIsLoading(false);
      
      // Calculate initial time remaining if editableUntil exists
      if (updatedOrder?.editableUntil) {
        const editableTime = updatedOrder.editableUntil.toMillis();
        const now = Date.now();
        setTimeRemainingSecs(Math.max(0, Math.floor((editableTime - now) / 1000)));
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    // Pulse animation for current step
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    let interval: any;
    if (timeRemainingSecs > 0) {
      interval = setInterval(() => {
        setTimeRemainingSecs(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemainingSecs]);

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const cancelUseCase = new CancelOrderUseCase(new OrdersRepository());
              await cancelUseCase.execute(orderId);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to cancel order.');
            } finally {
              setIsCancelling(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.darkGreen} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Order not found.</Text>
      </View>
    );
  }

  const currentStatusIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUND_PENDING' || order.status === 'REFUNDED';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </AnimatedPressable>
        <Text style={styles.title}>Track Order</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardRow}>
            <Text style={styles.orderId}>#SK-{order.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={styles.amount}>₹{(order.finalAmountMinor / 100).toFixed(2)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.addressText} numberOfLines={1}>
              {order.addressSnapshot?.line1}, {order.addressSnapshot?.city}
            </Text>
          </View>
          
          <View style={styles.cardRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.addressText}>
              {order.pickupSlotSnapshot?.date} • {order.pickupSlotSnapshot?.startTime}-{order.pickupSlotSnapshot?.endTime}
            </Text>
          </View>
        </View>

        {/* Timeline Header (Est Delivery) */}
        {order.estimatedDeliveryDate && (
          <View style={{ backgroundColor: '#F0F9F4', padding: 12, borderRadius: SIZES.radius, marginBottom: 12, borderWidth: 1, borderColor: '#A5D6A7' }}>
            <Text style={{ textAlign: 'center', color: COLORS.darkGreen, fontWeight: 'bold' }}>
              Expected delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
        )}

        {/* Live Delivery Partner Map Banner (Zomato-style) */}
        {!isCancelled && order.status !== 'PAYMENT_PENDING' && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('LiveDeliveryTracking', { orderId: order.id })}
            style={{
              backgroundColor: '#1B3B22',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4C73E', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 22 }}>🛵</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 }} />
                  <Text style={{ color: '#F4C73E', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>LIVE MAP TRACKING</Text>
                </View>
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 2 }}>Track Delivery Partner</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>Live rider location & arrival ETA</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F4C73E" />
          </TouchableOpacity>
        )}

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          {isCancelled ? (
            <View style={styles.cancelledState}>
              <Ionicons name="close-circle" size={48} color="#FF3B30" />
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledSub}>
                {order.status === 'REFUND_PENDING' ? 'Refund is being processed.' : 
                 order.status === 'REFUNDED' ? 'Refund completed.' : ''}
              </Text>
            </View>
          ) : order.status === 'PAYMENT_PENDING' ? (
            <View style={styles.cancelledState}>
              <Ionicons name="time" size={48} color={COLORS.vibrantYellow} />
              <Text style={styles.cancelledTitle}>Payment Pending</Text>
              <AnimatedPressable 
                style={styles.payBtn}
                onPress={() => navigation.navigate('CheckoutFlow', { screen: 'Payment', params: { orderId: order.id, amount: order.finalAmountMinor } })}
              >
                <Text style={styles.payBtnText}>Complete Payment</Text>
              </AnimatedPressable>
            </View>
          ) : (
            ORDER_STATUS_FLOW.map((flowStatus, index) => {
              const isCompleted = currentStatusIndex > index;
              const isCurrent = currentStatusIndex === index;
              const isFuture = currentStatusIndex < index;

              return (
                <View key={flowStatus} style={styles.timelineRow}>
                  {/* Left: Line and Dot */}
                  <View style={styles.timelineIndicator}>
                    {index !== 0 && (
                      <View style={[styles.line, isCompleted || isCurrent ? styles.lineActive : styles.lineInactive]} />
                    )}
                    
                    {isCompleted ? (
                      <View style={[styles.dot, styles.dotCompleted]}>
                        <Ionicons name="checkmark" size={12} color={COLORS.white} />
                      </View>
                    ) : isCurrent ? (
                      <Animated.View style={[styles.dot, styles.dotCurrent, { transform: [{ scale: pulseAnim }] }]} />
                    ) : (
                      <View style={[styles.dot, styles.dotFuture]} />
                    )}
                  </View>

                  {/* Right: Content */}
                  <View style={styles.timelineContent}>
                    <View style={styles.statusRow}>
                      <Ionicons 
                        name={getOrderStatusMeta(flowStatus).icon as any} 
                        size={20} 
                        color={isCompleted || isCurrent ? COLORS.darkGreen : COLORS.border} 
                      />
                      <Text style={[
                        styles.statusLabel,
                        isCurrent && styles.statusLabelCurrent,
                        isFuture && styles.statusLabelFuture
                      ]}>
                        {getOrderStatusMeta(flowStatus).label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Edit Window Actions */}
        {(order.status === 'CONFIRMED' || order.status === 'PAYMENT_PENDING') && (
          <View style={{ marginTop: SIZES.extraLarge }}>
            {timeRemainingSecs > 0 ? (
              <>
                <Text style={{ textAlign: 'center', marginBottom: 12, fontWeight: 'bold', color: timeRemainingSecs < 60 ? '#FF3B30' : COLORS.textSecondary }}>
                  {Math.floor(timeRemainingSecs / 60)}:{(timeRemainingSecs % 60).toString().padStart(2, '0')} remaining to edit your order
                </Text>
                
                <AnimatedPressable 
                  style={[styles.cancelBtn, { borderColor: COLORS.darkGreen, marginBottom: 12 }]} 
                  onPress={() => navigation.navigate('EditOrder', { orderId: order.id })}
                >
                  <Text style={[styles.cancelBtnText, { color: COLORS.darkGreen }]}>Edit Order</Text>
                </AnimatedPressable>

                <AnimatedPressable 
                  style={styles.cancelBtn} 
                  onPress={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? <ActivityIndicator color="#FF3B30" /> : <Text style={styles.cancelBtnText}>Cancel Order</Text>}
                </AnimatedPressable>
              </>
            ) : (
              <View style={{ backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                <Ionicons name="lock-closed" size={24} color={COLORS.textSecondary} />
                <Text style={{ marginTop: 8, color: COLORS.textSecondary, fontWeight: 'bold' }}>Order locked — no further edits possible</Text>
              </View>
            )}
          </View>
        )}

        {/* Reorder Button */}
        {order.status === 'DELIVERED' && (
          <AnimatedPressable 
            style={[styles.cancelBtn, { borderColor: COLORS.darkGreen, backgroundColor: COLORS.darkGreen, marginTop: SIZES.padding }]} 
            onPress={async () => {
              await reorder(order);
              navigation.navigate('MainTabs', { screen: 'Home' });
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="refresh" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={[styles.cancelBtnText, { color: COLORS.white }]}>Reorder</Text>
            </View>
          </AnimatedPressable>
        )}

        {/* Support Button */}
        <AnimatedPressable 
          style={[styles.cancelBtn, { borderColor: COLORS.border, marginTop: SIZES.padding }]} 
          onPress={() => navigation.navigate('Support', { orderId: order.id })}
        >
          <Text style={[styles.cancelBtnText, { color: COLORS.textSecondary }]}>Report an Issue</Text>
        </AnimatedPressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: SIZES.padding,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  scrollContent: {
    padding: SIZES.padding,
    paddingBottom: SIZES.extraLarge * 2,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.extraLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGreen,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.small,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SIZES.base,
    flex: 1,
  },
  timelineContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIndicator: {
    width: 30,
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 30,
  },
  lineActive: {
    backgroundColor: COLORS.success,
  },
  lineInactive: {
    backgroundColor: COLORS.border,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCompleted: {
    backgroundColor: COLORS.success,
  },
  dotCurrent: {
    backgroundColor: COLORS.vibrantYellow,
    borderWidth: 3,
    borderColor: COLORS.primaryBg,
  },
  dotFuture: {
    backgroundColor: COLORS.primaryBg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: SIZES.padding,
    paddingVertical: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: SIZES.small,
  },
  statusLabelCurrent: {
    color: COLORS.darkGreen,
  },
  statusLabelFuture: {
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  cancelledState: {
    alignItems: 'center',
    paddingVertical: SIZES.extraLarge,
  },
  cancelledTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: SIZES.small,
  },
  cancelledSub: {
    color: COLORS.textSecondary,
    marginTop: SIZES.base,
  },
  payBtn: {
    backgroundColor: COLORS.darkGreen,
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding,
  },
  payBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: SIZES.extraLarge,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
