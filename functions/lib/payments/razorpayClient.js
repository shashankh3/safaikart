"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayKeySecret = exports.razorpayKeyId = void 0;
exports.getRazorpayAuthHeader = getRazorpayAuthHeader;
const params_1 = require("firebase-functions/params");
exports.razorpayKeyId = (0, params_1.defineSecret)('RAZORPAY_KEY_ID');
exports.razorpayKeySecret = (0, params_1.defineSecret)('RAZORPAY_KEY_SECRET');
function getRazorpayAuthHeader() {
    const keyId = exports.razorpayKeyId.value().trim();
    const keySecret = exports.razorpayKeySecret.value().trim();
    if (!keyId || !keySecret) {
        throw new Error('Razorpay secrets are not properly configured.');
    }
    return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}
//# sourceMappingURL=razorpayClient.js.map