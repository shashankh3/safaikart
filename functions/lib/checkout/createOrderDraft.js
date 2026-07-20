"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderDraft = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const rateLimiter_1 = require("../utils/rateLimiter");
const pricing_logic_1 = require("../orders/pricing.logic");
const contracts_1 = require("../contracts");
// Initialize admin app if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.createOrderDraft = functions.region('asia-south1').https.onCall(async (data, context) => {
    var _a, _b;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to create an order.');
    }
    // Rate limiting: max 5 orders per hour (3600 seconds)
    await (0, rateLimiter_1.rateLimiter)(uid, 'createOrderDraft', 5, 3600);
    let addressId, pickupSlotId, couponCode = null, directItems, idempotencyKey;
    try {
        const parsed = contracts_1.createOrderDraftRequest.parse(data);
        addressId = parsed.addressId;
        pickupSlotId = parsed.pickupSlotId;
        directItems = parsed.directItems;
        couponCode = parsed.couponCode || null;
        idempotencyKey = parsed.idempotencyKey;
    }
    catch (e) {
        throw new functions.https.HttpsError('invalid-argument', `Validation error: ${e.message}`);
    }
    // A4: Idempotency Check
    if (idempotencyKey) {
        const existing = await db.collection('orders')
            .where('userId', '==', uid)
            .where('idempotencyKey', '==', idempotencyKey)
            .limit(1)
            .get();
        if (!existing.empty) {
            const existingOrder = existing.docs[0];
            return {
                orderId: existingOrder.id,
                finalAmountMinor: existingOrder.data().finalAmountMinor,
                priceConfirmed: existingOrder.data().priceConfirmed
            };
        }
    }
    // 1. Fetch Items
    let itemsToProcess = [];
    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
        itemsToProcess = directItems;
    }
    else {
        const cartItemsQuery = await db.collection(`users/${uid}/cartItems`).get();
        if (cartItemsQuery.empty) {
            throw new functions.https.HttpsError('failed-precondition', 'Cart is empty or not found on server.');
        }
        itemsToProcess = cartItemsQuery.docs.map(doc => doc.data());
        if (itemsToProcess.length === 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Cart is empty.');
        }
    }
    // 2. Fetch Address
    const addressDoc = await db.collection('addresses').doc(addressId).get();
    if (!addressDoc.exists || ((_b = addressDoc.data()) === null || _b === void 0 ? void 0 : _b.userId) !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid address or unauthorized access.');
    }
    const addressData = addressDoc.data();
    // 3. Process Items & Calculate Price
    const pricingItems = [];
    for (const item of itemsToProcess) {
        // Fetch actual service from DB to prevent tampering
        const serviceDoc = await db.collection('services').doc(item.id || item.serviceId).get();
        if (!serviceDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Service not found for item ${item.name}`);
        }
        const serviceData = serviceDoc.data();
        if (!serviceData.isActive) {
            throw new functions.https.HttpsError('failed-precondition', `Service ${serviceData.name} is no longer active.`);
        }
        const duration = serviceData.estimatedDurationHours || (serviceData.categoryId === 'steam_press' ? 24 : serviceData.categoryId === 'household' ? 72 : 48);
        // Process addons
        const validatedAddons = [];
        if (item.addons && Array.isArray(item.addons)) {
            for (const addon of item.addons) {
                // Find if this service supports this addon
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
    // 4. Validate Coupon
    let couponInfo = null;
    if (couponCode) {
        const couponDoc = await db.collection('coupons').doc(couponCode.toUpperCase()).get();
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
    const { processedItems, subtotalMinor, discountMinor, deliveryFeeMinor, finalAmountMinor, priceConfirmed, maxDurationHours } = (0, pricing_logic_1.calculateOrderTotals)(pricingItems, couponInfo, 4000);
    // 5. Transaction for Pickup Slot & Order Creation
    const newOrderRef = db.collection('orders').doc();
    let finalOrderId = '';
    await db.runTransaction(async (transaction) => {
        const slotRef = db.collection('pickupSlots').doc(pickupSlotId);
        const slotDoc = await transaction.get(slotRef);
        if (!slotDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Pickup slot not found.');
        }
        const slotData = slotDoc.data();
        if (!slotData.isActive || (slotData.bookedCount >= slotData.capacity)) {
            throw new functions.https.HttpsError('failed-precondition', 'Pickup slot is fully booked or inactive.');
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
            idempotencyKey: idempotencyKey || null,
        };
        transaction.set(newOrderRef, orderData);
        finalOrderId = newOrderRef.id;
        // Clear user cart if not a direct buy
        if (!directItems) {
            const cartItemsSnapshot = await db.collection(`users/${uid}/cartItems`).get();
            for (const doc of cartItemsSnapshot.docs) {
                transaction.delete(doc.ref);
            }
        }
    });
    return {
        orderId: finalOrderId,
        finalAmountMinor,
        priceConfirmed
    };
});
//# sourceMappingURL=createOrderDraft.js.map