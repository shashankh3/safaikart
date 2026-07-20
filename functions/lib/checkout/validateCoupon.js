"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoupon = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const coupon_logic_1 = require("./coupon.logic");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.validateCoupon = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
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