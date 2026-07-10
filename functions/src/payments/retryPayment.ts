import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const retryPayment = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { orderId } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required.');
  }

  const orderRef = db.collection('orders').doc(orderId);
  const orderDoc = await orderRef.get();
  
  if (!orderDoc.exists || orderDoc.data()?.userId !== uid) {
    throw new HttpsError('permission-denied', 'Order not found or unauthorized.');
  }

  if (orderDoc.data()?.status !== 'PAYMENT_PENDING') {
    throw new HttpsError('failed-precondition', 'Order is not in PAYMENT_PENDING state.');
  }

  // Instead of re-writing the Razorpay API call logic, we can just call the createPaymentOrder 
  // implementation. The createPaymentOrder logic checks for PENDING/CREATED payments and returns 
  // them, or creates a new one. 
  // If the previous payment FAILED, createPaymentOrder will bypass the check (since it only blocks
  // VERIFIED, and only returns PENDING/CREATED) and create a new Razorpay order.
  
  // To use the callable locally we can just invoke its handler (though Cloud Functions v2 handlers 
  // can be invoked by passing the request object if we cast it).
  // Wait, calling another v2 HTTPS callable directly from within a v2 HTTPS callable is easiest 
  // by just isolating the core logic, or we can just duplicate the core block here to keep it 
  // simple and avoid type issues with Cloud Function Contexts.
  
  throw new HttpsError('unimplemented', 'Please call createPaymentOrder directly for retries.');
});
