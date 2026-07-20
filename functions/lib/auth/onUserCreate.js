"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onUserCreate = functions.region('asia-south1').auth.user().onCreate(async (user) => {
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const userRef = db.collection('users').doc(user.uid);
    const profileRef = db.collection('profiles').doc(user.uid);
    const batch = db.batch();
    batch.set(userRef, {
        createdAt: now,
        phoneNumber: user.phoneNumber || null,
        email: user.email || null,
    });
    batch.set(profileRef, {
        userId: user.uid,
        phoneNumber: user.phoneNumber || null,
        email: user.email || null,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || null,
        isBlocked: false,
        createdAt: now,
        updatedAt: now,
        defaultAddressId: null,
        fcmTokens: []
    });
    await batch.commit();
});
//# sourceMappingURL=onUserCreate.js.map