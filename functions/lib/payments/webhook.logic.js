"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = void 0;
const crypto = require("crypto");
function verifyWebhookSignature(rawBody, signature, secret) {
    if (!signature || !secret || !rawBody) {
        return false;
    }
    try {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
        const actualBuffer = Buffer.from(signature, 'utf8');
        if (expectedBuffer.length !== actualBuffer.length) {
            return false;
        }
        return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
    }
    catch (error) {
        return false;
    }
}
exports.verifyWebhookSignature = verifyWebhookSignature;
//# sourceMappingURL=webhook.logic.js.map