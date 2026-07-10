import { OrdersRepository } from '../infrastructure/OrdersRepository';
import { Order } from '../domain/Order';

export class GetOrdersUseCase {
  constructor(private repository: OrdersRepository) {}

  async execute(): Promise<Order[]> {
    return await this.repository.getOrders();
  }
}
