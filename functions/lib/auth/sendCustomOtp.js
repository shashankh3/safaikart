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
exports.sendCustomOtp = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const otpCrypto_1 = require("./otpCrypto");
const smsProvider_1 = require("./smsProvider");
const rateLimiter_1 = require("../utils/rateLimiter");
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const SendOtpSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(10, 'Phone number must be at least 10 digits'),
});
// Fixed test numbers for Play Store testing and local development
const TEST_PHONE_NUMBERS = {
    '+919999999999': '123456',
    '+919876543210': '123456',
};
exports.sendCustomOtp = (0, https_1.onCall)({
    region: 'asia-south1',
    cors: true,
}, async (request) => {
    var _a, _b;
    const rawData = request.data;
    const parsed = SendOtpSchema.safeParse(rawData);
    if (!parsed.success) {
        throw new https_1.HttpsError('invalid-argument', ((_a = parsed.error.issues[0]) === null || _a === void 0 ? void 0 : _a.message) || 'Invalid input parameters');
    }
    const { isValid, normalized: phoneNumber } = (0, otpCrypto_1.normalizeIndianPhoneNumber)(parsed.data.phoneNumber);
    if (!isValid) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid phone number. Please provide a valid 10-digit Indian mobile number (e.g. +91 98765 43210).');
    }
    // Rate limit by phone number: Max 4 OTP requests per 10 minutes (600 seconds)
    const phoneKey = phoneNumber.replace('+', '');
    await (0, rateLimiter_1.rateLimiter)(`phone_${phoneKey}`, 'sendCustomOtp', 4, 600);
    // Rate limit by client IP if available
    const clientIp = ((_b = request.rawRequest) === null || _b === void 0 ? void 0 : _b.ip) || 'anonymous_ip';
    if (clientIp !== 'anonymous_ip') {
        const sanitizedIp = clientIp.replace(/[^a-zA-Z0-9]/g, '_');
        await (0, rateLimiter_1.rateLimiter)(`ip_${sanitizedIp}`, 'sendCustomOtp', 10, 600);
    }
    // Determine OTP (Test numbers use static OTP, otherwise generate cryptographically secure OTP)
    const isTestNumber = Boolean(TEST_PHONE_NUMBERS[phoneNumber]);
    const otp = isTestNumber ? TEST_PHONE_NUMBERS[phoneNumber] : (0, otpCrypto_1.generateSecureOtp)();
    const hashedOtp = (0, otpCrypto_1.hashOtp)(phoneNumber, otp);
    const docId = (0, otpCrypto_1.getPhoneDocId)(phoneNumber);
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
    (0, logger_1.logInfo)('OTP generated & stored', { phoneNumber: phoneNumber.slice(0, 5) + '*****', expiresAtMillis });
    // If it is a test number, skip calling the live SMS gateway
    if (isTestNumber) {
        (0, logger_1.logInfo)('[TEST PHONE BLAZE] Skipped live SMS dispatch for test number', { phoneNumber });
        return {
            success: true,
            message: 'OTP sent successfully (Test Number Mode: 123456)',
        };
    }
    // Dispatch SMS via DLT provider
    const provider = (0, smsProvider_1.getSmsProvider)();
    const sendResult = await provider.sendOtp(phoneNumber, otp);
    if (!sendResult.success) {
        (0, logger_1.logError)('Failed to deliver SMS via DLT gateway', { error: sendResult.error, phoneNumber });
        throw new https_1.HttpsError('unavailable', sendResult.error || 'Failed to deliver SMS. Please check your phone number and try again in a few moments.');
    }
    return {
        success: true,
        message: 'OTP sent successfully',
        messageId: sendResult.messageId,
    };
});
//# sourceMappingURL=sendCustomOtp.js.map