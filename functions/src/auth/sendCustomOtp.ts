import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { normalizeIndianPhoneNumber, generateSecureOtp, hashOtp, getPhoneDocId } from './otpCrypto';
import { getSmsProvider } from './smsProvider';
import { rateLimiter } from '../utils/rateLimiter';
import { logInfo, logError } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const SendOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
});

// Fixed test numbers for Play Store testing and local development
const TEST_PHONE_NUMBERS: Record<string, string> = {
  '+919999999999': '123456',
  '+919876543210': '123456',
};

export const sendCustomOtp = onCall(
  {
    region: 'asia-south1',
    cors: true,
  },
  async (request) => {
    const rawData = request.data;
    const parsed = SendOtpSchema.safeParse(rawData);

    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues[0]?.message || 'Invalid input parameters');
    }

    const { isValid, normalized: phoneNumber } = normalizeIndianPhoneNumber(parsed.data.phoneNumber);
    if (!isValid) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid phone number. Please provide a valid 10-digit Indian mobile number (e.g. +91 98765 43210).'
      );
    }

    // Rate limit by phone number: Max 4 OTP requests per 10 minutes (600 seconds)
    const phoneKey = phoneNumber.replace('+', '');
    await rateLimiter(`phone_${phoneKey}`, 'sendCustomOtp', 4, 600);

    // Rate limit by client IP if available
    const clientIp = request.rawRequest?.ip || 'anonymous_ip';
    if (clientIp !== 'anonymous_ip') {
      const sanitizedIp = clientIp.replace(/[^a-zA-Z0-9]/g, '_');
      await rateLimiter(`ip_${sanitizedIp}`, 'sendCustomOtp', 10, 600);
    }

    // Determine OTP (Test numbers use static OTP, otherwise generate cryptographically secure OTP)
    const isTestNumber = Boolean(TEST_PHONE_NUMBERS[phoneNumber]);
    const otp = isTestNumber ? TEST_PHONE_NUMBERS[phoneNumber] : generateSecureOtp();

    const hashedOtp = hashOtp(phoneNumber, otp);
    const docId = getPhoneDocId(phoneNumber);

    const db = admin.firestore();
    const otpRef = db.collection('otp_verifications').doc(docId);

    const now = Date.now();
    const expiresAtMillis = now + 5 * 60 * 1000; // 5 minutes TTL

    await otpRef.set({
      phoneDocId: docId,
      phoneNumber,
      otpHash: hashedOtp,
      attempts: 0,
      maxAttempts: 5,
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMillis),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logInfo('OTP generated & stored', { phoneNumber: phoneNumber.slice(0, 5) + '*****', expiresAtMillis });

    // If it is a test number, skip calling the live SMS gateway
    if (isTestNumber) {
      logInfo('[TEST PHONE BLAZE] Skipped live SMS dispatch for test number', { phoneNumber });
      return {
        success: true,
        message: 'OTP sent successfully (Test Number Mode: 123456)',
      };
    }

    // Dispatch SMS via DLT provider
    const provider = getSmsProvider();
    const sendResult = await provider.sendOtp(phoneNumber, otp);

    if (!sendResult.success) {
      logError('Failed to deliver SMS via DLT gateway', { error: sendResult.error, phoneNumber });
      throw new HttpsError(
        'unavailable',
        sendResult.error || 'Failed to deliver SMS. Please check your phone number and try again in a few moments.'
      );
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      messageId: sendResult.messageId,
    };
  }
);
