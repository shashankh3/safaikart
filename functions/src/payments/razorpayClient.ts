import { defineSecret } from 'firebase-functions/params';

export const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
export const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

export function getRazorpayAuthHeader(): string {
  const keyId = razorpayKeyId.value().trim();
  const keySecret = razorpayKeySecret.value().trim();
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay secrets are not properly configured.');
  }
  
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}
