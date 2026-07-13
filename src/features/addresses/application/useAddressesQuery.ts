import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AddressRepository } from '../infrastructure/AddressRepository';
import { auth } from '../../../app/config/firebase';
import { AddressDraft } from '../domain/Address';

const addressRepo = new AddressRepository();

export const useAddressesQuery = () => {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      if (!auth.currentUser) throw new Error("Not authenticated");
      return addressRepo.listAddresses(auth.currentUser.uid);
    },
    enabled: !!auth.currentUser,
  });
};

export const useAddAddressMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: AddressDraft) => {
      if (!auth.currentUser) throw new Error("Not authenticated");
      return addressRepo.addAddress(auth.currentUser.uid, draft);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
};
