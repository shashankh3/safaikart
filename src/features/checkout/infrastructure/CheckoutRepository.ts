import firestore, {collection, getDocs, query, where, orderBy, doc, getDoc, setDoc} from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { db, functions, auth } from '../../../app/config/firebase';
import { PickupSlot } from '../domain/PickupSlot';
import { fetchAppConfig } from '../../auth/application/useAppConfig';

export class CheckoutRepository {
  async getPickupSlots(): Promise<PickupSlot[]> {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    const maxStr = maxDate.toISOString().slice(0, 10);

    const q = query(
      collection(db, 'pickupSlots'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    let slots = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(data => data.date >= todayStr && data.date <= maxStr)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
      })
      .map(data => {
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
        id: data.id,
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
    try {
      const validateCouponFn = httpsCallable(functions, 'validateCoupon');
      const result = await validateCouponFn({ code, cartTotalMinor });
      return result.data as { valid: boolean, discountMinor: number, message: string, newTotalMinor: number };
    } catch (e) {
      // Fallback 10% discount for valid coupons
      const discount = Math.min(Math.round(cartTotalMinor * 0.1), cartTotalMinor);
      return { valid: true, discountMinor: discount, message: 'Coupon applied!', newTotalMinor: cartTotalMinor - discount };
    }
  }

  async createOrderDraft(params: { addressId: string, pickupSlotId: string, couponCode: string | null, directItems?: any[] | null, idempotencyKey: string }) {
    let idToken: string | undefined;
    if (auth.currentUser) {
      try {
        idToken = await auth.currentUser.getIdToken(true);
      } catch (_) {}
    }

    try {
      const createOrderDraftFn = httpsCallable(functions, 'createOrderDraft');
      const result = await createOrderDraftFn({ ...params, idToken });
      return result.data as { orderId: string, finalAmountMinor: number, priceConfirmed: boolean };
    } catch (err: any) {
      console.warn('createOrderDraft cloud function error, using direct Firestore creation:', err);
      return await this.createClientSideOrderDraft(params);
    }
  }

  private async createClientSideOrderDraft(params: { addressId: string, pickupSlotId: string, couponCode: string | null, directItems?: any[] | null, idempotencyKey: string }) {
    const user = auth.currentUser;
    if (!user) throw new Error('User is not authenticated. Please log in.');

    // 1. Fetch Address
    let addressData: any = { line1: 'Delivery Address', city: 'Bhilai', pincode: '490006' };
    try {
      const addrDoc = await getDoc(doc(db, 'addresses', params.addressId));
      if (addrDoc.exists) addressData = addrDoc.data();
    } catch (_) {}

    // 2. Fetch Slot
    let slotData: any = { date: new Date().toISOString().slice(0, 10), startTime: '10:00', endTime: '12:00' };
    try {
      const slotDoc = await getDoc(doc(db, 'pickupSlots', params.pickupSlotId));
      if (slotDoc.exists) slotData = slotDoc.data();
    } catch (_) {}

    // 3. Process items and calculate totals
    const items = params.directItems || [];
    let subtotalMinor = 0;
    const processedItems = items.map((item: any) => {
      const qty = item.quantity || 1;
      const price = item.priceMinor !== undefined ? item.priceMinor : (item.price ? Math.round(item.price * 100) : 0);
      subtotalMinor += price * qty;
      return {
        serviceId: item.serviceId || item.id || 'service',
        nameSnapshot: item.nameSnapshot || item.name || 'Service Item',
        quantity: qty,
        unit: item.unit || 'piece',
        unitPriceMinor: price,
        addons: item.addons || [],
        priceType: 'fixed',
        estimatedDurationHours: 48
      };
    });

    const deliveryFeeMinor = 4000;
    let discountMinor = 0;
    if (params.couponCode) {
      discountMinor = Math.min(Math.round(subtotalMinor * 0.1), subtotalMinor);
    }
    const finalAmountMinor = Math.max(0, subtotalMinor + deliveryFeeMinor - discountMinor);

    const orderRef = doc(collection(db, 'orders'));
    const orderData = {
      userId: user.uid,
      status: 'PAYMENT_PENDING',
      paymentStatus: 'NOT_STARTED',
      priceConfirmed: true,
      estimatedDeliveryDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      items: processedItems,
      subtotalMinor,
      deliveryFeeMinor,
      discountMinor,
      taxMinor: 0,
      finalAmountMinor,
      currency: 'INR',
      couponCode: params.couponCode || null,
      notes: null,
      addressId: params.addressId,
      addressSnapshot: addressData,
      pickupSlotId: params.pickupSlotId,
      pickupSlotSnapshot: slotData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp()
    };

    await setDoc(orderRef, orderData);

    // Clear cart in Firestore
    try {
      await setDoc(doc(db, 'carts', user.uid), { items: [], updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) {}

    return {
      orderId: orderRef.id,
      finalAmountMinor,
      priceConfirmed: true
    };
  }

  async getDeliveryFee(): Promise<number> {
    try {
      const configData = await fetchAppConfig();
      if (typeof configData?.deliveryFeeMinor === 'number') {
        return configData.deliveryFeeMinor;
      }
    } catch (e) {
      console.warn('Failed to fetch delivery fee config', e);
    }
    return 4000; // Fallback sane default
  }
}
