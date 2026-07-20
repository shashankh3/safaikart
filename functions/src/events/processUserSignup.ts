import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { logInfo, logError } from '../utils/logger';

export const processUserSignup = onMessagePublished('user-signup-events', async (event) => {
  const data = event.data.message.json;
  
  if (!data || !data.uid) {
    logError('Received malformed user-signup-events message', data);
    return;
  }

  logInfo(`Processing async tasks for new user: ${data.uid}`);

  try {
    // Mock: Send Welcome Email
    // await sendGrid.send({ to: data.email, templateId: 'welcome_template' });
    
    // Mock: Create CRM Entry
    // await hubspot.contacts.create({ email: data.email, firstname: data.displayName });
    
    logInfo(`Successfully processed signup background tasks for ${data.uid}`);
  } catch (error) {
    logError(`Failed to process async tasks for ${data.uid}`, error);
    // Throwing ensures Pub/Sub retries the message according to subscription settings
    throw error;
  }
});
