import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../app/config/firebase';

const functions = getFunctions();

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
    try {
      // Find the payment document and update it locally (UNTRUSTED - just for UX)
      const q = query(collection(db, 'payments'), where('razorpayOrderId', '==', razorpayOrderId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        // Only update if it hasn't been verified by webhook already
        if (paymentDoc.data().status !== 'VERIFIED') {
          await updateDoc(doc(db, 'payments', paymentDoc.id), {
            clientCallbackReceived: true,
            status: 'CLIENT_CALLBACK_RECEIVED',
            razorpayPaymentId // Temporarily store, webhook will overwrite/confirm
          });
        }
      }
    } catch (error) {
      console.warn('Failed to report client callback:', error);
    }
  }
}
