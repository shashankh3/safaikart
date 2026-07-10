import { AddressRepository } from '../infrastructure/AddressRepository';
import { Address } from '../domain/Address';

export class ListAddressesUseCase {
  constructor(private addressRepository: AddressRepository) {}

  async execute(userId: string): Promise<Address[]> {
    return await this.addressRepository.listAddresses(userId);
  }
}
