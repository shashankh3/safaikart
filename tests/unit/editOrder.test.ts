import { calculateOrderDiff } from '../../functions/src/orders/editOrder.logic';

describe('calculateOrderDiff', () => {
  it('should calculate refund when new total is lower (CONFIRMED)', () => {
    const result = calculateOrderDiff(5000, 4000, 'CONFIRMED');
    expect(result.amountDiff).toBe(-1000);
    expect(result.refundAmountMinor).toBe(1000);
    expect(result.additionalPaymentRequired).toBe(false);
  });

  it('should require additional payment when new total is higher (CONFIRMED)', () => {
    const result = calculateOrderDiff(5000, 6000, 'CONFIRMED');
    expect(result.amountDiff).toBe(1000);
    expect(result.refundAmountMinor).toBe(0);
    expect(result.additionalPaymentRequired).toBe(true);
  });

  it('should be a no-op if totals are identical (CONFIRMED)', () => {
    const result = calculateOrderDiff(5000, 5000, 'CONFIRMED');
    expect(result.amountDiff).toBe(0);
    expect(result.refundAmountMinor).toBe(0);
    expect(result.additionalPaymentRequired).toBe(false);
  });

  it('should NOT require refund or payment if status is PAYMENT_PENDING', () => {
    const result = calculateOrderDiff(5000, 4000, 'PAYMENT_PENDING');
    expect(result.amountDiff).toBe(-1000);
    expect(result.refundAmountMinor).toBe(0);
    expect(result.additionalPaymentRequired).toBe(false);
  });
});
