"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCouponApplicability = validateCouponApplicability;
function validateCouponApplicability(coupon, uid, cartTotalMinor, now = new Date()) {
    if (!coupon.isActive) {
        return { valid: false, discountMinor: 0, message: 'Coupon is no longer active', newTotalMinor: cartTotalMinor };
    }
    if (coupon.validUntil && coupon.validUntil.toDate() < now) {
        return { valid: false, discountMinor: 0, message: 'Coupon has expired', newTotalMinor: cartTotalMinor };
    }
    if (coupon.usedCount >= (coupon.maxUsage || Infinity)) {
        return { valid: false, discountMinor: 0, message: 'Coupon usage limit reached', newTotalMinor: cartTotalMinor };
    }
    if (coupon.usedBy && coupon.usedBy.includes(uid)) {
        return { valid: false, discountMinor: 0, message: 'You have already used this coupon', newTotalMinor: cartTotalMinor };
    }
    const minAmount = coupon.minimumOrderAmount || 0;
    if (cartTotalMinor < minAmount) {
        return { valid: false, discountMinor: 0, message: `Minimum order amount is Rs ${minAmount / 100}`, newTotalMinor: cartTotalMinor };
    }
    let discountMinor = 0;
    if (coupon.type === 'flat') {
        discountMinor = coupon.discountValue;
    }
    else if (coupon.type === 'percent') {
        discountMinor = Math.floor((cartTotalMinor * coupon.discountValue) / 100);
    }
    if (discountMinor > cartTotalMinor)
        discountMinor = cartTotalMinor;
    return {
        valid: true,
        discountMinor,
        message: 'Coupon applied',
        newTotalMinor: cartTotalMinor - discountMinor
    };
}
//# sourceMappingURL=coupon.logic.js.map