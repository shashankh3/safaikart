import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { app } from '../../app/config/firebase';

let appCheck: any = null;

try {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
  console.log('Firebase App Check initialized');
} catch (error) {
  console.warn('Failed to initialize App Check', error);
}

export { appCheck };
