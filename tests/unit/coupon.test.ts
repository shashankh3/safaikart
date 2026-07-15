import { validateCouponApplicability, CouponData } from '../../functions/src/checkout/coupon.logic';

describe('validateCouponApplicability', () => {
  const uid = 'user1';
  const now = new Date('2026-07-01T00:00:00Z');

  const baseCoupon: CouponData = {
    isActive: true,
    usedCount: 0,
    type: 'flat',
    discountValue: 1000,
    minimumOrderAmount: 2000,
  };

  it('should validate a valid active coupon', () => {
    const res = validateCouponApplicability(baseCoupon, uid, 3000, now);
    expect(res.valid).toBe(true);
    expect(res.discountMinor).toBe(1000);
  });

  it('should reject inactive coupon', () => {
    const res = validateCouponApplicability({ ...baseCoupon, isActive: false }, uid, 3000, now);
    expect(res.valid).toBe(false);
    expect(res.message).toBe('Coupon is no longer active');
  });

  it('should reject expired coupon', () => {
    const expiredCoupon = { ...baseCoupon, validUntil: { toDate: () => new Date('2026-06-01T00:00:00Z') } };
    const res = validateCouponApplicability(expiredCoupon, uid, 3000, now);
    expect(res.valid).toBe(false);
    expect(res.message).toBe('Coupon has expired');
  });

  it('should reject if minimum amount exactly at boundary is not met', () => {
    const res = validateCouponApplicability(baseCoupon, uid, 1999, now);
    expect(res.valid).toBe(false);
    expect(res.message).toContain('Minimum order amount');
  });

  it('should accept if minimum amount is exactly met', () => {
    const res = validateCouponApplicability(baseCoupon, uid, 2000, now);
    expect(res.valid).toBe(true);
    expect(res.discountMinor).toBe(1000);
  });

  it('should correctly compute percent discount', () => {
    const percentCoupon: CouponData = { ...baseCoupon, type: 'percent', discountValue: 20 };
    const res = validateCouponApplicability(percentCoupon, uid, 4000, now);
    expect(res.valid).toBe(true);
    expect(res.discountMinor).toBe(800); // 20% of 4000
  });
});
