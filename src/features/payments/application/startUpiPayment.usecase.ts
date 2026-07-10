import { PaymentRepository } from '../infrastructure/PaymentRepository';
import { CreatePaymentOrderUseCase } from './createPaymentOrder.usecase';

// For WebView fallback, startUpiPayment just fetches the URL.
// The actual WebView rendering is in the UI component.

export class StartUpiPaymentUseCase {
  private createPaymentOrderUseCase: CreatePaymentOrderUseCase;

  constructor(private repository: PaymentRepository) {
    this.createPaymentOrderUseCase = new CreatePaymentOrderUseCase(repository);
  }

  async execute(orderId: string) {
    // 1. Fetch the checkout URL and Order details from backend
    const paymentData = await this.createPaymentOrderUseCase.execute(orderId);
    
    if (!paymentData.checkoutUrl) {
      throw new Error('Checkout URL not provided by backend. WebView fallback requires a URL.');
    }

    return paymentData;
  }
}
