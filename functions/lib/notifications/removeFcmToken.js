"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFcmToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.removeFcmToken = (0, https_2.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { token } = request.data;
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Token is required');
    }
    const profileRef = admin.firestore().collection('profiles').doc(uid);
    await admin.firestore().runTransaction(async (transaction) => {
        const profileDoc = await transaction.get(profileRef);
        if (profileDoc.exists) {
            const data = profileDoc.data();
            if (data && data.fcmTokens && Array.isArray(data.fcmTokens)) {
                const updatedTokens = data.fcmTokens.filter((t) => t.token !== token);
                transaction.update(profileRef, { fcmTokens: updatedTokens });
            }
        }
    });
    return { success: true };
});
//# sourceMappingURL=removeFcmToken.js.map