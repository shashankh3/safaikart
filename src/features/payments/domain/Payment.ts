import { Timestamp } from 'firebase/firestore';
import { PaymentStatus } from './PaymentStatus';

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  provider: 'razorpay';
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountMinor: number;
  currency: 'INR';
  method: 'upi';
  status: PaymentStatus;
  webhookVerified: boolean;
  clientCallbackReceived: boolean;
  createdAt: Timestamp;
  verifiedAt: Timestamp | null;
}
