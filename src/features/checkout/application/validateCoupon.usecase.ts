import { CheckoutRepository } from '../infrastructure/CheckoutRepository';

export class ValidateCouponUseCase {
  constructor(private checkoutRepository: CheckoutRepository) {}

  async execute(code: string, cartTotalMinor: number) {
    if (!code || code.trim().length === 0) {
      throw new Error('Please enter a valid coupon code');
    }
    
    // Convert code to uppercase for consistency
    const upperCode = code.trim().toUpperCase();
    return await this.checkoutRepository.validateCoupon(upperCode, cartTotalMinor);
  }
}
