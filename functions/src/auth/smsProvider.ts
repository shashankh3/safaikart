import { logInfo, logError } from '../utils/logger';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult>;
}

/**
 * Fast2SMS DLT Provider
 * Fast2SMS uses DLT Template ID in the `message` field and OTP variable in `variables_values`.
 */
export class Fast2SmsProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;
  private templateId: string;
  private entityId?: string;

  constructor(config?: { apiKey?: string; senderId?: string; templateId?: string; entityId?: string }) {
    this.apiKey = config?.apiKey || process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY || '';
    this.senderId = config?.senderId || process.env.FAST2SMS_SENDER_ID || process.env.DLT_SENDER_ID || 'SAFAIK';
    this.templateId = config?.templateId || process.env.FAST2SMS_TEMPLATE_ID || process.env.DLT_TE_ID || '';
    this.entityId = config?.entityId || process.env.FAST2SMS_ENTITY_ID || process.env.DLT_PE_ID || '';
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    if (!this.apiKey) {
      logError('Fast2SMS: API key not configured', null);
      return { success: false, error: 'SMS gateway API key not configured' };
    }

    // Extract 10 digit Indian number without country code
    const rawNumber = phoneNumber.replace(/\D/g, '').replace(/^91/, '');

    try {
      const payload: Record<string, any> = {
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

      const data = (await response.json()) as any;

      if (response.ok && data?.return === true) {
        logInfo('Fast2SMS: OTP dispatched successfully', { request_id: data.request_id });
        return { success: true, messageId: data.request_id || 'fast2sms-ok' };
      }

      const errMsg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Fast2SMS error';
      logError('Fast2SMS failed to send SMS', { error: errMsg, status: response.status });
      return { success: false, error: errMsg };
    } catch (err: any) {
      logError('Fast2SMS exception', err);
      return { success: false, error: err?.message || 'Network error communicating with SMS gateway' };
    }
  }
}

/**
 * MSG91 Flow / OTP DLT Provider
 */
export class Msg91Provider implements SmsProvider {
  private authKey: string;
  private templateId: string;

  constructor(config?: { authKey?: string; templateId?: string }) {
    this.authKey = config?.authKey || process.env.MSG91_AUTH_KEY || process.env.SMS_API_KEY || '';
    this.templateId = config?.templateId || process.env.MSG91_TEMPLATE_ID || process.env.DLT_TE_ID || '';
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
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

      const data = (await response.json()) as any;

      if (response.ok && (data?.type === 'success' || data?.message === 'OTP sent successfully')) {
        logInfo('MSG91: OTP sent successfully', { message: data.message });
        return { success: true, messageId: data.messageId || 'msg91-ok' };
      }

      return { success: false, error: data?.message || 'MSG91 dispatch failed' };
    } catch (err: any) {
      logError('MSG91 exception', err);
      return { success: false, error: err?.message || 'MSG91 network error' };
    }
  }
}

/**
 * 2Factor.in DLT Provider
 */
export class TwoFactorProvider implements SmsProvider {
  private apiKey: string;
  private templateName: string;

  constructor(config?: { apiKey?: string; templateName?: string }) {
    this.apiKey = config?.apiKey || process.env.TWOFACTOR_API_KEY || process.env.SMS_API_KEY || '';
    this.templateName = config?.templateName || process.env.TWOFACTOR_TEMPLATE_NAME || process.env.DLT_TEMPLATE_NAME || 'OTP';
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    if (!this.apiKey) {
      return { success: false, error: '2Factor API Key not configured' };
    }

    const raw10Digits = phoneNumber.replace(/\D/g, '').replace(/^91/, '');

    try {
      const url = `https://2factor.in/API/V1/${encodeURIComponent(this.apiKey)}/SMS/${encodeURIComponent(raw10Digits)}/${encodeURIComponent(otp)}/${encodeURIComponent(this.templateName)}`;

      const response = await fetch(url, { method: 'GET' });
      const data = (await response.json()) as any;

      if (response.ok && data?.Status === 'Success') {
        logInfo('2Factor: OTP sent successfully', { details: data.Details });
        return { success: true, messageId: data.Details };
      }

      return { success: false, error: data?.Details || '2Factor dispatch failed' };
    } catch (err: any) {
      logError('2Factor exception', err);
      return { success: false, error: err?.message || '2Factor network error' };
    }
  }
}

/**
 * Mock SMS Provider for local development, tests, and emulator
 */
export class MockSmsProvider implements SmsProvider {
  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    logInfo(`[MOCK DLT SMS] Sent to: ${phoneNumber} | OTP Code: ${otp} | Template: SafaiKart Verification`);
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  }
}

/**
 * Factory function to resolve the configured SMS Provider
 */
export function getSmsProvider(): SmsProvider {
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
