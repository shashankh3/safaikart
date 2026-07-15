"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOrderTotals = void 0;
function calculateOrderTotals(items, coupon, deliveryFeeMinor) {
    let subtotalMinor = 0;
    let priceConfirmed = true;
    let maxDurationHours = 0;
    const processedItems = [];
    for (const item of items) {
        if (item.estimatedDurationHours > maxDurationHours) {
            maxDurationHours = item.estimatedDurationHours;
        }
        const isVariable = item.priceType === 'variable';
        if (isVariable)
            priceConfirmed = false;
        let addonsTotalMinor = 0;
        for (const addon of item.addons) {
            addonsTotalMinor += addon.priceMinor;
        }
        const itemUnitTotalMinor = item.unitPriceMinor + addonsTotalMinor;
        const lineTotalMinor = isVariable ? 0 : (itemUnitTotalMinor * item.quantity);
        if (!isVariable) {
            subtotalMinor += lineTotalMinor;
        }
        processedItems.push({
            serviceId: item.serviceId,
            nameSnapshot: item.nameSnapshot,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceMinor: item.unitPriceMinor,
            addons: item.addons,
            lineTotalMinor,
            priceType: item.priceType
        });
    }
    let discountMinor = 0;
    if (coupon) {
        if (subtotalMinor >= (coupon.minimumOrderAmount || 0)) {
            if (coupon.type === 'flat') {
                discountMinor = coupon.discountValue;
            }
            else if (coupon.type === 'percent') {
                discountMinor = Math.floor((subtotalMinor * coupon.discountValue) / 100);
            }
            if (discountMinor > subtotalMinor)
                discountMinor = subtotalMinor;
        }
    }
    const finalAmountMinor = subtotalMinor + deliveryFeeMinor - discountMinor;
    return {
        processedItems,
        subtotalMinor,
        discountMinor,
        deliveryFeeMinor,
        finalAmountMinor,
        priceConfirmed,
        maxDurationHours
    };
}
exports.calculateOrderTotals = calculateOrderTotals;
//# sourceMappingURL=pricing.logic.js.map