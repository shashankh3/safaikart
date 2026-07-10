import { Unsubscribe } from 'firebase/firestore';
import { OrdersRepository } from '../infrastructure/OrdersRepository';
import { Order } from '../domain/Order';

export class GetOrderTrackingUseCase {
  constructor(private repository: OrdersRepository) {}

  execute(orderId: string, callback: (order: Order | null) => void): Unsubscribe {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    return this.repository.subscribeToOrder(orderId, callback);
  }
}
