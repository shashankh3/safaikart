import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { validateCouponApplicability, CouponData } from './coupon.logic';

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

  const coupon = couponDoc.data() as CouponData;
  return validateCouponApplicability(coupon, uid, cartTotalMinor);
});
