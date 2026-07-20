import { validateCouponApplicability, CouponData } from '../src/checkout/coupon.logic';

function makeCoupon(overrides: Partial<CouponData> = {}): CouponData {
  return {
    isActive: true,
    usedCount: 0,
    type: 'flat',
    discountValue: 5000, // ₹50
    ...overrides,
  };
}

const uid = 'user_123';
const cartTotal = 50000; // ₹500

describe('validateCouponApplicability', () => {
  it('should apply a valid flat coupon', () => {
    const result = validateCouponApplicability(makeCoupon(), uid, cartTotal);
    expect(result.valid).toBe(true);
    expect(result.discountMinor).toBe(5000);
    expect(result.newTotalMinor).toBe(45000);
  });

  it('should apply a valid percent coupon', () => {
    const result = validateCouponApplicability(
      makeCoupon({ type: 'percent', discountValue: 10 }),
      uid, cartTotal
    );
    expect(result.valid).toBe(true);
    expect(result.discountMinor).toBe(5000); // 10% of 50000
    expect(result.newTotalMinor).toBe(45000);
  });

  it('should reject an inactive coupon', () => {
    const result = validateCouponApplicability(makeCoupon({ isActive: false }), uid, cartTotal);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('no longer active');
  });

  it('should reject an expired coupon', () => {
    const expired = { toDate: () => new Date('2020-01-01') };
    const result = validateCouponApplicability(
      makeCoupon({ validUntil: expired }),
      uid, cartTotal, new Date('2025-01-01')
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain('expired');
  });

  it('should accept a coupon that has not expired yet', () => {
    const future = { toDate: () => new Date('2030-01-01') };
    const result = validateCouponApplicability(
      makeCoupon({ validUntil: future }),
      uid, cartTotal
    );
    expect(result.valid).toBe(true);
  });

  it('should reject when usage limit is reached', () => {
    const result = validateCouponApplicability(
      makeCoupon({ usedCount: 100, maxUsage: 100 }),
      uid, cartTotal
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain('usage limit');
  });

  it('should reject when user already used the coupon', () => {
    const result = validateCouponApplicability(
      makeCoupon({ usedBy: ['user_123', 'user_456'] }),
      uid, cartTotal
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain('already used');
  });

  it('should reject when cart is below minimum order amount', () => {
    const result = validateCouponApplicability(
      makeCoupon({ minimumOrderAmount: 100000 }), // ₹1000 minimum
      uid, cartTotal // ₹500
    );
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Minimum order');
  });

  it('should cap discount at cart total (never go negative)', () => {
    const result = validateCouponApplicability(
      makeCoupon({ discountValue: 999999 }), // ₹9999 discount on ₹500 cart
      uid, cartTotal
    );
    expect(result.valid).toBe(true);
    expect(result.discountMinor).toBe(cartTotal); // Capped
    expect(result.newTotalMinor).toBe(0);
  });

  it('should floor percent discount (no fractional paise)', () => {
    const result = validateCouponApplicability(
      makeCoupon({ type: 'percent', discountValue: 33 }), // 33%
      uid, 10001 // ₹100.01
    );
    expect(result.valid).toBe(true);
    expect(result.discountMinor).toBe(Math.floor(10001 * 33 / 100)); // 3300
    expect(Number.isInteger(result.discountMinor)).toBe(true);
  });
});
