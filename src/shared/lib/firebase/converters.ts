import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Order, CartItem } from '../../types';

export const orderConverter: any = {
  toFirestore(order: Order): any {
    return {
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      priceConfirmed: order.priceConfirmed,
      items: order.items,
      subtotalMinor: order.subtotalMinor,
      deliveryFeeMinor: order.deliveryFeeMinor,
      discountMinor: order.discountMinor,
      taxMinor: order.taxMinor,
      finalAmountMinor: order.finalAmountMinor,
      currency: order.currency,
      couponCode: order.couponCode || null,
      addressId: order.addressId,
      addressSnapshot: order.addressSnapshot,
      pickupSlotId: order.pickupSlotId,
      pickupSlotSnapshot: order.pickupSlotSnapshot,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  },
  fromFirestore(
    snapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot,
    options: FirebaseFirestoreTypes.SnapshotOptions

  ): Order {
    const data = snapshot.data()!;
    return {
      id: snapshot.id,
      userId: data.userId,
      status: data.status,
      paymentStatus: data.paymentStatus,
      priceConfirmed: data.priceConfirmed,
      items: data.items,
      subtotalMinor: data.subtotalMinor,
      deliveryFeeMinor: data.deliveryFeeMinor,
      discountMinor: data.discountMinor,
      taxMinor: data.taxMinor,
      finalAmountMinor: data.finalAmountMinor,
      currency: data.currency,
      couponCode: data.couponCode,
      addressId: data.addressId,
      addressSnapshot: data.addressSnapshot,
      pickupSlotId: data.pickupSlotId,
      pickupSlotSnapshot: data.pickupSlotSnapshot,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
};
