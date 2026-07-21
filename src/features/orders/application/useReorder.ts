import { useCallback } from 'react';
import { useCart } from '../../cart/presentation/hooks/useCart';

export const useReorder = () => {
  const { addToCart } = useCart();

  const reorder = useCallback(async (order: any) => {
    const items = order?.items ?? order?.lineItems ?? [];
    if (!items.length) return;

    const mappedItems = items.map((item: any) => ({
      serviceId: item.serviceId,
      nameSnapshot: item.nameSnapshot ?? item.name,
      quantity: item.quantity ?? 1,
      priceMinor: item.unitPriceMinor ?? item.priceMinor ?? item.price,
      addons: item.addons || []
    }));

    if (addToCart) {
      await addToCart(mappedItems);
    }
  }, [addToCart]);

  return { reorder };
};
