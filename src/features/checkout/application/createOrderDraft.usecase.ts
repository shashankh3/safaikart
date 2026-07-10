import { CheckoutRepository } from '../infrastructure/CheckoutRepository';

export class CreateOrderDraftUseCase {
  constructor(private checkoutRepository: CheckoutRepository) {}

  async execute(params: { cartItemCount: number, addressId: string | null, pickupSlotId: string | null, couponCode: string | null }) {
    if (params.cartItemCount === 0) {
      throw new Error('Cart is empty');
    }
    if (!params.addressId) {
      throw new Error('Please select a delivery address');
    }
    if (!params.pickupSlotId) {
      throw new Error('Please select a pickup slot');
    }

    return await this.checkoutRepository.createOrderDraft({
      addressId: params.addressId,
      pickupSlotId: params.pickupSlotId,
      couponCode: params.couponCode
    });
  }
}
