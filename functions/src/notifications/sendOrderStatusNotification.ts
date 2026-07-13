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
  let type = 'order_update';

  switch (newStatus) {
    case 'CONFIRMED':
      title = 'Order Confirmed';
      body = `Order #SK-${orderId.substring(0, 4).toUpperCase()} confirmed! Pickup: ${after.pickupSlotSnapshot?.date || 'soon'}.`;
      break;
    case 'PICKED_UP':
      title = 'Order Picked Up';
      body = `Items picked up for order #SK-${orderId.substring(0, 4).toUpperCase()}. Cleaning in progress.`;
      break;
    case 'CLEANING_IN_PROGRESS':
      title = 'Cleaning in Progress';
      body = `Your items are being cleaned. We'll notify you when they're ready.`;
      break;
    case 'READY_FOR_DELIVERY':
      title = 'Ready for Delivery';
      body = `Items ready for delivery! Order #SK-${orderId.substring(0, 4).toUpperCase()}.`;
      break;
    case 'OUT_FOR_DELIVERY':
      title = 'Out for Delivery';
      body = `Your order is out for delivery. Expected soon.`;
      break;
    case 'DELIVERED':
      title = 'Order Delivered';
      body = `Order #SK-${orderId.substring(0, 4).toUpperCase()} delivered! Thank you for choosing SafaiKart.`;
      break;
    case 'CANCELLED':
    case 'REFUND_PENDING':
    case 'REFUNDED':
      title = 'Order Cancelled';
      body = `Your order #SK-${orderId.substring(0, 4).toUpperCase()} was cancelled. Please collect your items.`;
      type = 'order_cancelled';
      break;
    default:
      return; // Skip notification for other statuses
  }

  const deepLink = `safaikart://order/${orderId}`;

  // 1. Audit log / In-App Notification Center
  try {
    await admin.firestore().collection('notifications').add({
      userId,
      orderId,
      type,
      title,
      body,
      deepLink,
      isRead: false,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error writing to notification center:', error);
  }

  // 2. FCM Push Notification
  if (tokens.length === 0) return;

  const message = {
    notification: { title, body },
    data: { orderId, status: newStatus, type, deepLink },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
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
      const remainingTokens = tokensData.filter((t: any) => !failedTokens.includes(t.token));
      await admin.firestore().collection('profiles').doc(userId).update({
        fcmTokens: remainingTokens
      });
    }

  } catch (error) {
    console.error('Error sending multicast notification', error);
  }
});
