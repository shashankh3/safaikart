"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserDelete = exports.deleteAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// 1. Client callable for deleting own account
exports.deleteAccount = (0, https_1.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in to delete account.');
    }
    try {
        // Delete user from Firebase Auth. This will trigger beforeUserDeleted or onUserDelete 
        // to do the actual data cleanup.
        await admin.auth().deleteUser(uid);
        return { success: true, message: 'Account deleted successfully' };
    }
    catch (error) {
        console.error(`Error deleting user ${uid}:`, error);
        throw new https_1.HttpsError('internal', 'An error occurred while deleting your account.');
    }
});
// 2. Auth Trigger (Runs when deleted from client callable, or via Firebase Console)
exports.onUserDelete = functions.region('asia-south1').auth.user().onDelete(async (user) => {
    const uid = user.uid;
    const batch = db.batch();
    // Delete profile
    batch.delete(db.collection('profiles').doc(uid));
    // Delete cart
    batch.delete(db.collection('carts').doc(uid));
    // Delete addresses
    const addressesQuery = await db.collection('addresses').where('userId', '==', uid).get();
    addressesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    // We KEEP orders and payments for financial auditing, but we might want to anonymize them slightly
    // if strict GPDP/GDPR requires it. The prompt says "keep orders and payments records", 
    // so we leave them intact or just don't delete them.
    // Optional: write an audit log
    const auditRef = db.collection('auditLogs').doc();
    batch.set(auditRef, {
        action: 'ACCOUNT_DELETED',
        userId: uid,
        at: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
});
//# sourceMappingURL=deleteAccount.js.map