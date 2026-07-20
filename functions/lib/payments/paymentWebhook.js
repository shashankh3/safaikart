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
exports.paymentWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const functions_1 = require("firebase-admin/functions");
const webhook_logic_1 = require("./webhook.logic");
const razorpayWebhookSecret = (0, params_1.defineSecret)('RAZORPAY_WEBHOOK_SECRET');
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.paymentWebhook = (0, https_1.onRequest)({ secrets: [razorpayWebhookSecret] }, async (request, response) => {
    try {
        // Read raw body and signature
        const rawBody = request.rawBody;
        const signature = request.headers['x-razorpay-signature'];
        if (!signature || typeof signature !== 'string') {
            console.error('Webhook missing signature header');
            response.status(400).send('Missing signature');
            return;
        }
        const webhookSecret = razorpayWebhookSecret.value();
        // Verify signature BEFORE logging or parsing
        if (!(0, webhook_logic_1.verifyWebhookSignature)(rawBody, signature, webhookSecret)) {
            console.error('Webhook signature verification failed');
            response.status(400).send('Invalid signature');
            return;
        }
        // Parse Event safely
        const event = JSON.parse(rawBody.toString());
        const eventId = request.headers['x-razorpay-event-id'];
        // Enqueue the task for async processing
        // Note: The task queue name must match the exported function name exactly, but in lowercase if deploying to GCP sometimes.
        // In Firebase Gen 2, it typically matches the camelCase name of the function. Let's use the exact function name.
        const queue = (0, functions_1.getFunctions)().taskQueue('processRazorpayWebhook');
        await queue.enqueue({ event, eventId });
        // Respond 200 OK immediately so Razorpay doesn't retry
        response.status(200).send('OK');
    }
    catch (error) {
        console.error('Webhook enqueuing error:', error);
        // Return 500 so Razorpay retries the webhook if we failed to enqueue it
        response.status(500).send('Internal Server Error');
    }
});
//# sourceMappingURL=paymentWebhook.js.map