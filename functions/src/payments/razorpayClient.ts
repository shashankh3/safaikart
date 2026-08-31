import { defineSecret } from 'firebase-functions/params';

export const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
export const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

export function getRazorpayKeyId(): string {
  try {
    const val = razorpayKeyId.value();
    if (val && val.trim()) return val.trim();
  } catch (_) {}
  return (process.env.RAZORPAY_KEY_ID || 'rzp_test_safaikart').trim();
}

export function getRazorpayKeySecret(): string {
  try {
    const val = razorpayKeySecret.value();
    if (val && val.trim()) return val.trim();
  } catch (_) {}
  return (process.env.RAZORPAY_KEY_SECRET || 'safaikart_secret').trim();
}

export function getRazorpayAuthHeader(): string {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}
