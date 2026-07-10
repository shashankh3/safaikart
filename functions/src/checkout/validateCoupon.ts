import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const validateCoupon = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to validate coupon.');
  }

  const { code, cartTotalMinor } = request.data;
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Invalid coupon code format.');
  }

  const upperCode = code.toUpperCase();
  const couponDoc = await db.collection('coupons').doc(upperCode).get();

  if (!couponDoc.exists) {
    return { valid: false, discountMinor: 0, message: 'Invalid coupon code', newTotalMinor: cartTotalMinor };
  }

  const coupon = couponDoc.data()!;

  if (!coupon.isActive) {
    return { valid: false, discountMinor: 0, message: 'Coupon is no longer active', newTotalMinor: cartTotalMinor };
  }

  if (coupon.validUntil && coupon.validUntil.toDate() < new Date()) {
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
  } else if (coupon.type === 'percent') {
    discountMinor = Math.floor((cartTotalMinor * coupon.discountValue) / 100);
  }

  if (discountMinor > cartTotalMinor) discountMinor = cartTotalMinor;

  return {
    valid: true,
    discountMinor,
    message: 'Coupon applied',
    newTotalMinor: cartTotalMinor - discountMinor
  };
});
