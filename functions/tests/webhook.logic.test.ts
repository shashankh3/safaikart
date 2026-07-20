import * as crypto from 'crypto';
import { verifyWebhookSignature } from '../src/payments/webhook.logic';

describe('verifyWebhookSignature', () => {
  const secret = 'test_webhook_secret_123';

  function generateSignature(body: string, key: string): string {
    return crypto.createHmac('sha256', key).update(body).digest('hex');
  }

  it('should return true for a valid signature', () => {
    const body = '{"event":"payment.captured","payload":{}}';
    const signature = generateSignature(body, secret);
    
    expect(verifyWebhookSignature(Buffer.from(body), signature, secret)).toBe(true);
  });

  it('should return false for a tampered body', () => {
    const body = '{"event":"payment.captured","payload":{}}';
    const signature = generateSignature(body, secret);
    const tamperedBody = '{"event":"payment.captured","payload":{"hacked":true}}';
    
    expect(verifyWebhookSignature(Buffer.from(tamperedBody), signature, secret)).toBe(false);
  });

  it('should return false for a wrong secret', () => {
    const body = '{"event":"payment.captured"}';
    const signature = generateSignature(body, 'wrong_secret');
    
    expect(verifyWebhookSignature(Buffer.from(body), signature, secret)).toBe(false);
  });

  it('should return false for empty signature', () => {
    const body = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(Buffer.from(body), '', secret)).toBe(false);
  });

  it('should return false for empty secret', () => {
    const body = '{"event":"payment.captured"}';
    const signature = generateSignature(body, secret);
    expect(verifyWebhookSignature(Buffer.from(body), signature, '')).toBe(false);
  });

  it('should return false for empty body', () => {
    expect(verifyWebhookSignature(Buffer.from(''), 'abc', secret)).toBe(false);
  });

  it('should handle string body input', () => {
    const body = '{"event":"payment.captured"}';
    const signature = generateSignature(body, secret);
    
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('should resist timing attacks (signature length mismatch)', () => {
    const body = '{"event":"payment.captured"}';
    const shortSignature = 'abc123';
    
    expect(verifyWebhookSignature(Buffer.from(body), shortSignature, secret)).toBe(false);
  });
});
