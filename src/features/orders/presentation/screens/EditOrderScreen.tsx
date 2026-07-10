import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { OrdersRepository } from '../../infrastructure/OrdersRepository';
import { Order, OrderItem } from '../../domain/Order';
import { httpsCallable, getFunctions } from 'firebase/functions';

type RouteParams = RouteProp<{ EditOrder: { orderId: string } }, 'EditOrder'>;

export default function EditOrderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const repo = new OrdersRepository();
      const currentOrder = await repo.getOrder(orderId);
      if (currentOrder) {
        setOrder(currentOrder);
        setItems(currentOrder.items);
      }
      setIsLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const newQty = Math.max(0, newItems[index].quantity + delta);
    newItems[index].quantity = newQty;
    setItems(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const functions = getFunctions();
      const editOrderItemsFn = httpsCallable(functions, 'editOrderItems');
      
      const payloadItems = items.filter(i => i.quantity > 0).map(i => ({
        serviceId: i.serviceId,
        quantity: i.quantity,
        addons: i.addons || []
      }));

      await editOrderItemsFn({ orderId, items: payloadItems });
      
      Alert.alert('Success', 'Order updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update order.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !order) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.darkGreen} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Order Items</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.darkGreen} style={{ marginRight: 8 }} />
          <Text style={styles.warningText}>
            You can add or remove items. If the total increases, you'll need to pay the difference. If it decreases, we'll refund the difference.
          </Text>
        </View>

        {items.map((item, index) => {
          if (item.quantity === 0) return null; // Hidden if removed
          const hasAddons = item.addons && item.addons.length > 0;
          return (
            <View key={`${item.serviceId}-${index}`} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.nameSnapshot}</Text>
                {hasAddons && (
                  <Text style={{ color: '#0F9D58', fontSize: 11, marginTop: 4 }}>
                    {item.addons!.map(a => a.name).join(', ')} added
                  </Text>
                )}
                {item.priceType === 'variable' ? (
                  <Text style={styles.itemPrice}>Variable Price</Text>
                ) : (
                  <Text style={styles.itemPrice}>Rs {(item.unitPriceMinor || 0) / 100}</Text>
                )}
              </View>
              
              <View style={styles.qtyControls}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(index, -1)}>
                  <Ionicons name="remove" size={18} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(index, 1)}>
                  <Ionicons name="add" size={18} color={COLORS.black} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <AnimatedPressable 
          style={styles.addMoreBtn} 
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.darkGreen} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORS.darkGreen, fontWeight: 'bold' }}>Add More Items from Catalog</Text>
        </AnimatedPressable>

      </ScrollView>

      <View style={styles.footer}>
        <AnimatedPressable onPress={handleSave} disabled={isSaving}>
          <View style={[styles.saveBtn, isSaving && { backgroundColor: '#A0A0A0' }]}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </View>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SIZES.padding,
    paddingBottom: 100,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9F4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    marginBottom: SIZES.extraLarge,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.darkGreen,
    lineHeight: 18,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: SIZES.radius,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  qtyText: {
    width: 30,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.darkGreen,
    borderRadius: SIZES.radius,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.darkGreen,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
