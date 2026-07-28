import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { getFunctions } from 'firebase-admin/functions';
import { verifyWebhookSignature } from './webhook.logic';
import { logError } from '../utils/logger';

export const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

if (!admin.apps.length) {
  admin.initializeApp();
}

export const paymentWebhook = onRequest(
  { secrets: [razorpayWebhookSecret], region: 'asia-south1' }, 
  async (request, response) => {
    try {
      // Must use rawBody for HMAC generation to match exactly what Razorpay signed
      const rawBody = request.rawBody; 
      const signature = request.headers['x-razorpay-signature'];

      if (!signature || typeof signature !== 'string') {
        logError('Webhook missing signature header');
        response.status(400).send('Missing signature');
        return;
      }

      // Verify signature BEFORE parsing the payload
      if (!verifyWebhookSignature(rawBody, signature, razorpayWebhookSecret.value())) {
        logError('Webhook signature verification failed');
        response.status(401).send('Unauthorized');
        return;
      }

      const event = JSON.parse(rawBody.toString());
      let eventId = request.headers['x-razorpay-event-id'] as string;

      if (!eventId) {
        // Fallback: Generate deterministic eventId from payload signature
        const crypto = await import('crypto');
        const paymentId = event?.payload?.payment?.entity?.id || event?.payload?.order?.entity?.id || Date.now();
        eventId = `generated_${crypto.createHash('sha256').update(`${event.event}_${paymentId}`).digest('hex')}`;
      }

      // Offload to a Task Queue for idempotent processing (avoid gateway timeouts)
      const queue = getFunctions().taskQueue('processRazorpayWebhook');
      await queue.enqueue({ event, eventId });

      // Acknowledge receipt to Razorpay immediately
      response.status(200).send('OK');

    } catch (error) {
      logError('Webhook handling error:', error);
      response.status(500).send('Internal Server Error');
    }
});
