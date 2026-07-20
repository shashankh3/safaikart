import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertAdmin } from '../utils/assertAdmin';

import { getRazorpayAuthHeader, razorpayKeySecret } from '../payments/razorpayClient';

import { z } from 'zod';

const confirmPriceSchema = z.object({
  orderId: z.string().min(1),
  items: z.array(z.object({
    serviceId: z.string(),
    quantity: z.number().int().min(1).max(100),
    unitPriceMinor: z.number().int().min(0).max(5000000)
  }))
});

export const adminConfirmOrderPrice = onCall({ secrets: [razorpayKeySecret] }, async (request) => {
  assertAdmin(request, ['superadmin', 'admin', 'ops']);
  const { data } = request;

  let orderId: string;
  let items: any[];

  try {
    const parsed = confirmPriceSchema.parse(data);
    orderId = parsed.orderId;
    items = parsed.items;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Validation error: ${e.message}`);
  }

  const db = admin.firestore();

  const orderRef = db.collection('orders').doc(orderId);
  let refundAmountMinor = 0;
  let razorpayPaymentId: string | null = null;
  let newFinalAmountMinor = 0;

  try {
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'Order not found.');
      }

      const orderData = orderDoc.data()!;
      if (orderData.priceConfirmed) {
        throw new HttpsError('failed-precondition', 'Order prices are already confirmed.');
      }

      // Map incoming items by serviceId for easy lookup
      const incomingItemsMap = new Map();
      for (const item of items) {
        incomingItemsMap.set(item.serviceId, item);
      }

      let newSubtotalMinor = 0;
      const updatedItems = [...orderData.items];

      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.priceType === 'variable') {
          const incoming = incomingItemsMap.get(item.serviceId);
          if (incoming) {
            if (!Number.isInteger(incoming.quantity) || incoming.quantity <= 0 || incoming.quantity > 100) {
              throw new HttpsError('invalid-argument', `Invalid quantity for serviceId ${item.serviceId}`);
            }
            if (!Number.isInteger(incoming.unitPriceMinor) || incoming.unitPriceMinor < 0 || incoming.unitPriceMinor > 5000000) {
              throw new HttpsError('invalid-argument', `Invalid unitPriceMinor for serviceId ${item.serviceId}`);
            }
            // Update quantity and unitPrice from admin input
            item.quantity = incoming.quantity;
            item.unitPriceMinor = incoming.unitPriceMinor;
            
            let addonsTotalMinor = 0;
            if (item.addons && Array.isArray(item.addons)) {
              for (const addon of item.addons) {
                 addonsTotalMinor += addon.priceMinor;
              }
            }

            const itemUnitTotalMinor = item.unitPriceMinor + addonsTotalMinor;
            item.lineTotalMinor = itemUnitTotalMinor * item.quantity;
          } else {
             if (item.lineTotalMinor === null || item.lineTotalMinor === 0) {
                 throw new HttpsError('invalid-argument', `Missing price confirmation for serviceId ${item.serviceId}`);
             }
          }
        }
        
        newSubtotalMinor += (item.lineTotalMinor || 0);
      }

      let newDiscountMinor = 0;
      if (orderData.couponCode) {
        const couponDoc = await transaction.get(db.collection('coupons').doc(orderData.couponCode));
        if (couponDoc.exists) {
          const coupon = couponDoc.data()!;
          if (coupon.isActive && newSubtotalMinor >= (coupon.minimumOrderAmount || 0)) {
            if (coupon.type === 'flat') newDiscountMinor = coupon.discountValue;
            else if (coupon.type === 'percent') newDiscountMinor = Math.floor((newSubtotalMinor * coupon.discountValue) / 100);
            if (newDiscountMinor > newSubtotalMinor) newDiscountMinor = newSubtotalMinor;
          }
        }
      }

      newFinalAmountMinor = newSubtotalMinor + orderData.deliveryFeeMinor - newDiscountMinor;
      
      const amountDiff = newFinalAmountMinor - orderData.finalAmountMinor;
      
      if (['CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'CLEANING_IN_PROGRESS', 'READY_FOR_DELIVERY'].includes(orderData.status) && amountDiff !== 0) {
        if (amountDiff < 0) {
          refundAmountMinor = Math.abs(amountDiff);
          const paymentsSnapshot = await transaction.get(db.collection('payments')
              .where('orderId', '==', orderId)
              .where('status', '==', 'VERIFIED'));
          if (!paymentsSnapshot.empty) {
              const payment = paymentsSnapshot.docs[0].data();
              razorpayPaymentId = payment.razorpayPaymentId;
          }
        } else {
          const newPaymentRef = db.collection('payments').doc();
          transaction.set(newPaymentRef, {
              orderId: orderId,
              userId: orderData.userId,
              provider: 'razorpay',
              razorpayOrderId: null,
              razorpayPaymentId: null,
              amountMinor: amountDiff,
              currency: 'INR',
              method: 'upi',
              status: 'PENDING',
              webhookVerified: false,
              clientCallbackReceived: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              verifiedAt: null
          });
          transaction.update(orderRef, { paymentStatus: 'PAYMENT_PENDING' });
        }
      }

      transaction.update(orderRef, {
        items: updatedItems,
        subtotalMinor: newSubtotalMinor,
        discountMinor: newDiscountMinor,
        finalAmountMinor: newFinalAmountMinor,
        priceConfirmed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    if (refundAmountMinor > 0 && razorpayPaymentId) {
      const authHeader = getRazorpayAuthHeader();
      const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: refundAmountMinor })
      });

      if (response.ok) {
        const refundData = await response.json();
        await orderRef.update({
          refundId: refundData.id,
          refundStatus: 'INITIATED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const errText = await response.text();
        console.error('Refund failed during adminConfirmOrderPrice:', errText);
        await orderRef.update({
          refundStatus: 'FAILED',
          refundError: errText,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return { success: true, message: `Prices confirmed for order ${orderId}` };
  } catch (error: any) {
    console.error('Error in adminConfirmOrderPrice:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'An error occurred while confirming prices.');
  }
});
