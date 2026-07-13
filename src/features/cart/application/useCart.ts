import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cart, CartItem } from '../domain/Cart';
import { CartStorage } from '../infrastructure/CartStorage';
import { CartRepository } from '../infrastructure/CartRepository';
import { auth } from '../../../app/config/firebase';

const CART_QUERY_KEY = ['cart'];

export const useCartQuery = () => {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => {
      let cart = await CartStorage.loadLocal();
      if (!cart) cart = { items: [] };

      const user = auth.currentUser;
      if (user) {
        try {
          const remoteCart = await CartRepository.getRemoteCart(user.uid);
          if (remoteCart && remoteCart.items.length > 0) {
            cart = remoteCart;
            await CartStorage.saveLocal(cart);
          }
        } catch (e) {
          console.warn("Failed to fetch remote cart", e);
        }
      }
      return cart;
    },
  });
};

export const useCartMutations = () => {
  const queryClient = useQueryClient();

  const syncCart = async (newCart: Cart) => {
    await CartStorage.saveLocal(newCart);
    const user = auth.currentUser;
    if (user) {
      await CartRepository.saveRemoteCart(user.uid, newCart);
    }
  };

  const addToCartMutation = useMutation({
    mutationFn: async (item: CartItem) => {
      const currentCart = queryClient.getQueryData<Cart>(CART_QUERY_KEY) || { items: [] };
      const existingItemIndex = currentCart.items.findIndex(i => i.serviceId === item.serviceId);
      
      const newItems = [...currentCart.items];
      if (existingItemIndex >= 0) {
        newItems[existingItemIndex].quantity += item.quantity;
      } else {
        newItems.push(item);
      }
      
      const newCart = { ...currentCart, items: newItems };
      await syncCart(newCart);
      return newCart;
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(CART_QUERY_KEY, newCart);
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const newCart = { items: [] };
      await syncCart(newCart);
      return newCart;
    },
    onSuccess: (newCart) => {
      queryClient.setQueryData(CART_QUERY_KEY, newCart);
    },
  });

  return {
    addToCart: addToCartMutation.mutateAsync,
    clearCart: clearCartMutation.mutateAsync,
  };
};
