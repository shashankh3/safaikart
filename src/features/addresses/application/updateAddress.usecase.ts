import { AddressRepository } from '../infrastructure/AddressRepository';
import { AddressDraft } from '../domain/Address';

export class UpdateAddressUseCase {
  constructor(private addressRepository: AddressRepository) {}

  async execute(addressId: string, userId: string, patch: Partial<AddressDraft>): Promise<void> {
    if (patch.phoneNumber) {
      const phoneRegex = /^\+91\d{10}$/;
      if (!phoneRegex.test(patch.phoneNumber)) {
        throw new Error('Phone number must start with +91 followed by 10 digits');
      }
    }
    if (patch.pincode) {
      const pinRegex = /^\d{6}$/;
      if (!pinRegex.test(patch.pincode)) {
        throw new Error('Pincode must be exactly 6 digits');
      }
    }

    await this.addressRepository.updateAddress(addressId, userId, patch);
  }
}
