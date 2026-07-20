import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { getFunctions } from 'firebase-admin/functions';
import { verifyWebhookSignature } from './webhook.logic';

export const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

if (!admin.apps.length) {
  admin.initializeApp();
}

export const paymentWebhook = onRequest(
  { secrets: [razorpayWebhookSecret] }, 
  async (request, response) => {
    try {
      // Must use rawBody for HMAC generation to match exactly what Razorpay signed
      const rawBody = request.rawBody; 
      const signature = request.headers['x-razorpay-signature'];

      if (!signature || typeof signature !== 'string') {
        console.error('Webhook missing signature header');
        response.status(400).send('Missing signature');
        return;
      }

      // Verify signature BEFORE parsing the payload
      if (!verifyWebhookSignature(rawBody, signature, razorpayWebhookSecret.value())) {
        console.error('Webhook signature verification failed');
        response.status(401).send('Unauthorized');
        return;
      }

      const event = JSON.parse(rawBody.toString());
      const eventId = request.headers['x-razorpay-event-id'] as string;

      // Offload to a Task Queue for idempotent processing (avoid gateway timeouts)
      const queue = getFunctions().taskQueue('processRazorpayWebhook');
      await queue.enqueue({ event, eventId });

      // Acknowledge receipt to Razorpay immediately
      response.status(200).send('OK');

    } catch (error) {
      console.error('Webhook handling error:', error);
      response.status(500).send('Internal Server Error');
    }
});
