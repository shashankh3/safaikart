import { CheckoutRepository } from '../infrastructure/CheckoutRepository';
import { createOrderDraftRequest } from '../../../../../functions/src/contracts';

export class CreateOrderDraftUseCase {
  constructor(private checkoutRepository: CheckoutRepository) {}

  async execute(params: { cartItemCount: number, addressId: string | null, pickupSlotId: string | null, couponCode: string | null, directItems?: any[] | null, idempotencyKey: string }) {
    if (params.cartItemCount === 0) {
      throw new Error('Cart is empty');
    }
    
    // Parse using the shared backend contract
    const payload = createOrderDraftRequest.parse({
      addressId: params.addressId,
      pickupSlotId: params.pickupSlotId,
      couponCode: params.couponCode,
      directItems: params.directItems,
      idempotencyKey: params.idempotencyKey
    });

    return await this.checkoutRepository.createOrderDraft(payload);
  }
}
