import { verifyWebhookSignature } from '../../functions/src/payments/webhook.logic';
import * as crypto from 'crypto';

describe('verifyWebhookSignature', () => {
  const secret = 'my_super_secret';
  const rawBody = JSON.stringify({ event: 'payment.captured' });

  it('should return true for a valid signature', () => {
    const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    expect(verifyWebhookSignature(rawBody, validSignature, secret)).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    const invalidSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex') + 'a';
    expect(verifyWebhookSignature(rawBody, invalidSignature, secret)).toBe(false);
  });

  it('should return false for a tampered body', () => {
    const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const tamperedBody = JSON.stringify({ event: 'payment.failed' });
    expect(verifyWebhookSignature(tamperedBody, validSignature, secret)).toBe(false);
  });

  it('should return false for a wrong secret', () => {
    const validSignature = crypto.createHmac('sha256', 'wrong_secret').update(rawBody).digest('hex');
    expect(verifyWebhookSignature(rawBody, validSignature, secret)).toBe(false);
  });
});
