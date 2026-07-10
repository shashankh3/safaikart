import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { app } from '../../app/config/firebase';

// IMPORTANT: You must configure a ReCaptcha Enterprise Site Key in Google Cloud
// and register it in Firebase Console -> App Check.
// Also configure Play Integrity for Android in Firebase Console.

let appCheck: any = null;

try {
  // This will enforce App Check on this client.
  // In development, you may need a debug token.
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
  console.log('Firebase App Check initialized');
} catch (error) {
  console.warn('Failed to initialize App Check', error);
}

export { appCheck };
