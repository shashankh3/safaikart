"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderDraft = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
// Initialize admin app if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.createOrderDraft = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in to create an order.');
    }
    const { addressId, pickupSlotId, couponCode, directItems } = request.data;
    if (!addressId || !pickupSlotId) {
        throw new https_1.HttpsError('invalid-argument', 'Address ID and Pickup Slot ID are required.');
    }
    // 1. Fetch Items
    let itemsToProcess = [];
    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
        itemsToProcess = directItems;
    }
    else {
        const cartDoc = await db.collection('carts').doc(uid).get();
        if (!cartDoc.exists) {
            throw new https_1.HttpsError('failed-precondition', 'Cart is empty or not found on server.');
        }
        const cartData = cartDoc.data();
        itemsToProcess = (cartData === null || cartData === void 0 ? void 0 : cartData.items) || [];
        if (itemsToProcess.length === 0) {
            throw new https_1.HttpsError('failed-precondition', 'Cart is empty.');
        }
    }
    // 2. Fetch Address
    const addressDoc = await db.collection('addresses').doc(addressId).get();
    if (!addressDoc.exists || ((_b = addressDoc.data()) === null || _b === void 0 ? void 0 : _b.userId) !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Invalid address or unauthorized access.');
    }
    const addressData = addressDoc.data();
    // 3. Process Items & Calculate Price
    let subtotalMinor = 0;
    let priceConfirmed = true;
    let maxDurationHours = 0;
    const processedItems = [];
    for (const item of itemsToProcess) {
        // Fetch actual service from DB to prevent tampering
        const serviceDoc = await db.collection('services').doc(item.id || item.serviceId).get();
        if (!serviceDoc.exists) {
            throw new https_1.HttpsError('not-found', `Service not found for item ${item.name}`);
        }
        const serviceData = serviceDoc.data();
        if (!serviceData.isActive) {
            throw new https_1.HttpsError('failed-precondition', `Service ${serviceData.name} is no longer active.`);
        }
        const duration = serviceData.estimatedDurationHours || (serviceData.categoryId === 'steam_press' ? 24 : serviceData.categoryId === 'household' ? 72 : 48);
        if (duration > maxDurationHours)
            maxDurationHours = duration;
        const isVariable = serviceData.priceType === 'variable';
        if (isVariable)
            priceConfirmed = false;
        // Process addons
        let addonsTotalMinor = 0;
        const validatedAddons = [];
        if (item.addons && Array.isArray(item.addons)) {
            for (const addon of item.addons) {
                // Find if this service supports this addon
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
            subtotalMinor += lineTotalMinor;
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
    // 4. Validate Coupon
    let discountMinor = 0;
    if (couponCode) {
        const couponDoc = await db.collection('coupons').doc(couponCode.toUpperCase()).get();
        if (couponDoc.exists) {
            const coupon = couponDoc.data();
            if (coupon.isActive && subtotalMinor >= (coupon.minimumOrderAmount || 0)) {
                if (coupon.type === 'flat') {
                    discountMinor = coupon.discountValue;
                }
                else if (coupon.type === 'percent') {
                    discountMinor = Math.floor((subtotalMinor * coupon.discountValue) / 100);
                }
                // Cap discount to subtotal
                if (discountMinor > subtotalMinor)
                    discountMinor = subtotalMinor;
            }
        }
    }
    const deliveryFeeMinor = 4000; // Flat 40 Rs
    const finalAmountMinor = subtotalMinor + deliveryFeeMinor - discountMinor;
    // 5. Transaction for Pickup Slot & Order Creation
    const newOrderRef = db.collection('orders').doc();
    let finalOrderId = '';
    await db.runTransaction(async (transaction) => {
        const slotRef = db.collection('pickupSlots').doc(pickupSlotId);
        const slotDoc = await transaction.get(slotRef);
        if (!slotDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Pickup slot not found.');
        }
        const slotData = slotDoc.data();
        if (!slotData.isActive || (slotData.bookedCount >= slotData.capacity)) {
            throw new https_1.HttpsError('failed-precondition', 'Pickup slot is fully booked or inactive.');
        }
        // Increment booked count
        transaction.update(slotRef, { bookedCount: admin.firestore.FieldValue.increment(1) });
        // Calculate Estimated Delivery Date
        let estimatedDeliveryDateStr = '';
        try {
            const [hours, minutes] = (slotData.startTime || '10:00').split(':').map(Number);
            const pickupDate = new Date(`${slotData.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
            pickupDate.setHours(pickupDate.getHours() + maxDurationHours + 4);
            estimatedDeliveryDateStr = pickupDate.toISOString();
        }
        catch (e) {
            estimatedDeliveryDateStr = new Date(Date.now() + 48 * 3600000).toISOString(); // fallback 48h
        }
        // 3 minute edit window
        const editableUntil = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 60000));
        // Create Order
        const orderData = {
            userId: uid,
            status: 'PAYMENT_PENDING',
            paymentStatus: 'NOT_STARTED',
            priceConfirmed,
            editableUntil,
            estimatedDeliveryDate: estimatedDeliveryDateStr,
            items: processedItems,
            subtotalMinor,
            deliveryFeeMinor,
            discountMinor,
            taxMinor: 0,
            finalAmountMinor,
            currency: 'INR',
            couponCode: couponCode || null,
            addressId,
            addressSnapshot: {
                line1: addressData.line1,
                line2: addressData.line2,
                city: addressData.city,
                state: addressData.state,
                pincode: addressData.pincode
            },
            pickupSlotId,
            pickupSlotSnapshot: {
                date: slotData.date,
                startTime: slotData.startTime,
                endTime: slotData.endTime
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        transaction.set(newOrderRef, orderData);
        finalOrderId = newOrderRef.id;
        // Clear user cart if not a direct buy
        if (!directItems) {
            const cartRef = db.collection('carts').doc(uid);
            transaction.update(cartRef, { items: [] });
        }
    });
    return {
        orderId: finalOrderId,
        finalAmountMinor,
        priceConfirmed
    };
});
//# sourceMappingURL=createOrderDraft.js.map