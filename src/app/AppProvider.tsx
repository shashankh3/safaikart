import React, { useEffect, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(
        state.isConnected != null && state.isConnected && Boolean(state.isInternetReachable)
      );
    });
    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
