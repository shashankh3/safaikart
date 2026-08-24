import {
  normalizeIndianPhoneNumber,
  generateSecureOtp,
  hashOtp,
  verifyOtpHash,
  getPhoneDocId,
} from '../../functions/src/auth/otpCrypto';
import {
  MockSmsProvider,
  Fast2SmsProvider,
  Msg91Provider,
  TwoFactorProvider,
} from '../../functions/src/auth/smsProvider';

describe('TRAI DLT Custom OTP & Phone Validation', () => {
  describe('normalizeIndianPhoneNumber', () => {
    it('normalizes 10-digit mobile number to +91 E.164 format', () => {
      const result = normalizeIndianPhoneNumber('9876543210');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+919876543210');
    });

    it('normalizes formatted numbers with spaces, dashes, or +91 prefix', () => {
      const result = normalizeIndianPhoneNumber('+91 98765-43210');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+919876543210');
    });

    it('normalizes numbers starting with 91 without +', () => {
      const result = normalizeIndianPhoneNumber('919876543210');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+919876543210');
    });

    it('rejects invalid numbers (less than 10 digits or non-mobile starting digits)', () => {
      expect(normalizeIndianPhoneNumber('12345').isValid).toBe(false);
      expect(normalizeIndianPhoneNumber('0123456789').isValid).toBe(false);
      expect(normalizeIndianPhoneNumber('abcdefghij').isValid).toBe(false);
    });

    it('allows valid test numbers in E.164', () => {
      const result = normalizeIndianPhoneNumber('+919999999999');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+919999999999');
    });
  });

  describe('generateSecureOtp', () => {
    it('generates a 6-digit numeric OTP', () => {
      const otp = generateSecureOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    });

    it('generates distinct OTPs on subsequent calls', () => {
      const set = new Set();
      for (let i = 0; i < 20; i++) {
        set.add(generateSecureOtp());
      }
      expect(set.size).toBeGreaterThan(15);
    });
  });

  describe('hashOtp and verifyOtpHash', () => {
    const phone = '+919876543210';
    const otp = '482910';

    it('successfully validates matching OTP against hash', () => {
      const hash = hashOtp(phone, otp);
      expect(verifyOtpHash(phone, otp, hash)).toBe(true);
    });

    it('rejects incorrect OTP against hash', () => {
      const hash = hashOtp(phone, otp);
      expect(verifyOtpHash(phone, '111111', hash)).toBe(false);
    });

    it('rejects OTP if phone number does not match', () => {
      const hash = hashOtp(phone, otp);
      expect(verifyOtpHash('+919999999999', otp, hash)).toBe(false);
    });
  });

  describe('getPhoneDocId', () => {
    it('produces deterministic, safe document IDs', () => {
      const id1 = getPhoneDocId('+919876543210');
      const id2 = getPhoneDocId('+919876543210');
      expect(id1).toBe(id2);
      expect(id1).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(id1)).toBe(true);
    });
  });

  describe('SMS Providers', () => {
    it('MockSmsProvider dispatches OTP and returns success result', async () => {
      const provider = new MockSmsProvider();
      const res = await provider.sendOtp('+919876543210', '123456');
      expect(res.success).toBe(true);
      expect(res.messageId).toContain('mock-msg-');
    });

    it('Fast2SmsProvider handles missing API key gracefully', async () => {
      const provider = new Fast2SmsProvider({ apiKey: '' });
      const res = await provider.sendOtp('+919876543210', '123456');
      expect(res.success).toBe(false);
      expect(res.error).toBe('SMS gateway API key not configured');
    });

    it('Msg91Provider handles missing auth key gracefully', async () => {
      const provider = new Msg91Provider({ authKey: '' });
      const res = await provider.sendOtp('+919876543210', '123456');
      expect(res.success).toBe(false);
      expect(res.error).toBe('MSG91 Auth Key not configured');
    });

    it('TwoFactorProvider handles missing API key gracefully', async () => {
      const provider = new TwoFactorProvider({ apiKey: '' });
      const res = await provider.sendOtp('+919876543210', '123456');
      expect(res.success).toBe(false);
      expect(res.error).toBe('2Factor API Key not configured');
    });
  });
});
