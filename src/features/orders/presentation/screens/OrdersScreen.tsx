import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  TouchableOpacity, 
  ImageBackground,
  Platform,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { Order } from '../../domain/Order';
import { useOrdersQuery } from '../../application/useOrdersQuery';
import { getOrderStatusMeta } from '../../domain/orderStatusMeta';
import Skeleton from '../../../../shared/ui/components/Skeleton';

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { data: orders = [], isLoading, isError, refetch } = useOrdersQuery();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    if (activeTab === 'ACTIVE') {
      return orders.filter(o => o && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    }
    if (activeTab === 'COMPLETED') {
      return orders.filter(o => o && (o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'REFUNDED'));
    }
    return orders.filter(Boolean);
  }, [orders, activeTab]);

  const activeOrdersCount = useMemo(() => {
    if (!Array.isArray(orders)) return 0;
    return orders.filter(o => o && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED').length;
  }, [orders]);

  const renderOrder = ({ item }: { item: Order }) => {
    if (!item) return null;

    let date = new Date();
    try {
      const rawDate = item.createdAt as any;
      if (rawDate && typeof rawDate.toDate === 'function') {
        date = rawDate.toDate();
      } else if (rawDate && typeof rawDate.toMillis === 'function') {
        date = new Date(rawDate.toMillis());
      } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
        date = new Date(rawDate);
      }
    } catch (_) {}

    const meta = getOrderStatusMeta(item.status);
    const isActive = item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && item.status !== 'REFUNDED';
    const isDelivered = item.status === 'DELIVERED';
    const isCancelled = item.status === 'CANCELLED' || item.status === 'REFUNDED';
    
    const itemsList = Array.isArray(item.items) ? item.items : [];
    const itemCount = itemsList.reduce((acc, curr) => acc + (curr?.quantity || 1), 0);
    const orderIdStr = item.id ? item.id.substring(0, 8).toUpperCase() : 'ORDER';
    const totalAmount = typeof item.finalAmountMinor === 'number' 
      ? (item.finalAmountMinor / 100).toFixed(2) 
      : '0.00';

    return (
      <AnimatedPressable 
        style={styles.orderCard} 
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (item.id) {
            navigation.navigate('OrderTracking', { orderId: item.id });
          }
        }}
      >
        {/* Card Top Row: Order ID & Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <View style={[styles.orderIconBox, isActive && { backgroundColor: '#ECFDF5' }]}>
              <MaterialCommunityIcons 
                name={isActive ? "truck-delivery-outline" : isDelivered ? "check-decagram-outline" : "close-circle-outline"} 
                size={20} 
                color={isActive ? COLORS.darkGreen : isDelivered ? '#0B8043' : '#E51A1A'} 
              />
            </View>
            <View>
              <Text style={styles.orderIdText}>#SK-{orderIdStr}</Text>
              <Text style={styles.dateText}>
                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[
            styles.statusBadge, 
            { backgroundColor: meta.color + '18', borderColor: meta.color + '30' }
          ]}>
            {isActive && <View style={[styles.pulseDot, { backgroundColor: meta.color }]} />}
            <Text style={[styles.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Card Middle Row: Items preview & Total Price */}
        <View style={styles.detailsRow}>
          <View style={styles.itemsSummary}>
            <View style={styles.itemTag}>
              <Text style={styles.itemTagText}>📦 {itemCount} {itemCount === 1 ? 'Item' : 'Items'}</Text>
            </View>
            {itemsList.slice(0, 2).map((itm, idx) => (
              <Text key={idx} style={styles.itemPreviewName} numberOfLines={1}>
                • {itm?.nameSnapshot || itm?.serviceId || 'Service Item'} {itm?.quantity && itm.quantity > 1 ? `(x${itm.quantity})` : ''}
              </Text>
            ))}
            {itemsList.length > 2 && (
              <Text style={styles.moreItemsText}>+{itemsList.length - 2} more</Text>
            )}
            {itemsList.length === 0 && (
              <Text style={styles.itemPreviewName}>• Standard Cleaning Service</Text>
            )}
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total Amount</Text>
            <Text style={styles.priceValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Pickup Time Slot Banner */}
        <View style={styles.slotBanner}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.darkGreen} />
          <Text style={styles.slotBannerText} numberOfLines={1}>
            Pickup: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{item.pickupSlotSnapshot?.date || 'Scheduled'}</Text> ({item.pickupSlotSnapshot?.startTime || 'Morning'} - {item.pickupSlotSnapshot?.endTime || 'Evening'})
          </Text>
        </View>

        {/* Live Tracking / View Details Button */}
        {isActive ? (
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (item.id) {
                navigation.navigate('LiveDeliveryTracking', { orderId: item.id });
              }
            }}
            style={styles.liveTrackingBtn}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.scooterIconBox}>
                <Text style={{ fontSize: 13 }}>🛵</Text>
              </View>
              <Text style={styles.liveTrackingBtnText}>Track Delivery Live on Map</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.cardFooterRow}>
            <Text style={styles.viewTimelineText}>View order timeline & receipt</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </View>
        )}
      </AnimatedPressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Signature SafaiKart Dark Green Header */}
      <ImageBackground 
        source={require('../../../../../assets/premium-bg.jpg.png')} 
        style={[styles.headerBg, { paddingTop: insets.top }]} 
        imageStyle={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        resizeMode="cover"
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>My Orders</Text>
              <Text style={styles.headerSubtitle}>
                {orders.length === 0 
                  ? 'No order history yet' 
                  : `${orders.length} total • ${activeOrdersCount} active`}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleRefresh}
              style={styles.refreshIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Filter Tab Chips */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tabChip, activeTab === 'ALL' && styles.tabChipActive]}
              onPress={() => setActiveTab('ALL')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
                All ({orders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabChip, activeTab === 'ACTIVE' && styles.tabChipActive]}
              onPress={() => setActiveTab('ACTIVE')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
                Active ({activeOrdersCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabChip, activeTab === 'COMPLETED' && styles.tabChipActive]}
              onPress={() => setActiveTab('COMPLETED')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
                Completed ({orders.length - activeOrdersCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Orders Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Skeleton width={140} height={20} borderRadius={6} />
                <Skeleton width={80} height={20} borderRadius={10} />
              </View>
              <Skeleton width={200} height={14} style={{ marginBottom: 10 }} />
              <Skeleton width="100%" height={38} borderRadius={8} />
            </View>
          ))}
        </View>
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="alert-circle-outline" size={40} color="#E51A1A" />
          </View>
          <Text style={styles.emptyTitle}>Failed to Load Orders</Text>
          <Text style={styles.emptySubtitle}>We couldn't retrieve your order history. Please check your internet connection.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => refetch()} activeOpacity={0.85}>
            <Text style={styles.browseBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              colors={[COLORS.darkGreen]} 
              tintColor={COLORS.darkGreen}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="basket-outline" size={44} color={COLORS.darkGreen} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'ACTIVE' ? 'No Active Orders' : activeTab === 'COMPLETED' ? 'No Completed Orders' : 'No Orders Placed Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ACTIVE'
                  ? 'You do not have any orders in progress right now.'
                  : 'Schedule your first laundry, dry cleaning, or shoe care pickup today!'}
              </Text>
              <TouchableOpacity 
                style={styles.browseBtn} 
                onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
                activeOpacity={0.85}
              >
                <Text style={styles.browseBtnText}>Book a Service</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBg: {
    width: '100%',
    backgroundColor: '#0F301F',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    fontWeight: '500',
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 4,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabChipActive: {
    backgroundColor: COLORS.vibrantYellow,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  tabTextActive: {
    color: '#0F301F',
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemsSummary: {
    flex: 1,
    paddingRight: 12,
  },
  itemTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  itemTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  itemPreviewName: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  moreItemsText: {
    fontSize: 11,
    color: COLORS.darkGreen,
    fontWeight: '700',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B8043',
  },
  slotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  slotBannerText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
    flex: 1,
  },
  liveTrackingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B8043',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#0B8043',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  scooterIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  liveTrackingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  viewTimelineText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B8043',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#0B8043',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
