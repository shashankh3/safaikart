import { useAddressesQuery, useAddAddressMutation } from '../../application/useAddressesQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AddressRepository } from '../../infrastructure/AddressRepository';
import { auth } from '../../../../app/config/firebase';
import { AddressDraft } from '../../domain/Address';

const repository = new AddressRepository();

export const useAddresses = (userId?: string | null) => {
  const { data: addresses = [], isLoading: loading, error: queryError, refetch: refresh } = useAddressesQuery();
  const addMutation = useAddAddressMutation();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AddressDraft> }) => {
      if (!auth.currentUser) throw new Error('Not authenticated');
      return repository.updateAddress(id, auth.currentUser.uid, patch);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!auth.currentUser) throw new Error('Not authenticated');
      return repository.deleteAddress(id, auth.currentUser.uid);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const addAddress = async (draft: AddressDraft) => addMutation.mutateAsync(draft);
  const updateAddress = async (id: string, patch: Partial<AddressDraft>) => updateMutation.mutateAsync({ id, patch });
  const deleteAddress = async (id: string) => deleteMutation.mutateAsync(id);
  const setDefault = async (id: string) => updateAddress(id, { isDefault: true });

  const error = queryError?.message || addMutation.error?.message || updateMutation.error?.message || deleteMutation.error?.message || null;

  return {
    addresses,
    loading,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
    refresh,
  };
};
