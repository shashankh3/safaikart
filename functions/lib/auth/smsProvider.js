"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSmsProvider = exports.TwoFactorProvider = exports.Msg91Provider = exports.Fast2SmsProvider = void 0;
exports.getSmsProvider = getSmsProvider;
const logger_1 = require("../utils/logger");
/**
 * Fast2SMS DLT Provider
 * Fast2SMS uses DLT Template ID in the `message` field and OTP variable in `variables_values`.
 */
class Fast2SmsProvider {
    constructor(config) {
        this.apiKey = (config === null || config === void 0 ? void 0 : config.apiKey) || process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY || '';
        this.senderId = (config === null || config === void 0 ? void 0 : config.senderId) || process.env.FAST2SMS_SENDER_ID || process.env.DLT_SENDER_ID || 'SAFAIK';
        this.templateId = (config === null || config === void 0 ? void 0 : config.templateId) || process.env.FAST2SMS_TEMPLATE_ID || process.env.DLT_TE_ID || '';
        this.entityId = (config === null || config === void 0 ? void 0 : config.entityId) || process.env.FAST2SMS_ENTITY_ID || process.env.DLT_PE_ID || '';
    }
    async sendOtp(phoneNumber, otp) {
        if (!this.apiKey) {
            (0, logger_1.logError)('Fast2SMS: API key not configured', null);
            return { success: false, error: 'SMS gateway API key not configured' };
        }
        // Extract 10 digit Indian number without country code
        const rawNumber = phoneNumber.replace(/\D/g, '').replace(/^91/, '');
        try {
            const payload = {
                route: 'dlt',
                sender_id: this.senderId,
                message: this.templateId,
                variables_values: otp,
                numbers: rawNumber,
                flash: 0,
            };
            if (this.entityId) {
                payload.entity_id = this.entityId;
            }
            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    authorization: this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = (await response.json());
            if (response.ok && (data === null || data === void 0 ? void 0 : data.return) === true) {
                (0, logger_1.logInfo)('Fast2SMS: OTP dispatched successfully', { request_id: data.request_id });
                return { success: true, messageId: data.request_id || 'fast2sms-ok' };
            }
            const errMsg = Array.isArray(data === null || data === void 0 ? void 0 : data.message) ? data.message.join(', ') : (data === null || data === void 0 ? void 0 : data.message) || 'Fast2SMS error';
            (0, logger_1.logError)('Fast2SMS failed to send SMS', { error: errMsg, status: response.status });
            return { success: false, error: errMsg };
        }
        catch (err) {
            (0, logger_1.logError)('Fast2SMS exception', err);
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'Network error communicating with SMS gateway' };
        }
    }
}
exports.Fast2SmsProvider = Fast2SmsProvider;
/**
 * MSG91 Flow / OTP DLT Provider
 */
class Msg91Provider {
    constructor(config) {
        this.authKey = (config === null || config === void 0 ? void 0 : config.authKey) || process.env.MSG91_AUTH_KEY || process.env.SMS_API_KEY || '';
        this.templateId = (config === null || config === void 0 ? void 0 : config.templateId) || process.env.MSG91_TEMPLATE_ID || process.env.DLT_TE_ID || '';
    }
    async sendOtp(phoneNumber, otp) {
        if (!this.authKey) {
            return { success: false, error: 'MSG91 Auth Key not configured' };
        }
        const cleanNumber = phoneNumber.replace(/\D/g, ''); // 91XXXXXXXXXX
        try {
            const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(this.templateId)}&mobile=${encodeURIComponent(cleanNumber)}&authkey=${encodeURIComponent(this.authKey)}&otp=${encodeURIComponent(otp)}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = (await response.json());
            if (response.ok && ((data === null || data === void 0 ? void 0 : data.type) === 'success' || (data === null || data === void 0 ? void 0 : data.message) === 'OTP sent successfully')) {
                (0, logger_1.logInfo)('MSG91: OTP sent successfully', { message: data.message });
                return { success: true, messageId: data.messageId || 'msg91-ok' };
            }
            return { success: false, error: (data === null || data === void 0 ? void 0 : data.message) || 'MSG91 dispatch failed' };
        }
        catch (err) {
            (0, logger_1.logError)('MSG91 exception', err);
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'MSG91 network error' };
        }
    }
}
exports.Msg91Provider = Msg91Provider;
/**
 * 2Factor.in DLT Provider
 */
class TwoFactorProvider {
    constructor(config) {
        this.apiKey = (config === null || config === void 0 ? void 0 : config.apiKey) || process.env.TWOFACTOR_API_KEY || process.env.SMS_API_KEY || '';
        this.templateName = (config === null || config === void 0 ? void 0 : config.templateName) || process.env.TWOFACTOR_TEMPLATE_NAME || process.env.DLT_TEMPLATE_NAME || 'OTP';
    }
    async sendOtp(phoneNumber, otp) {
        if (!this.apiKey) {
            return { success: false, error: '2Factor API Key not configured' };
        }
        const raw10Digits = phoneNumber.replace(/\D/g, '').replace(/^91/, '');
        try {
            const url = `https://2factor.in/API/V1/${encodeURIComponent(this.apiKey)}/SMS/${encodeURIComponent(raw10Digits)}/${encodeURIComponent(otp)}/${encodeURIComponent(this.templateName)}`;
            const response = await fetch(url, { method: 'GET' });
            const data = (await response.json());
            if (response.ok && (data === null || data === void 0 ? void 0 : data.Status) === 'Success') {
                (0, logger_1.logInfo)('2Factor: OTP sent successfully', { details: data.Details });
                return { success: true, messageId: data.Details };
            }
            return { success: false, error: (data === null || data === void 0 ? void 0 : data.Details) || '2Factor dispatch failed' };
        }
        catch (err) {
            (0, logger_1.logError)('2Factor exception', err);
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || '2Factor network error' };
        }
    }
}
exports.TwoFactorProvider = TwoFactorProvider;
/**
 * Mock SMS Provider for local development, tests, and emulator
 */
class MockSmsProvider {
    async sendOtp(phoneNumber, otp) {
        (0, logger_1.logInfo)(`[MOCK DLT SMS] Sent to: ${phoneNumber} | OTP Code: ${otp} | Template: SafaiKart Verification`);
        return {
            success: true,
            messageId: `mock-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        };
    }
}
exports.MockSmsProvider = MockSmsProvider;
/**
 * Factory function to resolve the configured SMS Provider
 */
function getSmsProvider() {
    const providerType = (process.env.SMS_PROVIDER || '').toLowerCase();
    if (providerType === 'fast2sms') {
        return new Fast2SmsProvider();
    }
    if (providerType === 'msg91') {
        return new Msg91Provider();
    }
    if (providerType === '2factor' || providerType === 'twofactor') {
        return new TwoFactorProvider();
    }
    // If Fast2SMS keys exist in env, default to Fast2SMS
    if (process.env.FAST2SMS_API_KEY) {
        return new Fast2SmsProvider();
    }
    // Fallback to Mock provider for local/emulator or unconfigured environments
    return new MockSmsProvider();
}
//# sourceMappingURL=smsProvider.js.map