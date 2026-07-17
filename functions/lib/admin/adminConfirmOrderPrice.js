"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminConfirmOrderPrice = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const assertAdmin_1 = require("../utils/assertAdmin");
const razorpayClient_1 = require("../payments/razorpayClient");
exports.adminConfirmOrderPrice = (0, https_1.onCall)({ secrets: [razorpayClient_1.razorpayKeySecret] }, async (request) => {
    (0, assertAdmin_1.assertAdmin)(request);
    const { data } = request;
    const db = admin.firestore();
    const { orderId, items } = data;
    if (!orderId || !items || !Array.isArray(items)) {
        throw new https_1.HttpsError('invalid-argument', 'orderId and items array are required.');
    }
    const orderRef = db.collection('orders').doc(orderId);
    let refundAmountMinor = 0;
    let razorpayPaymentId = null;
    let newFinalAmountMinor = 0;
    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Order not found.');
            }
            const orderData = orderDoc.data();
            if (orderData.priceConfirmed) {
                throw new https_1.HttpsError('failed-precondition', 'Order prices are already confirmed.');
            }
            // Map incoming items by serviceId for easy lookup
            const incomingItemsMap = new Map();
            for (const item of items) {
                incomingItemsMap.set(item.serviceId, item);
            }
            let newSubtotalMinor = 0;
            const updatedItems = [...orderData.items];
            for (let i = 0; i < updatedItems.length; i++) {
                const item = updatedItems[i];
                if (item.priceType === 'variable') {
                    const incoming = incomingItemsMap.get(item.serviceId);
                    if (incoming) {
                        if (!Number.isInteger(incoming.quantity) || incoming.quantity <= 0 || incoming.quantity > 100) {
                            throw new https_1.HttpsError('invalid-argument', `Invalid quantity for serviceId ${item.serviceId}`);
                        }
                        if (!Number.isInteger(incoming.unitPriceMinor) || incoming.unitPriceMinor < 0 || incoming.unitPriceMinor > 5000000) {
                            throw new https_1.HttpsError('invalid-argument', `Invalid unitPriceMinor for serviceId ${item.serviceId}`);
                        }
                        // Update quantity and unitPrice from admin input
                        item.quantity = incoming.quantity;
                        item.unitPriceMinor = incoming.unitPriceMinor;
                        let addonsTotalMinor = 0;
                        if (item.addons && Array.isArray(item.addons)) {
                            for (const addon of item.addons) {
                                addonsTotalMinor += addon.priceMinor;
                            }
                        }
                        const itemUnitTotalMinor = item.unitPriceMinor + addonsTotalMinor;
                        item.lineTotalMinor = itemUnitTotalMinor * item.quantity;
                    }
                    else {
                        if (item.lineTotalMinor === null || item.lineTotalMinor === 0) {
                            throw new https_1.HttpsError('invalid-argument', `Missing price confirmation for serviceId ${item.serviceId}`);
                        }
                    }
                }
                newSubtotalMinor += (item.lineTotalMinor || 0);
            }
            let newDiscountMinor = 0;
            if (orderData.couponCode) {
                const couponDoc = await transaction.get(db.collection('coupons').doc(orderData.couponCode));
                if (couponDoc.exists) {
                    const coupon = couponDoc.data();
                    if (coupon.isActive && newSubtotalMinor >= (coupon.minimumOrderAmount || 0)) {
                        if (coupon.type === 'flat')
                            newDiscountMinor = coupon.discountValue;
                        else if (coupon.type === 'percent')
                            newDiscountMinor = Math.floor((newSubtotalMinor * coupon.discountValue) / 100);
                        if (newDiscountMinor > newSubtotalMinor)
                            newDiscountMinor = newSubtotalMinor;
                    }
                }
            }
            newFinalAmountMinor = newSubtotalMinor + orderData.deliveryFeeMinor - newDiscountMinor;
            const amountDiff = newFinalAmountMinor - orderData.finalAmountMinor;
            if (['CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'CLEANING_IN_PROGRESS', 'READY_FOR_DELIVERY'].includes(orderData.status) && amountDiff !== 0) {
                if (amountDiff < 0) {
                    refundAmountMinor = Math.abs(amountDiff);
                    const paymentsSnapshot = await transaction.get(db.collection('payments')
                        .where('orderId', '==', orderId)
                        .where('status', '==', 'VERIFIED'));
                    if (!paymentsSnapshot.empty) {
                        const payment = paymentsSnapshot.docs[0].data();
                        razorpayPaymentId = payment.razorpayPaymentId;
                    }
                }
                else {
                    const newPaymentRef = db.collection('payments').doc();
                    transaction.set(newPaymentRef, {
                        orderId: orderId,
                        userId: orderData.userId,
                        provider: 'razorpay',
                        razorpayOrderId: null,
                        razorpayPaymentId: null,
                        amountMinor: amountDiff,
                        currency: 'INR',
                        method: 'upi',
                        status: 'PENDING',
                        webhookVerified: false,
                        clientCallbackReceived: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        verifiedAt: null
                    });
                    transaction.update(orderRef, { paymentStatus: 'PAYMENT_PENDING' });
                }
            }
            transaction.update(orderRef, {
                items: updatedItems,
                subtotalMinor: newSubtotalMinor,
                discountMinor: newDiscountMinor,
                finalAmountMinor: newFinalAmountMinor,
                priceConfirmed: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        if (refundAmountMinor > 0 && razorpayPaymentId) {
            const authHeader = (0, razorpayClient_1.getRazorpayAuthHeader)();
            const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: refundAmountMinor })
            });
            if (response.ok) {
                const refundData = await response.json();
                await orderRef.update({
                    refundId: refundData.id,
                    refundStatus: 'PROCESSED',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else {
                const errText = await response.text();
                console.error('Refund failed during adminConfirmOrderPrice:', errText);
                await orderRef.update({
                    refundStatus: 'FAILED',
                    refundError: errText,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        return { success: true, message: `Prices confirmed for order ${orderId}` };
    }
    catch (error) {
        console.error('Error in adminConfirmOrderPrice:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'An error occurred while confirming prices.');
    }
});
//# sourceMappingURL=adminConfirmOrderPrice.js.map