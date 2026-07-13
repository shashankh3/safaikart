"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
async function rateLimiter(uid, functionName, maxCalls, windowSeconds) {
    const db = admin.firestore();
    const rateLimitRef = db.collection('rateLimits').doc(`${uid}_${functionName}`);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(rateLimitRef);
        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        if (!doc.exists) {
            transaction.set(rateLimitRef, { calls: [now] });
            return;
        }
        const data = doc.data();
        const calls = (data === null || data === void 0 ? void 0 : data.calls) || [];
        const validCalls = calls.filter((timestamp) => now - timestamp < windowMs);
        if (validCalls.length >= maxCalls) {
            throw new functions.https.HttpsError('resource-exhausted', `Rate limit exceeded for ${functionName}. Please try again later.`);
        }
        validCalls.push(now);
        transaction.update(rateLimitRef, { calls: validCalls });
    });
}
exports.rateLimiter = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map