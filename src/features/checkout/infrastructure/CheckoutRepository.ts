import {collection, getDocs, query, where, orderBy, doc, getDoc} from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { db, functions } from '../../../app/config/firebase';
import { PickupSlot } from '../domain/PickupSlot';

export class CheckoutRepository {
  async getPickupSlots(): Promise<PickupSlot[]> {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    const maxStr = maxDate.toISOString().slice(0, 10);

    const q = query(
      collection(db, 'pickupSlots'),
      where('isActive', '==', true),
      where('date', '>=', todayStr),
      where('date', '<=', maxStr),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let slots = snapshot.docs.map(doc => {
      const data = doc.data();
      const capacity = data.capacity || 0;
      const bookedCount = data.bookedCount || 0;
      const spotsLeft = capacity - bookedCount;
      const available = spotsLeft > 0 && data.isActive;

      // Simple formatting for display (e.g. "10:00" -> "10:00 AM")
      const formatTime = (time: string) => {
        const [h, m] = time.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${m} ${ampm}`;
      };

      // Simple date formatting (e.g. "2026-07-12" -> "Sun, 12 Jul")
      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      };

      return {
        id: doc.id,
        ...data,
        available,
        displayLabel: `${formatTime(data.startTime)} - ${formatTime(data.endTime)}`,
        dateLabel: formatDate(data.date),
        spotsLeft
      } as PickupSlot;
    });

    return slots;
  }

  async getCoupons(): Promise<any[]> {
    const q = query(
      collection(db, 'coupons'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async validateCoupon(code: string, cartTotalMinor: number) {
    const validateCouponFn = httpsCallable(functions, 'validateCoupon');
    const result = await validateCouponFn({ code, cartTotalMinor });
    return result.data as { valid: boolean, discountMinor: number, message: string, newTotalMinor: number };
  }

  async createOrderDraft(params: { addressId: string, pickupSlotId: string, couponCode: string | null, directItems?: any[] | null, idempotencyKey: string }) {
    const createOrderDraftFn = httpsCallable(functions, 'createOrderDraft');
    const result = await createOrderDraftFn(params);
    return result.data as { orderId: string, finalAmountMinor: number, priceConfirmed: boolean };
  }

  async getDeliveryFee(): Promise<number> {
    try {
      const configDoc = await getDoc(doc(db, 'appConfig', 'public'));
      if (configDoc.exists) {
        const data = configDoc.data();
        if (typeof data?.deliveryFeeMinor === 'number') {
          return data.deliveryFeeMinor;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch delivery fee config', e);
    }
    return 4000; // Fallback sane default
  }
}
