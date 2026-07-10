import { useState, useEffect, useCallback } from 'react';
import { Address, AddressDraft } from '../../domain/Address';
import { AddressRepository } from '../../infrastructure/AddressRepository';
import { AddAddressUseCase } from '../../application/addAddress.usecase';
import { UpdateAddressUseCase } from '../../application/updateAddress.usecase';
import { ListAddressesUseCase } from '../../application/listAddresses.usecase';

// In a real app, this would be injected via Context or a DI container.
const repository = new AddressRepository();
const addAddressUseCase = new AddAddressUseCase(repository);
const updateAddressUseCase = new UpdateAddressUseCase(repository);
const listAddressesUseCase = new ListAddressesUseCase(repository);

export const useAddresses = (userId: string | null) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!userId) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listAddressesUseCase.execute(userId);
      setAddresses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addAddress = async (draft: AddressDraft) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await addAddressUseCase.execute(userId, draft);
      await fetchAddresses(); // Refetch to get updated list with server timestamps
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateAddress = async (id: string, patch: Partial<AddressDraft>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await updateAddressUseCase.execute(id, userId, patch);
      await fetchAddresses();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteAddress = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await repository.deleteAddress(id, userId);
      await fetchAddresses();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const setDefault = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await updateAddressUseCase.execute(id, userId, { isDefault: true });
      await fetchAddresses();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    addresses,
    loading,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
    refresh: fetchAddresses,
  };
};
