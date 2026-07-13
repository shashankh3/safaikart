import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderRepository } from '../infrastructure/OrderRepository';
import { auth } from '../../../app/config/firebase';
import { Order } from '../domain/Order';

const orderRepo = new OrderRepository();

export const useOrdersQuery = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!auth.currentUser) throw new Error("Not authenticated");
      return orderRepo.listOrders(auth.currentUser.uid);
    },
    enabled: !!auth.currentUser,
  });
};

export const useCreateOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!auth.currentUser) throw new Error("Not authenticated");
      return orderRepo.createOrder(orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
