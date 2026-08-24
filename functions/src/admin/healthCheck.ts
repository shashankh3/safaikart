import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logError, logInfo } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const healthCheck = onRequest({ invoker: 'public' }, async (req, res) => {
  try {
    // Perform a quick dependency check (e.g. check if Firestore is reachable)
    // A simple limit(1) query on any collection is sufficient
    await db.collection('appConfig').limit(1).get();
    
    logInfo('Health check passed');
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    logError('Health check failed', error);
    res.status(503).json({ status: 'unhealthy', error: 'Dependency check failed' });
  }
});
