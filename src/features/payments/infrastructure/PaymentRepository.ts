import { httpsCallable } from '@react-native-firebase/functions';
import { db, functions } from '../../../app/config/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from '@react-native-firebase/firestore';

export class PaymentRepository {
  async createPaymentOrder(orderId: string): Promise<{ razorpayOrderId: string, razorpayKeyId: string, amountMinor: number, currency: string, checkoutUrl?: string }> {
    const createPaymentFn = httpsCallable(functions, 'createPaymentOrder');
    const result = await createPaymentFn({ orderId });
    return result.data as any;
  }

  async verifyPaymentStatus(orderId: string): Promise<{ paymentStatus: string, orderStatus: string }> {
    const verifyFn = httpsCallable(functions, 'verifyPaymentStatus');
    const result = await verifyFn({ orderId });
    return result.data as any;
  }

  async reportClientCallback(razorpayOrderId: string, razorpayPaymentId: string): Promise<void> {
    // Client callbacks are untrusted. The backend webhook is the source of truth.
    // However, we mark the payment doc so the app can optimistically show "verifying..."
    try {
      const verifyFn = httpsCallable(functions, 'verifyPaymentStatus');
      // Trigger a server-side verification poll against Razorpay API
      // This catches the case where the webhook is delayed
      const paymentsSnapshot = await getDocs(
        query(collection(db, 'payments'), where('razorpayOrderId', '==', razorpayOrderId))
      );

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];
        const orderId = paymentDoc.data().orderId;
        // Fire-and-forget: ask the backend to poll Razorpay for this order's payment status
        verifyFn({ orderId }).catch((err) => {
          console.warn('Background verification failed (webhook will handle it):', err);
        });
      }
    } catch (err) {
      // Non-critical — the webhook pipeline is the source of truth
      console.warn('Client callback report failed:', err);
    }
  }
}
