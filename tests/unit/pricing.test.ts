import { calculateOrderTotals, PricingItem, CouponInfo } from '../../functions/src/orders/pricing.logic';

describe('calculateOrderTotals', () => {
  it('should calculate correct totals for normal orders without addons or coupons', () => {
    const items: PricingItem[] = [
      {
        serviceId: 's1', nameSnapshot: 'Shirt', quantity: 2, unit: 'piece', unitPriceMinor: 1000,
        addons: [], priceType: 'fixed', estimatedDurationHours: 48
      }
    ];
    const result = calculateOrderTotals(items, null, 4000);
    expect(result.subtotalMinor).toBe(2000);
    expect(result.discountMinor).toBe(0);
    expect(result.deliveryFeeMinor).toBe(4000);
    expect(result.finalAmountMinor).toBe(6000); // 2000 + 4000
    expect(result.priceConfirmed).toBe(true);
    expect(result.maxDurationHours).toBe(48);
  });

  it('should calculate correct totals with addons', () => {
    const items: PricingItem[] = [
      {
        serviceId: 's1', nameSnapshot: 'Shirt', quantity: 1, unit: 'piece', unitPriceMinor: 1000,
        addons: [{ id: 'a1', name: 'Starch', priceMinor: 500 }], priceType: 'fixed', estimatedDurationHours: 24
      }
    ];
    const result = calculateOrderTotals(items, null, 4000);
    expect(result.subtotalMinor).toBe(1500); // 1000 + 500
    expect(result.finalAmountMinor).toBe(5500);
    expect(result.priceConfirmed).toBe(true);
  });

  it('should correctly handle variable-price items', () => {
    const items: PricingItem[] = [
      {
        serviceId: 's1', nameSnapshot: 'Carpet', quantity: 1, unit: 'sqft', unitPriceMinor: 0,
        addons: [], priceType: 'variable', estimatedDurationHours: 72
      }
    ];
    const result = calculateOrderTotals(items, null, 4000);
    expect(result.subtotalMinor).toBe(0); // Variable is 0
    expect(result.priceConfirmed).toBe(false); // priceConfirmed flag should be false
    expect(result.finalAmountMinor).toBe(4000);
    expect(result.maxDurationHours).toBe(72);
  });

  it('should apply flat coupon correctly when threshold is met', () => {
    const items: PricingItem[] = [
      {
        serviceId: 's1', nameSnapshot: 'Shirt', quantity: 2, unit: 'piece', unitPriceMinor: 2000,
        addons: [], priceType: 'fixed', estimatedDurationHours: 24
      }
    ];
    const coupon: CouponInfo = { type: 'flat', discountValue: 1000, minimumOrderAmount: 3000 };
    const result = calculateOrderTotals(items, coupon, 4000);
    expect(result.subtotalMinor).toBe(4000);
    expect(result.discountMinor).toBe(1000);
    expect(result.finalAmountMinor).toBe(7000); // 4000 + 4000 - 1000
  });

  it('should apply percent coupon correctly and cap it to subtotal', () => {
    const items: PricingItem[] = [
      {
        serviceId: 's1', nameSnapshot: 'Shirt', quantity: 1, unit: 'piece', unitPriceMinor: 1000,
        addons: [], priceType: 'fixed', estimatedDurationHours: 24
      }
    ];
    // 200% discount, cap at subtotal
    const coupon: CouponInfo = { type: 'percent', discountValue: 200, minimumOrderAmount: 500 };
    const result = calculateOrderTotals(items, coupon, 4000);
    expect(result.subtotalMinor).toBe(1000);
    expect(result.discountMinor).toBe(1000); // capped at subtotal
    expect(result.finalAmountMinor).toBe(4000); // 1000 + 4000 - 1000
  });

  it('should not apply coupon if minimum order amount is not met', () => {
    const items: PricingItem[] = [
      {
        serviceId: 's1', nameSnapshot: 'Shirt', quantity: 1, unit: 'piece', unitPriceMinor: 1000,
        addons: [], priceType: 'fixed', estimatedDurationHours: 24
      }
    ];
    const coupon: CouponInfo = { type: 'flat', discountValue: 500, minimumOrderAmount: 2000 };
    const result = calculateOrderTotals(items, coupon, 4000);
    expect(result.subtotalMinor).toBe(1000);
    expect(result.discountMinor).toBe(0); // Min amount not met
  });
});
