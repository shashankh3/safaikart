"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editOrderItems = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.editOrderItems = (0, https_1.onCall)(async (request) => {
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
        let newSubtotalMinor = 0;
        let priceConfirmed = true;
        let maxDurationHours = 0;
        const processedItems = [];
        for (const item of items) {
            const serviceDoc = await transaction.get(db.collection('services').doc(item.serviceId));
            if (!serviceDoc.exists)
                continue;
            const serviceData = serviceDoc.data();
            if (!serviceData.isActive)
                continue;
            const duration = serviceData.estimatedDurationHours || (serviceData.categoryId === 'steam_press' ? 24 : serviceData.categoryId === 'household' ? 72 : 48);
            if (duration > maxDurationHours)
                maxDurationHours = duration;
            const isVariable = serviceData.priceType === 'variable';
            if (isVariable)
                priceConfirmed = false;
            let addonsTotalMinor = 0;
            const validatedAddons = [];
            if (item.addons && Array.isArray(item.addons)) {
                for (const addon of item.addons) {
                    const serverAddon = (serviceData.addons || []).find((a) => a.id === addon.id);
                    if (serverAddon) {
                        addonsTotalMinor += serverAddon.priceMinor;
                        validatedAddons.push({
                            id: serverAddon.id,
                            name: serverAddon.name,
                            priceMinor: serverAddon.priceMinor
                        });
                    }
                }
            }
            const itemUnitTotalMinor = (serviceData.priceMinor || 0) + addonsTotalMinor;
            const lineTotalMinor = isVariable ? 0 : (itemUnitTotalMinor * item.quantity);
            if (!isVariable) {
                newSubtotalMinor += lineTotalMinor;
            }
            processedItems.push({
                serviceId: serviceDoc.id,
                nameSnapshot: serviceData.name,
                quantity: item.quantity,
                unit: serviceData.unit || 'piece',
                unitPriceMinor: serviceData.priceMinor,
                addons: validatedAddons,
                lineTotalMinor,
                priceType: serviceData.priceType || 'fixed'
            });
        }
        if (processedItems.length === 0) {
            throw new https_1.HttpsError('failed-precondition', 'Order must have at least one valid item.');
        }
        // Recalculate discount if coupon exists
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
        const newFinalAmountMinor = newSubtotalMinor + orderData.deliveryFeeMinor - newDiscountMinor;
        // Partial Refund or Additional Payment Logic
        const amountDiff = newFinalAmountMinor - orderData.finalAmountMinor;
        if (orderData.status === 'CONFIRMED' && amountDiff !== 0) {
            if (amountDiff < 0) {
                // We owe the customer a refund
                console.log(`[Razorpay] Mocking partial refund of Rs ${Math.abs(amountDiff) / 100} for order ${orderId}`);
                // In a real scenario, call Razorpay refund API here.
            }
            else {
                // Customer owes us more. 
                // In a complex flow, this would revert status to PAYMENT_PENDING for the difference.
                // For simplicity, we just log it and update the order amount.
                console.log(`[Razorpay] Customer owes Rs ${amountDiff / 100} more for order ${orderId}`);
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
    return { success: true };
});
//# sourceMappingURL=editOrderItems.js.map