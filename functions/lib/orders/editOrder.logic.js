"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOrderDiff = calculateOrderDiff;
function calculateOrderDiff(oldFinalAmountMinor, newFinalAmountMinor, orderStatus) {
    const amountDiff = newFinalAmountMinor - oldFinalAmountMinor;
    let refundAmountMinor = 0;
    let additionalPaymentRequired = false;
    if (orderStatus === 'CONFIRMED' && amountDiff !== 0) {
        if (amountDiff < 0) {
            refundAmountMinor = Math.abs(amountDiff);
        }
        else {
            additionalPaymentRequired = true;
        }
    }
    return {
        amountDiff,
        refundAmountMinor,
        additionalPaymentRequired
    };
}
//# sourceMappingURL=editOrder.logic.js.map