"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAdminRoles = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.syncAdminRoles = (0, firestore_1.onDocumentWritten)('adminUsers/{uid}', async (event) => {
    const uid = event.params.uid;
    const snapshot = event.data;
    if (!snapshot) {
        return;
    }
    // If document is deleted, remove custom claims
    if (!snapshot.after.exists) {
        await admin.auth().setCustomUserClaims(uid, { admin: false, role: null });
        console.log(`Removed admin claims for ${uid}`);
        return;
    }
    // If created or updated, sync role
    const data = snapshot.after.data();
    const role = data === null || data === void 0 ? void 0 : data.role;
    if (role) {
        await admin.auth().setCustomUserClaims(uid, { admin: true, role: role });
        console.log(`Set admin role ${role} for ${uid}`);
    }
});
//# sourceMappingURL=syncAdminRoles.js.map