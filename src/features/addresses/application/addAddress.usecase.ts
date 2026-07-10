import { AddressRepository } from '../infrastructure/AddressRepository';
import { AddressDraft, Address } from '../domain/Address';

export class AddAddressUseCase {
  constructor(private addressRepository: AddressRepository) {}

  async execute(userId: string, draft: AddressDraft): Promise<Address> {
    if (!draft.label || draft.label.trim().length === 0 || draft.label.length > 30) {
      throw new Error('Label must be between 1 and 30 characters');
    }
    if (!draft.name || draft.name.trim().length === 0 || draft.name.length > 60) {
      throw new Error('Name must be between 1 and 60 characters');
    }
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(draft.phoneNumber)) {
      throw new Error('Phone number must start with +91 followed by 10 digits');
    }
    if (!draft.line1 || draft.line1.trim().length === 0) {
      throw new Error('Address Line 1 is required');
    }
    if (!draft.city || draft.city.trim().length === 0) {
      throw new Error('City is required');
    }
    if (!draft.state || draft.state.trim().length === 0) {
      throw new Error('State is required');
    }
    const pinRegex = /^\d{6}$/;
    if (!pinRegex.test(draft.pincode)) {
      throw new Error('Pincode must be exactly 6 digits');
    }

    return await this.addressRepository.addAddress(userId, draft);
  }
}
