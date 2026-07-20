import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { createLogger } from './logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const logger = createLogger({ context: 'DLQ_Handler' });

export const processDeadLetters = onMessagePublished('safaikart-dlq', async (event) => {
  const message = event.data;
  
  if (!message) {
    logger.warn('Received empty DLQ message');
    return;
  }

  const payload = message.message.json;
  const messageId = message.message.messageId;
  const attributes = message.message.attributes;

  logger.error(`Processing DLQ message ${messageId}`, payload, { attributes });

  try {
    // Persist to Firestore for manual review / replay logic
    await db.collection('deadLetters').doc(messageId).set({
      payload,
      attributes,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'UNRESOLVED'
    });
    
    logger.info(`Successfully logged dead letter ${messageId} to Firestore.`);
  } catch (err) {
    logger.error('Failed to log dead letter to Firestore', err);
    // Throwing an error here will cause PubSub to retry the DLQ handler itself, 
    // depending on the topic configuration.
    throw err;
  }
});
