import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { Order } from '../../domain/Order';
import { useOrdersQuery } from '../../application/useOrdersQuery';
import { getOrderStatusMeta } from '../../domain/orderStatusMeta';
import { Ionicons } from '@expo/vector-icons';

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const { data: orders = [], isLoading, refetch } = useOrdersQuery();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
    const meta = getOrderStatusMeta(item.status);
    
    return (
      <AnimatedPressable 
        style={styles.orderCard} 
        onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#SK-{item.id.substring(0, 8).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: meta.color + '20' }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        <Text style={styles.summaryText}>
          {item.items.reduce((acc, curr) => acc + curr.quantity, 0)} items • ₹{(item.finalAmountMinor / 100).toFixed(2)}
        </Text>

        <View style={styles.pickupRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.pickupText}>
            Pickup: {item.pickupSlotSnapshot.date} • {item.pickupSlotSnapshot.startTime}-{item.pickupSlotSnapshot.endTime}
          </Text>
        </View>
      </AnimatedPressable>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.darkGreen} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>
      
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>No orders yet</Text>
            <AnimatedPressable style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.browseBtnText}>Browse Services</Text>
            </AnimatedPressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  header: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: SIZES.padding,
  },
  orderCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SIZES.small,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.base,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    padding: 8,
    borderRadius: 8,
  },
  pickupText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.extraLarge * 2,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: SIZES.padding,
    marginBottom: SIZES.extraLarge,
  },
  browseBtn: {
    backgroundColor: COLORS.darkGreen,
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.extraLarge,
    borderRadius: SIZES.radius,
  },
  browseBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  }
});
