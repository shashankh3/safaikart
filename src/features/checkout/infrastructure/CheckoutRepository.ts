import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../app/config/firebase';
import { PickupSlot } from '../domain/PickupSlot';

// Initialize functions
const functions = getFunctions();

export class CheckoutRepository {
  async getPickupSlots(): Promise<PickupSlot[]> {
    const q = query(
      collection(db, 'pickupSlots'),
      where('isActive', '==', true),
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

    // Fallback: Generate 7 days of 4 slots if DB is empty
    if (slots.length === 0) {
      const generatedSlots: PickupSlot[] = [];
      const times = [
        { start: '08:00', end: '10:00' },
        { start: '10:00', end: '12:00' },
        { start: '14:00', end: '16:00' },
        { start: '16:00', end: '18:00' }
      ];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        
        times.forEach((t, j) => {
          const formatTime = (time: string) => {
            const [h, m] = time.split(':');
            let hours = parseInt(h, 10);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            return `${hours}:${m} ${ampm}`;
          };
          
          generatedSlots.push({
            id: `mock-slot-${i}-${j}`,
            date: dateStr,
            startTime: t.start,
            endTime: t.end,
            capacity: 20,
            bookedCount: Math.floor(Math.random() * 20),
            isActive: true,
            serviceArea: 'default',
            available: true,
            displayLabel: `${formatTime(t.start)} - ${formatTime(t.end)}`,
            dateLabel,
            spotsLeft: 20
          });
        });
      }
      
      // Calculate spots left and availability for generated slots
      slots = generatedSlots.map(s => {
        s.spotsLeft = s.capacity - s.bookedCount;
        s.available = s.spotsLeft > 0;
        return s;
      });
    }

    return slots;
  }

  async validateCoupon(code: string, cartTotalMinor: number) {
    const validateCouponFn = httpsCallable(functions, 'validateCoupon');
    const result = await validateCouponFn({ code, cartTotalMinor });
    return result.data as { valid: boolean, discountMinor: number, message: string, newTotalMinor: number };
  }

  async createOrderDraft(params: { addressId: string, pickupSlotId: string, couponCode: string | null, directItems?: any[] | null }) {
    const createOrderDraftFn = httpsCallable(functions, 'createOrderDraft');
    const result = await createOrderDraftFn(params);
    return result.data as { orderId: string, finalAmountMinor: number, priceConfirmed: boolean };
  }
}
