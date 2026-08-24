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
exports.normalizeIndianPhoneNumber = normalizeIndianPhoneNumber;
exports.generateSecureOtp = generateSecureOtp;
exports.hashOtp = hashOtp;
exports.verifyOtpHash = verifyOtpHash;
exports.getPhoneDocId = getPhoneDocId;
const crypto = __importStar(require("crypto"));
const OTP_PEPPER = process.env.OTP_PEPPER_SECRET || 'safaikart-otp-salt-production-2026';
/**
 * Validates and normalizes an Indian phone number to standard E.164 (+91XXXXXXXXXX)
 */
function normalizeIndianPhoneNumber(input) {
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
function generateSecureOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}
/**
 * Creates a salted SHA-256 hash of the OTP and phone number
 */
function hashOtp(phoneNumber, otp) {
    return crypto
        .createHash('sha256')
        .update(`${phoneNumber}:${otp}:${OTP_PEPPER}`)
        .digest('hex');
}
/**
 * Safely compares two hashes in constant time to prevent timing attacks
 */
function verifyOtpHash(phoneNumber, submittedOtp, expectedHash) {
    const computedHash = hashOtp(phoneNumber, submittedOtp);
    if (computedHash.length !== expectedHash.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));
}
/**
 * Hashes phone number for Firestore document IDs to keep phone numbers pseudonymized
 */
function getPhoneDocId(phoneNumber) {
    return crypto.createHash('sha256').update(phoneNumber).digest('hex').substring(0, 32);
}
//# sourceMappingURL=otpCrypto.js.map