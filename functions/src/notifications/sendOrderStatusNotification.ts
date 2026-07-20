import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { buildOrderNotification } from '../utils/notificationLogic';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const sendOrderStatusNotification = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  const notificationContent = buildOrderNotification(before, after, event.params.orderId);
  if (!notificationContent) return;

  const { title, body, type } = notificationContent;

  const orderId = event.params.orderId;
  const userId = after.userId;

  // Fetch user's tokens
  const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
  if (!profileDoc.exists) return;
  
  const profileData = profileDoc.data();
  const tokensData = profileData?.fcmTokens || [];
  if (tokensData.length === 0) return;

  // Extract just the token strings
  const tokens = tokensData.map((t: any) => t.token);

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
    data: { orderId, type, deepLink },
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
      const tokensToRemove = tokensData.filter((t: any) => failedTokens.includes(t.token));
      if (tokensToRemove.length > 0) {
        await admin.firestore().collection('profiles').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
        });
      }
    }

  } catch (error) {
    console.error('Error sending multicast notification', error);
  }
});
