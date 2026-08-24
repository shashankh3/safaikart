"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCustomOtp = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const otpCrypto_1 = require("./otpCrypto");
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const VerifyOtpSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(10, 'Phone number must be at least 10 digits'),
    otp: zod_1.z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});
const TEST_PHONE_NUMBERS = {
    '+919999999999': '123456',
    '+919876543210': '123456',
};
exports.verifyCustomOtp = (0, https_1.onCall)({
    region: 'asia-south1',
    cors: true,
}, async (request) => {
    var _a;
    const rawData = request.data;
    const parsed = VerifyOtpSchema.safeParse(rawData);
    if (!parsed.success) {
        throw new https_1.HttpsError('invalid-argument', ((_a = parsed.error.issues[0]) === null || _a === void 0 ? void 0 : _a.message) || 'Invalid input parameters');
    }
    const { isValid, normalized: phoneNumber } = (0, otpCrypto_1.normalizeIndianPhoneNumber)(parsed.data.phoneNumber);
    if (!isValid) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid phone number format');
    }
    const submittedOtp = parsed.data.otp.trim();
    const isTestNumber = Boolean(TEST_PHONE_NUMBERS[phoneNumber]);
    const db = admin.firestore();
    const docId = (0, otpCrypto_1.getPhoneDocId)(phoneNumber);
    const otpRef = db.collection('otp_verifications').doc(docId);
    if (isTestNumber && TEST_PHONE_NUMBERS[phoneNumber] === submittedOtp) {
        (0, logger_1.logInfo)('Test number verified with fixed test OTP', { phoneNumber });
    }
    else {
        // Run atomic verification transaction
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(otpRef);
            if (!snap.exists) {
                throw new https_1.HttpsError('not-found', 'No OTP request found for this number or OTP has already been used. Please request a new OTP.');
            }
            const data = snap.data();
            const now = Date.now();
            const expiresAtMillis = data.expiresAt ? data.expiresAt.toMillis() : 0;
            if (now > expiresAtMillis) {
                tx.delete(otpRef);
                throw new https_1.HttpsError('deadline-exceeded', 'OTP has expired. Please request a new OTP.');
            }
            const currentAttempts = (data.attempts || 0) + 1;
            const maxAttempts = data.maxAttempts || 5;
            if (currentAttempts > maxAttempts) {
                tx.delete(otpRef);
                throw new https_1.HttpsError('permission-denied', 'Too many failed attempts. This OTP has been invalidated. Please request a new OTP.');
            }
            const isMatch = (0, otpCrypto_1.verifyOtpHash)(phoneNumber, submittedOtp, data.otpHash);
            if (!isMatch) {
                tx.update(otpRef, { attempts: currentAttempts });
                const remaining = maxAttempts - currentAttempts;
                throw new https_1.HttpsError('invalid-argument', `Incorrect OTP. Please check the 6-digit code and try again. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`);
            }
            // Successfully verified, delete the OTP record
            tx.delete(otpRef);
        });
    }
    // Resolve or Create Firebase Auth User
    let userRecord;
    let isNewUser = false;
    try {
        userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
    }
    catch (err) {
        if (err.code === 'auth/user-not-found') {
            try {
                userRecord = await admin.auth().createUser({
                    phoneNumber,
                    displayName: 'Customer',
                });
                isNewUser = true;
                (0, logger_1.logInfo)('Created new Firebase Auth user via custom OTP', { uid: userRecord.uid, phoneNumber });
            }
            catch (createErr) {
                (0, logger_1.logError)('Failed to create Firebase user for verified phone', createErr);
                throw new https_1.HttpsError('internal', 'Failed to initialize user account');
            }
        }
        else {
            (0, logger_1.logError)('Error retrieving user by phone number', err);
            throw new https_1.HttpsError('internal', 'Authentication lookup failed');
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
            batch.set(userRef, {
                phoneNumber,
                createdAt: now,
                authProvider: 'dlt_sms',
            }, { merge: true });
            batch.set(profileRef, {
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
            }, { merge: true });
            await batch.commit();
        }
    }
    catch (dbErr) {
        (0, logger_1.logError)('Failed to ensure user/profile docs in Firestore', dbErr);
    }
    // Create Firebase Custom Token
    try {
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        (0, logger_1.logInfo)('Custom token generated successfully for user', { uid: userRecord.uid });
        return {
            success: true,
            customToken,
            uid: userRecord.uid,
            isNewUser,
        };
    }
    catch (tokenErr) {
        (0, logger_1.logError)('Failed to create custom token', tokenErr);
        throw new https_1.HttpsError('internal', 'Failed to generate session token');
    }
});
//# sourceMappingURL=verifyCustomOtp.js.map