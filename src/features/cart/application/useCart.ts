import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cart, CartItem } from '../domain/Cart';
import { CartStorage } from '../infrastructure/CartStorage';
import { CartRepository } from '../infrastructure/CartRepository';
import { auth } from '../../../app/config/firebase';

const CART_QUERY_KEY = ['cart'];

export const mergeCarts = (local: Cart, remote: Cart): Cart => {
  const itemMap = new Map<string, CartItem>();
  
  // Local overwrites remote (or vice versa depending on strategy, but merging by serviceId is safest)
  remote.items.forEach(item => itemMap.set(item.serviceId, item));
  
  // Local items overwrite remote items (local is usually fresher if we are merging on startup)
  local.items.forEach(item => {
    const existing = itemMap.get(item.serviceId);
    if (existing) {
      // Could sum quantities or just take local
      itemMap.set(item.serviceId, { ...existing, quantity: Math.max(existing.quantity, item.quantity) });
    } else {
      itemMap.set(item.serviceId, item);
    }
  });

  return { items: Array.from(itemMap.values()) };
};

export const useCartQuery = () => {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => {
      let localCart = await CartStorage.loadLocal();
      if (!localCart) localCart = { items: [] };

      const user = auth.currentUser;
      if (user) {
        try {
          const remoteCart = await CartRepository.getRemoteCart(user.uid);
          if (remoteCart && remoteCart.items.length > 0) {
            const merged = mergeCarts(localCart, remoteCart);
            await CartStorage.saveLocal(merged);
            return merged;
          }
        } catch (e) {
          console.warn("Failed to fetch remote cart", e);
        }
      }
      return localCart;
    },
  });
};

export const useCartMutations = () => {
  const queryClient = useQueryClient();

  const syncCart = async (newCart: Cart) => {
    await CartStorage.saveLocal(newCart);
    const user = auth.currentUser;
    if (user) {
      // Fire and forget remote sync to avoid blocking UI
      CartRepository.saveRemoteCart(user.uid, newCart).catch(e => console.warn('Failed to sync remote cart', e));
    }
  };

  const addToCartMutation = useMutation({
    mutationFn: async (item: CartItem) => {
      let finalCart: Cart = { items: [] };
      queryClient.setQueryData<Cart>(CART_QUERY_KEY, (old) => {
        const currentCart = old || { items: [] };
        const existingItemIndex = currentCart.items.findIndex(i => i.serviceId === item.serviceId);
        
        const newItems = [...currentCart.items];
        if (existingItemIndex >= 0) {
          newItems[existingItemIndex] = { ...newItems[existingItemIndex], quantity: newItems[existingItemIndex].quantity + item.quantity };
        } else {
          newItems.push(item);
        }
        finalCart = { ...currentCart, items: newItems };
        return finalCart;
      });
      await syncCart(finalCart);
      return finalCart;
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const newCart = { items: [] };
      queryClient.setQueryData(CART_QUERY_KEY, newCart);
      await syncCart(newCart);
      return newCart;
    },
  });

  const setQuantityMutation = useMutation({
    mutationFn: async ({ serviceId, quantity }: { serviceId: string; quantity: number }) => {
      let finalCart: Cart = { items: [] };
      queryClient.setQueryData<Cart>(CART_QUERY_KEY, (old) => {
        const currentCart = old || { items: [] };
        const newItems = currentCart.items
          .map(i => i.serviceId === serviceId ? { ...i, quantity } : i)
          .filter(i => i.quantity > 0);
        
        finalCart = { ...currentCart, items: newItems };
        return finalCart;
      });
      await syncCart(finalCart);
      return finalCart;
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      let finalCart: Cart = { items: [] };
      queryClient.setQueryData<Cart>(CART_QUERY_KEY, (old) => {
        const currentCart = old || { items: [] };
        const newItems = currentCart.items.filter(i => i.serviceId !== serviceId);
        finalCart = { ...currentCart, items: newItems };
        return finalCart;
      });
      await syncCart(finalCart);
      return finalCart;
    },
  });

  return {
    addToCart: addToCartMutation.mutateAsync,
    clearCart: clearCartMutation.mutateAsync,
    setQuantity: setQuantityMutation.mutateAsync,
    removeFromCart: removeFromCartMutation.mutateAsync,
  };
};
