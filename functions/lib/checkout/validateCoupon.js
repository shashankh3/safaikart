"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoupon = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const coupon_logic_1 = require("./coupon.logic");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.validateCoupon = (0, https_1.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in to validate coupon.');
    }
    const { code, cartTotalMinor } = request.data;
    if (!code || typeof code !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Invalid coupon code format.');
    }
    const upperCode = code.toUpperCase();
    const couponDoc = await db.collection('coupons').doc(upperCode).get();
    if (!couponDoc.exists) {
        return { valid: false, discountMinor: 0, message: 'Invalid coupon code', newTotalMinor: cartTotalMinor };
    }
    const coupon = couponDoc.data();
    return (0, coupon_logic_1.validateCouponApplicability)(coupon, uid, cartTotalMinor);
});
//# sourceMappingURL=validateCoupon.js.map