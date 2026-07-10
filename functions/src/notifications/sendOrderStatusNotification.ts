import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const sendOrderStatusNotification = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Only trigger if status changed
  if (before.status === after.status) return;

  const orderId = event.params.orderId;
  const userId = after.userId;
  const newStatus = after.status;

  // Fetch user's tokens
  const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
  if (!profileDoc.exists) return;
  
  const profileData = profileDoc.data();
  const tokensData = profileData?.fcmTokens || [];
  if (tokensData.length === 0) return;

  // Extract just the token strings
  const tokens = tokensData.map((t: any) => t.token);

  let title = 'SafaiKart Order Update';
  let body = '';

  switch (newStatus) {
    case 'CONFIRMED':
      body = `Your order is confirmed! Pickup scheduled for ${after.pickupSlotSnapshot?.date}.`;
      break;
    case 'PICKED_UP':
      body = `Your clothes have been picked up. Cleaning in progress soon.`;
      break;
    case 'CLEANING_IN_PROGRESS':
      body = `Your items are being cleaned. We'll notify you when they're ready.`;
      break;
    case 'READY_FOR_DELIVERY':
      body = `Your clothes are ready! Out for delivery soon.`;
      break;
    case 'OUT_FOR_DELIVERY':
      body = `Your order is out for delivery. Expected soon.`;
      break;
    case 'DELIVERED':
      body = `Your order has been delivered. Thank you for choosing SafaiKart!`;
      break;
    case 'CANCELLED':
      body = `Your order has been cancelled.`;
      break;
    default:
      return; // Skip notification for other statuses
  }

  const message = {
    notification: { title, body },
    data: { orderId, status: newStatus, type: 'order_update' },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Optional: Log failed tokens to remove them
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        if (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered') {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      // Remove failed tokens
      const remainingTokens = tokensData.filter((t: any) => !failedTokens.includes(t.token));
      await admin.firestore().collection('profiles').doc(userId).update({
        fcmTokens: remainingTokens
      });
    }

    // Audit log
    await admin.firestore().collection('notifications').add({
      userId,
      orderId,
      title,
      body,
      status: 'SENT',
      createdAt: FieldValue.serverTimestamp()
    });

  } catch (error) {
    console.error('Error sending multicast notification', error);
  }
});
