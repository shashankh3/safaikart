import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { createLogger } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();
const logger = createLogger({ context: 'generateInvoice' });

export const generateInvoice = onCall({ enforceAppCheck: false }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  // Verify Admin Role
  const adminDoc = await db.collection('adminUsers').doc(uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Only admins can generate invoices.');
  }

  const { orderId } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required.');
  }

  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data()!;
    
    // In a real implementation, you would use a library like 'pdfkit' or 'jspdf' here on the backend
    // to generate a PDF buffer using `orderData`.
    // For this demonstration, we create a simple text buffer pretending to be a PDF.
    const pdfContent = `INVOICE FOR ORDER ${orderId}\nAmount: ${orderData.finalAmountMinor / 100} INR\nStatus: ${orderData.status}`;
    const pdfBuffer = Buffer.from(pdfContent, 'utf-8');

    const bucket = storage.bucket();
    const file = bucket.file(`invoices/${orderId}_invoice.pdf`);
    
    await file.save(pdfBuffer, {
      metadata: { contentType: 'application/pdf' },
    });

    // Generate a signed URL valid for 1 hour
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, 
    });

    // Log the audit action
    await db.collection('auditLogs').add({
      action: 'INVOICE_GENERATED',
      orderId,
      actorUid: uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Invoice generated for order ${orderId} by admin ${uid}`);

    return { downloadUrl: url };
  } catch (error) {
    logger.error('Failed to generate invoice', error);
    throw new HttpsError('internal', 'An error occurred while generating the invoice.');
  }
});
