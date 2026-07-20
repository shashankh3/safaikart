"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderStatusNotification = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const firestore_2 = require("firebase-admin/firestore");
const notificationLogic_1 = require("../utils/notificationLogic");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.sendOrderStatusNotification = (0, firestore_1.onDocumentUpdated)('orders/{orderId}', async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    const notificationContent = (0, notificationLogic_1.buildOrderNotification)(before, after, event.params.orderId);
    if (!notificationContent)
        return;
    const { title, body, type } = notificationContent;
    const orderId = event.params.orderId;
    const userId = after.userId;
    // Fetch user's tokens
    const profileDoc = await admin.firestore().collection('profiles').doc(userId).get();
    if (!profileDoc.exists)
        return;
    const profileData = profileDoc.data();
    const tokensData = (profileData === null || profileData === void 0 ? void 0 : profileData.fcmTokens) || [];
    if (tokensData.length === 0)
        return;
    // Extract just the token strings
    const tokens = tokensData.map((t) => t.token);
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
            createdAt: firestore_2.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        console.error('Error writing to notification center:', error);
    }
    // 2. FCM Push Notification
    if (tokens.length === 0)
        return;
    const message = {
        notification: { title, body },
        data: { orderId, type, deepLink },
        tokens,
    };
    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
            var _a, _b;
            if (!resp.success) {
                if (((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) === 'messaging/invalid-registration-token' ||
                    ((_b = resp.error) === null || _b === void 0 ? void 0 : _b.code) === 'messaging/registration-token-not-registered') {
                    failedTokens.push(tokens[idx]);
                }
            }
        });
        if (failedTokens.length > 0) {
            const tokensToRemove = tokensData.filter((t) => failedTokens.includes(t.token));
            if (tokensToRemove.length > 0) {
                await admin.firestore().collection('profiles').doc(userId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
                });
            }
        }
    }
    catch (error) {
        console.error('Error sending multicast notification', error);
    }
});
//# sourceMappingURL=sendOrderStatusNotification.js.map