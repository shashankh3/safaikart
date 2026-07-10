import { OrdersRepository } from '../infrastructure/OrdersRepository';

export class CancelOrderUseCase {
  constructor(private repository: OrdersRepository) {}

  async execute(orderId: string, reason?: string) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    return await this.repository.cancelOrder(orderId, reason);
  }
}
