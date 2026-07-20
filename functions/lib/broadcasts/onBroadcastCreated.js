"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBroadcastCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onBroadcastCreated = (0, firestore_1.onDocumentCreated)('broadcasts/{broadcastId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    if (data.status !== 'SCHEDULED' && data.status !== 'PENDING') {
        return; // Already processed or not ready
    }
    const { title, body, targetTopic, deepLink } = data;
    try {
        const message = {
            notification: {
                title,
                body
            },
            topic: targetTopic || 'all_users', // default to all_users topic
        };
        if (deepLink) {
            message.data = { deepLink };
        }
        // Send the message
        const response = await admin.messaging().send(message);
        // Update broadcast doc with success
        await snapshot.ref.update({
            status: 'SENT',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            messageId: response
        });
    }
    catch (error) {
        console.error('Error sending broadcast:', error);
        await snapshot.ref.update({
            status: 'FAILED',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: error.message
        });
    }
});
//# sourceMappingURL=onBroadcastCreated.js.map