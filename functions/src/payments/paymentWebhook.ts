import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { getFunctions } from 'firebase-admin/functions';
import { verifyWebhookSignature } from './webhook.logic';

const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

if (!admin.apps.length) {
  admin.initializeApp();
}

export const paymentWebhook = onRequest({ secrets: [razorpayWebhookSecret] }, async (request, response) => {
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
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Webhook signature verification failed');
      response.status(400).send('Invalid signature');
      return;
    }

    // Parse Event safely
    const event = JSON.parse(rawBody.toString());
    const eventId = request.headers['x-razorpay-event-id'] as string;

    // Enqueue the task for async processing
    // Note: The task queue name must match the exported function name exactly, but in lowercase if deploying to GCP sometimes.
    // In Firebase Gen 2, it typically matches the camelCase name of the function. Let's use the exact function name.
    const queue = getFunctions().taskQueue('processRazorpayWebhook');
    await queue.enqueue({ event, eventId });

    // Respond 200 OK immediately so Razorpay doesn't retry
    response.status(200).send('OK');

  } catch (error) {
    console.error('Webhook enqueuing error:', error);
    // Return 500 so Razorpay retries the webhook if we failed to enqueue it
    response.status(500).send('Internal Server Error');
  }
});
