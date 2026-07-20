import { useQuery } from '@tanstack/react-query';
import { CheckoutRepository } from '../infrastructure/CheckoutRepository';

export const useCouponsQuery = () => {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: () => {
      const repo = new CheckoutRepository();
      return repo.getCoupons();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
