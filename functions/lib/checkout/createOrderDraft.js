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
const pricing_logic_1 = require("../orders/pricing.logic");
const contracts_1 = require("../contracts");
const serviceability_logic_1 = require("../utils/serviceability.logic");
const deliveryLogic_1 = require("../utils/deliveryLogic");
// Initialize admin app if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.createOrderDraft = functions.region('asia-south1').https.onCall(async (data, context) => {
    var _a, _b;
    try {
        const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (!uid) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to create an order.');
        }
        // Rate limiting bypassed temporarily for debugging
        // await rateLimiter(uid, 'createOrderDraft', 5, 3600);
        let addressId, pickupSlotId, couponCode = null, directItems, idempotencyKey, notes = null;
        try {
            const parsed = contracts_1.createOrderDraftRequest.parse(data);
            addressId = parsed.addressId;
            pickupSlotId = parsed.pickupSlotId;
            directItems = parsed.directItems;
            couponCode = parsed.couponCode || null;
            idempotencyKey = parsed.idempotencyKey;
            notes = parsed.notes || null;
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
        if (itemsToProcess.length > 50) {
            throw new functions.https.HttpsError('invalid-argument', 'Too many items in cart. Maximum allowed is 50.');
        }
        // 2. Fetch Address & Validate Serviceability
        const addressDoc = await db.collection('addresses').doc(addressId).get();
        if (!addressDoc.exists || ((_b = addressDoc.data()) === null || _b === void 0 ? void 0 : _b.userId) !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Invalid address or unauthorized access.');
        }
        const addressData = addressDoc.data();
        const { isServiceable } = await (0, serviceability_logic_1.isPincodeServiceable)(db, addressData.pincode);
        if (!isServiceable) {
            throw new functions.https.HttpsError('failed-precondition', `We don't service pincode ${addressData.pincode} yet.`);
        }
        // 3. Process Items & Calculate Price
        const pricingItems = [];
        for (const item of itemsToProcess) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100) {
                throw new functions.https.HttpsError('invalid-argument', `Invalid quantity for item ${item.name || item.serviceId}. Quantity must be between 1 and 100.`);
            }
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
            if (!(0, deliveryLogic_1.isSlotValid)(slotData.date, slotData.startTime, 2)) {
                throw new functions.https.HttpsError('failed-precondition', 'Pickup slot is in the past or too soon to book.');
            }
            // Increment booked count
            transaction.update(slotRef, { bookedCount: admin.firestore.FieldValue.increment(1) });
            // Calculate Estimated Delivery Date
            const estimatedDeliveryDateStr = (0, deliveryLogic_1.computeEstimatedDelivery)(slotData.date, slotData.startTime, maxDurationHours);
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
                notes: notes || null,
                addressId,
                addressSnapshot: {
                    line1: addressData.line1 || '',
                    line2: addressData.line2 || '',
                    city: addressData.city || '',
                    state: addressData.state || '',
                    pincode: addressData.pincode || ''
                },
                pickupSlotId,
                pickupSlotSnapshot: {
                    date: slotData.date || '',
                    startTime: slotData.startTime || '',
                    endTime: slotData.endTime || ''
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
    }
    catch (err) {
        if (err instanceof functions.https.HttpsError) {
            throw err;
        }
        throw new functions.https.HttpsError('internal', `DEBUG: ${err.message} | ${err.stack}`);
    }
});
//# sourceMappingURL=createOrderDraft.js.map