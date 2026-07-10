import { PaymentRepository } from '../infrastructure/PaymentRepository';

export class CreatePaymentOrderUseCase {
  constructor(private repository: PaymentRepository) {}

  async execute(orderId: string) {
    if (!orderId) throw new Error('Order ID is required');
    return await this.repository.createPaymentOrder(orderId);
  }
}
