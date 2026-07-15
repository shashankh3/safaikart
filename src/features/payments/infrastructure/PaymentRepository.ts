import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
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
    // Client callbacks are untrusted. The backend webhook is the source of truth.
    // The strict Firestore rules prevent direct updates to the payments collection.
    console.log(`Client reported payment callback for order ${razorpayOrderId}`);
  }
}
