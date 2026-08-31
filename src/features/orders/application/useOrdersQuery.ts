import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { OrdersRepository } from '../infrastructure/OrdersRepository';
import { auth, db } from '../../../app/config/firebase';
import { query, collection, where, orderBy, onSnapshot, getDocs } from '@react-native-firebase/firestore';
import { Order } from '../domain/Order';

const orderRepo = new OrdersRepository();

export const useOrdersQuery = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const orderData = { id: change.doc.id, ...change.doc.data() } as Order;

        queryClient.setQueryData(['orders'], (oldData: Order[] | undefined) => {
          const sortOrders = (list: Order[]) => {
            return [...list].sort((a: any, b: any) => {
              const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
              const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
              return timeB - timeA;
            });
          };

          if (!oldData) return [orderData];

          if (change.type === 'added') {
            const exists = oldData.some(o => o.id === orderData.id);
            if (!exists) return sortOrders([...oldData, orderData]);
            return oldData;
          }
          if (change.type === 'modified') {
            return sortOrders(oldData.map(o => o.id === orderData.id ? orderData : o));
          }
          if (change.type === 'removed') {
            return oldData.filter(o => o.id !== orderData.id);
          }
          return oldData;
        });
      });
    }, (error) => {
      console.error("Orders real-time sync failed:", error);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      return orderRepo.getOrders();
    },
    enabled: !!auth.currentUser,
  });
};
