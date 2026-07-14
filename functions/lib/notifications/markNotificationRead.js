"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationRead = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.markNotificationRead = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { notificationId } = request.data;
    if (!notificationId) {
        throw new https_1.HttpsError('invalid-argument', 'Notification ID is required.');
    }
    const notificationRef = db.collection('notifications').doc(notificationId);
    const doc = await notificationRef.get();
    if (!doc.exists) {
        throw new https_1.HttpsError('not-found', 'Notification not found.');
    }
    if (((_b = doc.data()) === null || _b === void 0 ? void 0 : _b.userId) !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Cannot update another user\'s notification.');
    }
    await notificationRef.update({
        isRead: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
});
//# sourceMappingURL=markNotificationRead.js.map