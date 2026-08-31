import * as crypto from 'crypto';
import { defineSecret } from 'firebase-functions/params';

export const otpPepperSecret = defineSecret('OTP_PEPPER_SECRET');

/**
 * Validates and normalizes an Indian phone number to standard E.164 (+91XXXXXXXXXX)
 */
export function normalizeIndianPhoneNumber(input: string): { isValid: boolean; normalized: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, normalized: '' };
  }

  const cleaned = input.trim().replace(/[^\d+]/g, '');

  // If starts with +91 and has 10 subsequent digits starting with 6-9
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, normalized: cleaned };
  }

  // If starts with 91 (without +) and has 10 digits
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, normalized: `+${cleaned}` };
  }

  // If 10 digits starting with 6-9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, normalized: `+91${cleaned}` };
  }

  // Test numbers bypass (e.g. +919999999999 or +911234567890)
  if (/^\+91\d{10}$/.test(cleaned)) {
    return { isValid: true, normalized: cleaned };
  }

  return { isValid: false, normalized: cleaned };
}

/**
 * Generates a cryptographically secure 6-digit OTP
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Creates a salted SHA-256 hash of the OTP and phone number
 */
export function hashOtp(phoneNumber: string, otp: string): string {
  const pepper = process.env.NODE_ENV === 'test' 
    ? 'test-pepper' 
    : otpPepperSecret.value();
    
  return crypto
    .createHash('sha256')
    .update(`${phoneNumber}:${otp}:${pepper}`)
    .digest('hex');
}

/**
 * Safely compares two hashes in constant time to prevent timing attacks
 */
export function verifyOtpHash(phoneNumber: string, submittedOtp: string, expectedHash: string): boolean {
  const computedHash = hashOtp(phoneNumber, submittedOtp);
  if (computedHash.length !== expectedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));
}

/**
 * Hashes phone number for Firestore document IDs to keep phone numbers pseudonymized
 */
export function getPhoneDocId(phoneNumber: string): string {
  return crypto.createHash('sha256').update(phoneNumber).digest('hex').substring(0, 32);
}
