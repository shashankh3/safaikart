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
exports.editOrderItems = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const pricing_logic_1 = require("./pricing.logic");
const editOrder_logic_1 = require("./editOrder.logic");
const coupon_logic_1 = require("../checkout/coupon.logic");
const deliveryLogic_1 = require("../utils/deliveryLogic");
const contracts_1 = require("../contracts");
const razorpayClient_1 = require("../payments/razorpayClient");
const config_1 = require("../utils/config");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.editOrderItems = (0, https_1.onCall)({ secrets: [razorpayClient_1.razorpayKeySecret], region: 'asia-south1', enforceAppCheck: config_1.shouldEnforceAppCheck }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in to edit an order.');
    }
    const { rateLimiter } = await Promise.resolve().then(() => __importStar(require('../utils/rateLimiter')));
    await rateLimiter(uid, 'editOrderItems', 10, 3600);
    let orderId, items;
    try {
        const parsed = contracts_1.editOrderItemsRequest.parse(request.data);
        orderId = parsed.orderId;
        items = parsed.items;
    }
    catch (e) {
        throw new https_1.HttpsError('invalid-argument', `Validation error: ${e.message}`);
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
        let subtotalForCouponMinor = pricingItems.reduce((sum, item) => sum + (item.unitPriceMinor * item.quantity), 0);
        if (orderData.couponCode) {
            const couponDoc = await transaction.get(db.collection('coupons').doc(orderData.couponCode));
            if (couponDoc.exists) {
                const coupon = couponDoc.data();
                const couponResult = (0, coupon_logic_1.validateCouponApplicability)(coupon, uid, subtotalForCouponMinor);
                if (couponResult.valid) {
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
            estimatedDeliveryDateStr = (0, deliveryLogic_1.computeEstimatedDelivery)(orderData.pickupSlotSnapshot.date, orderData.pickupSlotSnapshot.startTime, maxDurationHours);
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
                refundStatus: 'INITIATED',
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