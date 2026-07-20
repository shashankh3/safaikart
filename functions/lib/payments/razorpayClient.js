"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayKeySecret = void 0;
exports.getRazorpayKeyId = getRazorpayKeyId;
exports.getRazorpayAuthHeader = getRazorpayAuthHeader;
const params_1 = require("firebase-functions/params");
exports.razorpayKeySecret = (0, params_1.defineSecret)('RAZORPAY_KEY_SECRET');
function getRazorpayKeyId() {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId && !isEmulator) {
        console.warn('RAZORPAY_KEY_ID environment variable is missing. This will fail in production.');
    }
    return keyId || 'rzp_test_placeholder';
}
function getRazorpayAuthHeader() {
    const keyId = getRazorpayKeyId();
    const keySecret = exports.razorpayKeySecret.value();
    return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}
//# sourceMappingURL=razorpayClient.js.map