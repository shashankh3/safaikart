"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFcmToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.saveFcmToken = (0, https_2.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { token, platform } = request.data;
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Token is required');
    }
    // Save to user profile
    await admin.firestore().collection('profiles').doc(uid).set({
        fcmTokens: firestore_1.FieldValue.arrayUnion({
            token,
            platform,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        })
    }, { merge: true });
    return { success: true };
});
//# sourceMappingURL=saveFcmToken.js.map