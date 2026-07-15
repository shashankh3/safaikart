import {doc, onSnapshot} from '@react-native-firebase/firestore';
import { db } from '../../../app/config/firebase';
import { PaymentRepository } from '../infrastructure/PaymentRepository';

export class CheckPaymentStatusUseCase {
  constructor(private repository: PaymentRepository) {}

  // Listens to Firestore order document.
  // Returns an unsubscribe function.
  listenToOrder(orderId: string, onStatusChange: (status: 'success' | 'failed' | 'pending') => void) {
    const docRef = doc(db, 'orders', orderId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.paymentStatus === 'VERIFIED' && data.status === 'CONFIRMED') {
          onStatusChange('success');
        } else if (data.paymentStatus === 'FAILED') {
          onStatusChange('failed');
        }
      }
    });
  }

  async verifyFallback(orderId: string): Promise<'success' | 'failed' | 'pending'> {
    try {
      const result = await this.repository.verifyPaymentStatus(orderId);
      if (result.paymentStatus === 'VERIFIED') return 'success';
      if (result.paymentStatus === 'FAILED') return 'failed';
      return 'pending';
    } catch (e) {
      console.error('Verify fallback failed:', e);
      return 'pending';
    }
  }
}
