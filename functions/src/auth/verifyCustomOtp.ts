import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { normalizeIndianPhoneNumber, verifyOtpHash, getPhoneDocId } from './otpCrypto';
import { logInfo, logError } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const VerifyOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

const TEST_PHONE_NUMBERS: Record<string, string> = {
  '+919999999999': '123456',
  '+919876543210': '123456',
};

export const verifyCustomOtp = onCall(
  {
    region: 'asia-south1',
    cors: true,
  },
  async (request) => {
    const rawData = request.data;
    const parsed = VerifyOtpSchema.safeParse(rawData);

    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues[0]?.message || 'Invalid input parameters');
    }

    const { isValid, normalized: phoneNumber } = normalizeIndianPhoneNumber(parsed.data.phoneNumber);
    if (!isValid) {
      throw new HttpsError('invalid-argument', 'Invalid phone number format');
    }

    const submittedOtp = parsed.data.otp.trim();
    const isTestNumber = Boolean(TEST_PHONE_NUMBERS[phoneNumber]);
    const db = admin.firestore();
    const docId = getPhoneDocId(phoneNumber);
    const otpRef = db.collection('otp_verifications').doc(docId);

    if (isTestNumber && TEST_PHONE_NUMBERS[phoneNumber] === submittedOtp) {
      logInfo('Test number verified with fixed test OTP', { phoneNumber });
    } else {
      // Run atomic verification transaction
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(otpRef);
        if (!snap.exists) {
          throw new HttpsError(
            'not-found',
            'No OTP request found for this number or OTP has already been used. Please request a new OTP.'
          );
        }

        const data = snap.data()!;
        const now = Date.now();
        const expiresAtMillis = data.expiresAt ? data.expiresAt.toMillis() : 0;

        if (now > expiresAtMillis) {
          tx.delete(otpRef);
          throw new HttpsError('deadline-exceeded', 'OTP has expired. Please request a new OTP.');
        }

        const currentAttempts = (data.attempts || 0) + 1;
        const maxAttempts = data.maxAttempts || 5;

        if (currentAttempts > maxAttempts) {
          tx.delete(otpRef);
          throw new HttpsError(
            'permission-denied',
            'Too many failed attempts. This OTP has been invalidated. Please request a new OTP.'
          );
        }

        const isMatch = verifyOtpHash(phoneNumber, submittedOtp, data.otpHash);

        if (!isMatch) {
          tx.update(otpRef, { attempts: currentAttempts });
          const remaining = maxAttempts - currentAttempts;
          throw new HttpsError(
            'invalid-argument',
            `Incorrect OTP. Please check the 6-digit code and try again. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
          );
        }

        // Successfully verified, delete the OTP record
        tx.delete(otpRef);
      });
    }

    // Resolve or Create Firebase Auth User
    let userRecord: admin.auth.UserRecord;
    let isNewUser = false;

    try {
      userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        try {
          userRecord = await admin.auth().createUser({
            phoneNumber,
            displayName: 'Customer',
          });
          isNewUser = true;
          logInfo('Created new Firebase Auth user via custom OTP', { uid: userRecord.uid, phoneNumber });
        } catch (createErr: any) {
          logError('Failed to create Firebase user for verified phone', createErr);
          throw new HttpsError('internal', 'Failed to initialize user account');
        }
      } else {
        logError('Error retrieving user by phone number', err);
        throw new HttpsError('internal', 'Authentication lookup failed');
      }
    }

    // Ensure users/{uid} and profiles/{uid} documents exist in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    const profileRef = db.collection('profiles').doc(userRecord.uid);

    try {
      const profileSnap = await profileRef.get();
      if (!profileSnap.exists) {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();

        batch.set(
          userRef,
          {
            phoneNumber,
            createdAt: now,
            authProvider: 'dlt_sms',
          },
          { merge: true }
        );

        batch.set(
          profileRef,
          {
            userId: userRecord.uid,
            phoneNumber,
            displayName: userRecord.displayName || 'Customer',
            email: userRecord.email || null,
            photoURL: userRecord.photoURL || null,
            isBlocked: false,
            createdAt: now,
            updatedAt: now,
            defaultAddressId: null,
            fcmTokens: [],
          },
          { merge: true }
        );

        await batch.commit();
      }
    } catch (dbErr) {
      logError('Failed to ensure user/profile docs in Firestore', dbErr);
    }

    // Create Firebase Custom Token
    try {
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      logInfo('Custom token generated successfully for user', { uid: userRecord.uid });

      return {
        success: true,
        customToken,
        uid: userRecord.uid,
        isNewUser,
      };
    } catch (tokenErr: any) {
      logError('Failed to create custom token', tokenErr);
      throw new HttpsError('internal', `Failed to generate session token: ${tokenErr.message || tokenErr}`);
    }
  }
);
