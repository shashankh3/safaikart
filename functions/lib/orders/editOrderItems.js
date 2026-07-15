"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editOrderItems = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
const pricing_logic_1 = require("./pricing.logic");
const editOrder_logic_1 = require("./editOrder.logic");
const razorpayKeySecret = (0, params_1.defineSecret)('RAZORPAY_KEY_SECRET');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.editOrderItems = (0, https_1.onCall)({ secrets: [razorpayKeySecret] }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in to edit an order.');
    }
    const { orderId, items } = request.data;
    if (!orderId || !items || !Array.isArray(items)) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID and items array are required.');
    }
    const orderRef = db.collection('orders').doc(orderId);
    let refundAmountMinor = 0;
    let razorpayPaymentId = null;
    let newFinalAmountMinor = 0;
    await db.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Order not found.');
        }
        const orderData = orderDoc.data();
        if (orderData.userId !== uid) {
            throw new https_1.HttpsError('permission-denied', 'Unauthorized to edit this order.');
        }
        // Verify 3-minute window
        if (!orderData.editableUntil) {
            throw new https_1.HttpsError('failed-precondition', 'This order cannot be edited.');
        }
        const editableUntilMillis = orderData.editableUntil.toMillis();
        if (Date.now() > editableUntilMillis) {
            throw new https_1.HttpsError('failed-precondition', 'The 3-minute edit window has expired.');
        }
        // Verify status
        if (orderData.status !== 'PAYMENT_PENDING' && orderData.status !== 'CONFIRMED') {
            throw new https_1.HttpsError('failed-precondition', 'Order can only be edited while payment is pending or just confirmed.');
        }
        // Process new items and recalculate
        const pricingItems = [];
        for (const item of items) {
            const serviceDoc = await transaction.get(db.collection('services').doc(item.serviceId));
            if (!serviceDoc.exists)
                continue;
            const serviceData = serviceDoc.data();
            if (!serviceData.isActive)
                continue;
            const duration = serviceData.estimatedDurationHours || (serviceData.categoryId === 'steam_press' ? 24 : serviceData.categoryId === 'household' ? 72 : 48);
            const validatedAddons = [];
            if (item.addons && Array.isArray(item.addons)) {
                for (const addon of item.addons) {
                    const serverAddon = (serviceData.addons || []).find((a) => a.id === addon.id);
                    if (serverAddon) {
                        validatedAddons.push({
                            id: serverAddon.id,
                            name: serverAddon.name,
                            priceMinor: serverAddon.priceMinor
                        });
                    }
                }
            }
            pricingItems.push({
                serviceId: serviceDoc.id,
                nameSnapshot: serviceData.name,
                quantity: item.quantity,
                unit: serviceData.unit || 'piece',
                unitPriceMinor: serviceData.priceMinor || 0,
                addons: validatedAddons,
                priceType: serviceData.priceType || 'fixed',
                estimatedDurationHours: duration
            });
        }
        if (pricingItems.length === 0) {
            throw new https_1.HttpsError('failed-precondition', 'Order must have at least one valid item.');
        }
        // Recalculate discount if coupon exists
        let couponInfo = null;
        if (orderData.couponCode) {
            const couponDoc = await transaction.get(db.collection('coupons').doc(orderData.couponCode));
            if (couponDoc.exists) {
                const coupon = couponDoc.data();
                if (coupon.isActive) {
                    couponInfo = {
                        type: coupon.type,
                        discountValue: coupon.discountValue,
                        minimumOrderAmount: coupon.minimumOrderAmount
                    };
                }
            }
        }
        const { processedItems, subtotalMinor: newSubtotalMinor, discountMinor: newDiscountMinor, finalAmountMinor: calculatedFinal, priceConfirmed, maxDurationHours } = (0, pricing_logic_1.calculateOrderTotals)(pricingItems, couponInfo, orderData.deliveryFeeMinor);
        newFinalAmountMinor = calculatedFinal;
        // Partial Refund or Additional Payment Logic
        const { amountDiff, refundAmountMinor: calcRefund, additionalPaymentRequired } = (0, editOrder_logic_1.calculateOrderDiff)(orderData.finalAmountMinor, newFinalAmountMinor, orderData.status);
        refundAmountMinor = calcRefund;
        if (additionalPaymentRequired || calcRefund > 0) {
            if (calcRefund > 0) {
                // We owe the customer a refund
                const paymentsSnapshot = await transaction.get(db.collection('payments')
                    .where('orderId', '==', orderId)
                    .where('status', '==', 'VERIFIED'));
                if (!paymentsSnapshot.empty) {
                    const payment = paymentsSnapshot.docs[0].data();
                    razorpayPaymentId = payment.razorpayPaymentId;
                }
            }
            else if (additionalPaymentRequired) {
                // Customer owes us more. Create a pending payment doc.
                const newPaymentRef = db.collection('payments').doc();
                transaction.set(newPaymentRef, {
                    orderId: orderId,
                    userId: uid,
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
        // Recalculate Estimated Delivery Date if items changed
        let estimatedDeliveryDateStr = orderData.estimatedDeliveryDate;
        if (orderData.pickupSlotSnapshot) {
            try {
                const [hours, minutes] = (orderData.pickupSlotSnapshot.startTime || '10:00').split(':').map(Number);
                const pickupDate = new Date(`${orderData.pickupSlotSnapshot.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
                pickupDate.setHours(pickupDate.getHours() + maxDurationHours + 4);
                estimatedDeliveryDateStr = pickupDate.toISOString();
            }
            catch (e) {
                console.error('Error parsing date for editOrderItems', e);
            }
        }
        transaction.update(orderRef, {
            items: processedItems,
            subtotalMinor: newSubtotalMinor,
            discountMinor: newDiscountMinor,
            finalAmountMinor: newFinalAmountMinor,
            priceConfirmed,
            estimatedDeliveryDate: estimatedDeliveryDateStr,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    if (refundAmountMinor > 0 && razorpayPaymentId) {
        const keySecret = razorpayKeySecret.value();
        const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${keySecret}`).toString('base64');
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
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        else {
            console.error('Refund failed:', await response.text());
        }
    }
    return { success: true };
});
//# sourceMappingURL=editOrderItems.js.map