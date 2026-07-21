import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { getRazorpayAuthHeader } from './razorpayClient';
import { razorpayKeySecret } from './razorpayClient';
import { buildStatusHistoryUpdate } from '../utils/statusLogic';
import { logInfo, logWarn, logError } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const processRefunds = onSchedule({ schedule: 'every 60 minutes', secrets: [razorpayKeySecret] }, async (event) => {
  try {
    // Look for orders that are REFUND_PENDING or have refundStatus == 'FAILED'
    const snapshot1 = await db.collection('orders').where('status', '==', 'REFUND_PENDING').get();
    const snapshot2 = await db.collection('orders').where('refundStatus', '==', 'FAILED').get();
    
    const ordersToRefund = new Map<string, admin.firestore.QueryDocumentSnapshot>();
    
    snapshot1.docs.forEach(doc => ordersToRefund.set(doc.id, doc));
    snapshot2.docs.forEach(doc => ordersToRefund.set(doc.id, doc));

    if (ordersToRefund.size === 0) {
      logInfo('No refunds to process.');
      return;
    }

    logInfo(`Processing refunds for ${ordersToRefund.size} orders...`);
    const authHeader = getRazorpayAuthHeader();

    for (const [orderId, doc] of ordersToRefund) {
      const orderData = doc.data();
      let razorpayPaymentId: string | null = null;
      let amountToRefundMinor = 0;

      // Find the verified payment for this order
      const paymentsSnapshot = await db.collection('payments')
        .where('orderId', '==', orderId)
        .where('status', '==', 'VERIFIED')
        .get();

      if (paymentsSnapshot.empty) {
        logWarn(`Cannot process refund for order ${orderId}: No VERIFIED payment found.`);
        continue;
      }

      const payment = paymentsSnapshot.docs[0].data();
      razorpayPaymentId = payment.razorpayPaymentId;
      
      // Calculate what to refund based on the issue
      if (orderData.status === 'REFUND_PENDING') {
         amountToRefundMinor = payment.amountMinor; // full refund
      } else {
         // partial refund or unknown amount, skip for automated unless we can derive it
         // Wait, partial refund from adminConfirmOrderPrice doesn't set status = REFUND_PENDING
         // If it failed there, how much was the refund? We might not know.
         // Actually, let's just stick to full refunds for automated jobs for now to be safe, 
         // or we can require that refundAmountMinor is stored on the order doc when it fails.
         logWarn(`Automated retry for partial refunds not yet implemented safely for order ${orderId}. Skipping.`);
         continue;
      }

      if (!razorpayPaymentId || amountToRefundMinor <= 0) {
        continue;
      }

      const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amountToRefundMinor })
      });

      if (response.ok) {
        const refundData = await response.json();
        const refundUpdate = buildStatusHistoryUpdate(orderData, 'REFUND_INITIATED');
        await doc.ref.update({
          ...refundUpdate,
          refundId: refundData.id,
          refundStatus: 'INITIATED',
        });
        logInfo(`Successfully refunded order ${orderId}`);
      } else {
        const errText = await response.text();
        logError(`Refund failed for order ${orderId}:`, errText);
        await doc.ref.update({
          refundStatus: 'FAILED',
          refundError: errText,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } catch (error) {
    logError('Error processing refunds:', error);
  }
});
