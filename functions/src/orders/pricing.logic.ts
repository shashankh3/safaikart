export interface PricingItem {
  serviceId: string;
  nameSnapshot: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  addons: { id: string; name: string; priceMinor: number }[];
  priceType: 'fixed' | 'variable';
  estimatedDurationHours: number;
}

export interface CouponInfo {
  type: 'flat' | 'percent';
  discountValue: number;
  minimumOrderAmount?: number;
}

export interface PricingResult {
  processedItems: any[];
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  finalAmountMinor: number;
  priceConfirmed: boolean;
  maxDurationHours: number;
}

export function calculateOrderTotals(
  items: PricingItem[],
  coupon: CouponInfo | null,
  deliveryFeeMinor: number
): PricingResult {
  let subtotalMinor = 0;
  let priceConfirmed = true;
  let maxDurationHours = 0;
  const processedItems: any[] = [];

  for (const item of items) {
    if (item.estimatedDurationHours > maxDurationHours) {
      maxDurationHours = item.estimatedDurationHours;
    }

    const isVariable = item.priceType === 'variable';
    if (isVariable) priceConfirmed = false;

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
      } else if (coupon.type === 'percent') {
        discountMinor = Math.floor((subtotalMinor * coupon.discountValue) / 100);
      }
      if (discountMinor > subtotalMinor) discountMinor = subtotalMinor;
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
