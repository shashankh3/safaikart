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
exports.paymentWebhook = exports.razorpayWebhookSecret = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const functions_1 = require("firebase-admin/functions");
const webhook_logic_1 = require("./webhook.logic");
const logger_1 = require("../utils/logger");
exports.razorpayWebhookSecret = (0, params_1.defineSecret)('RAZORPAY_WEBHOOK_SECRET');
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.paymentWebhook = (0, https_1.onRequest)({ secrets: [exports.razorpayWebhookSecret], region: 'asia-south1' }, async (request, response) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        // Must use rawBody for HMAC generation to match exactly what Razorpay signed
        const rawBody = request.rawBody;
        const signature = request.headers['x-razorpay-signature'];
        if (!signature || typeof signature !== 'string') {
            (0, logger_1.logError)('Webhook missing signature header');
            response.status(400).send('Missing signature');
            return;
        }
        // Verify signature BEFORE parsing the payload
        if (!(0, webhook_logic_1.verifyWebhookSignature)(rawBody, signature, exports.razorpayWebhookSecret.value())) {
            (0, logger_1.logError)('Webhook signature verification failed');
            response.status(401).send('Unauthorized');
            return;
        }
        const event = JSON.parse(rawBody.toString());
        let eventId = request.headers['x-razorpay-event-id'];
        if (!eventId) {
            // Fallback: Generate deterministic eventId from payload signature
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            const paymentId = ((_c = (_b = (_a = event === null || event === void 0 ? void 0 : event.payload) === null || _a === void 0 ? void 0 : _a.payment) === null || _b === void 0 ? void 0 : _b.entity) === null || _c === void 0 ? void 0 : _c.id) || ((_f = (_e = (_d = event === null || event === void 0 ? void 0 : event.payload) === null || _d === void 0 ? void 0 : _d.order) === null || _e === void 0 ? void 0 : _e.entity) === null || _f === void 0 ? void 0 : _f.id) || Date.now();
            eventId = `generated_${crypto.createHash('sha256').update(`${event.event}_${paymentId}`).digest('hex')}`;
        }
        // Offload to a Task Queue for idempotent processing (avoid gateway timeouts)
        const queue = (0, functions_1.getFunctions)().taskQueue('processRazorpayWebhook');
        await queue.enqueue({ event, eventId });
        // Acknowledge receipt to Razorpay immediately
        response.status(200).send('OK');
    }
    catch (error) {
        (0, logger_1.logError)('Webhook handling error:', error);
        response.status(500).send('Internal Server Error');
    }
});
//# sourceMappingURL=paymentWebhook.js.map