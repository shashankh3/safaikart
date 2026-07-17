import { defineSecret } from 'firebase-functions/params';

export const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

export function getRazorpayKeyId(): string {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  const keyId = process.env.RAZORPAY_KEY_ID;
  
  if (!keyId && !isEmulator) {
     console.warn('RAZORPAY_KEY_ID environment variable is missing. This will fail in production.');
  }
  
  return keyId || 'rzp_test_placeholder';
}

export function getRazorpayAuthHeader(): string {
  const keyId = getRazorpayKeyId();
  const keySecret = razorpayKeySecret.value();
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}
