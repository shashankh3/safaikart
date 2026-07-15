export interface OrderDiffResult {
  amountDiff: number;
  refundAmountMinor: number;
  additionalPaymentRequired: boolean;
}

export function calculateOrderDiff(oldFinalAmountMinor: number, newFinalAmountMinor: number, orderStatus: string): OrderDiffResult {
  const amountDiff = newFinalAmountMinor - oldFinalAmountMinor;
  
  let refundAmountMinor = 0;
  let additionalPaymentRequired = false;

  if (orderStatus === 'CONFIRMED' && amountDiff !== 0) {
    if (amountDiff < 0) {
      refundAmountMinor = Math.abs(amountDiff);
    } else {
      additionalPaymentRequired = true;
    }
  }

  return {
    amountDiff,
    refundAmountMinor,
    additionalPaymentRequired
  };
}
