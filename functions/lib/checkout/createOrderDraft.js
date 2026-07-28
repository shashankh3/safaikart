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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const pricing_logic_1 = require("../orders/pricing.logic");
const contracts_1 = require("../contracts");
const serviceability_logic_1 = require("../utils/serviceability.logic");
const deliveryLogic_1 = require("../utils/deliveryLogic");
const coupon_logic_1 = require("./coupon.logic");
const rateLimiter_1 = require("../utils/rateLimiter");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
// Initialize admin app if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.createOrderDraft = (0, https_1.onCall)({ region: 'asia-south1', enforceAppCheck: config_1.shouldEnforceAppCheck }, async (request) => {
    var _a, _b, _c;
    try {
        const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
        if (!uid) {
            throw new https_1.HttpsError('unauthenticated', 'User must be logged in to create an order.');
        }
        await (0, rateLimiter_1.rateLimiter)(uid, 'createOrderDraft', 5, 3600);
        const profileDoc = await db.collection('profiles').doc(uid).get();
        if (profileDoc.exists && ((_b = profileDoc.data()) === null || _b === void 0 ? void 0 : _b.isBlocked) === true) {
            throw new https_1.HttpsError('permission-denied', 'Your account has been blocked. Please contact support.');
        }
        let addressId, pickupSlotId, couponCode = null, directItems, idempotencyKey, notes = null;
        try {
            const parsed = contracts_1.createOrderDraftRequest.parse(request.data);
            addressId = parsed.addressId;
            pickupSlotId = parsed.pickupSlotId;
            directItems = parsed.directItems;
            couponCode = parsed.couponCode ? parsed.couponCode.toUpperCase() : null;
            idempotencyKey = parsed.idempotencyKey;
            notes = parsed.notes ? parsed.notes.slice(0, 500) : null;
        }
        catch (e) {
            throw new https_1.HttpsError('invalid-argument', `Validation error: ${e.message}`);
        }
        // Idempotency Check
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
                throw new https_1.HttpsError('failed-precondition', 'Cart is empty or not found on server.');
            }
            itemsToProcess = cartItemsQuery.docs.map(doc => doc.data());
            if (itemsToProcess.length === 0) {
                throw new https_1.HttpsError('failed-precondition', 'Cart is empty.');
            }
        }
        if (itemsToProcess.length > 50) {
            throw new https_1.HttpsError('invalid-argument', 'Too many items in cart. Maximum allowed is 50.');
        }
        // 2. Fetch Address & Validate Serviceability
        const addressDoc = await db.collection('addresses').doc(addressId).get();
        if (!addressDoc.exists || ((_c = addressDoc.data()) === null || _c === void 0 ? void 0 : _c.userId) !== uid) {
            throw new https_1.HttpsError('permission-denied', 'Invalid address or unauthorized access.');
        }
        const addressData = addressDoc.data();
        const { isServiceable } = await (0, serviceability_logic_1.isPincodeServiceable)(db, addressData.pincode);
        if (!isServiceable) {
            throw new https_1.HttpsError('failed-precondition', `We don't service pincode ${addressData.pincode} yet.`);
        }
        // 3. Process Items & Calculate Price
        const pricingItems = [];
        for (const item of itemsToProcess) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100) {
                throw new https_1.HttpsError('invalid-argument', `Invalid quantity for item ${item.name || item.serviceId}. Quantity must be between 1 and 100.`);
            }
            const serviceId = String(item.id || item.serviceId || '').trim();
            if (!serviceId) {
                throw new https_1.HttpsError('invalid-argument', `Invalid service for item ${item.name || ''}`);
            }
            const serviceDoc = await db.collection('services').doc(serviceId).get();
            if (!serviceDoc.exists) {
                throw new https_1.HttpsError('not-found', `Service not found for item ${item.name}`);
            }
            const serviceData = serviceDoc.data();
            if (serviceData.isActive === false) {
                throw new https_1.HttpsError('failed-precondition', `Service ${serviceData.name} is no longer active.`);
            }
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
        // 4. Validate Coupon
        let couponInfo = null;
        if (couponCode) {
            const couponDoc = await db.collection('coupons').doc(couponCode).get();
            if (couponDoc.exists) {
                const coupon = couponDoc.data();
                const couponSubtotalMinor = pricingItems.reduce((total, item) => {
                    if (item.priceType === 'variable')
                        return total;
                    const addonsTotalMinor = item.addons.reduce((sum, addon) => sum + addon.priceMinor, 0);
                    return total + (item.unitPriceMinor + addonsTotalMinor) * item.quantity;
                }, 0);
                const couponResult = (0, coupon_logic_1.validateCouponApplicability)(coupon, uid, couponSubtotalMinor);
                if (!couponResult.valid) {
                    throw new https_1.HttpsError('failed-precondition', couponResult.message);
                }
                couponInfo = {
                    type: coupon.type,
                    discountValue: coupon.discountValue,
                    minimumOrderAmount: coupon.minimumOrderAmount
                };
            }
            else {
                throw new https_1.HttpsError('not-found', 'Invalid coupon code');
            }
        }
        const { processedItems, subtotalMinor, discountMinor, deliveryFeeMinor, finalAmountMinor, priceConfirmed, maxDurationHours } = (0, pricing_logic_1.calculateOrderTotals)(pricingItems, couponInfo, 4000);
        // 5. Transaction for Pickup Slot & Order Creation
        const newOrderRef = db.collection('orders').doc();
        let finalOrderId = '';
        await db.runTransaction(async (transaction) => {
            var _a;
            const slotRef = db.collection('pickupSlots').doc(pickupSlotId);
            const slotDoc = await transaction.get(slotRef);
            if (!slotDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Pickup slot not found.');
            }
            const slotData = slotDoc.data();
            if (!slotData.isActive || (slotData.bookedCount >= slotData.capacity)) {
                throw new https_1.HttpsError('failed-precondition', 'Pickup slot is fully booked or inactive.');
            }
            if (!(0, deliveryLogic_1.isSlotValid)(slotData.date, slotData.startTime, 2)) {
                throw new https_1.HttpsError('failed-precondition', 'Pickup slot is in the past or too soon to book.');
            }
            // Check coupon usage inside transaction to prevent race conditions
            if (couponCode) {
                const couponRef = db.collection('coupons').doc(couponCode);
                const latestCouponDoc = await transaction.get(couponRef);
                if (latestCouponDoc.exists) {
                    const usedBy = ((_a = latestCouponDoc.data()) === null || _a === void 0 ? void 0 : _a.usedBy) || [];
                    if (usedBy.includes(uid)) {
                        throw new https_1.HttpsError('failed-precondition', 'You have already used this coupon code.');
                    }
                }
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
        if (err instanceof https_1.HttpsError) {
            throw err;
        }
        (0, logger_1.logError)('createOrderDraft failed:', err);
        throw new https_1.HttpsError('internal', 'Failed to create order. Please try again.');
    }
});
//# sourceMappingURL=createOrderDraft.js.map