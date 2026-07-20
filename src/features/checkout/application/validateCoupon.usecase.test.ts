import { ValidateCouponUseCase } from './validateCoupon.usecase';

describe('ValidateCouponUseCase', () => {
  it('should throw if code is empty', async () => {
    const mockRepo = {
      createOrderDraft: jest.fn(),
      validateCoupon: jest.fn()
    };
    const useCase = new ValidateCouponUseCase(mockRepo as any);
    await expect(useCase.execute('', 1000)).rejects.toThrow('Please enter a valid coupon code');
    await expect(useCase.execute('   ', 1000)).rejects.toThrow('Please enter a valid coupon code');
  });

  it('should trim and uppercase the code', async () => {
    const mockRepo = {
      createOrderDraft: jest.fn(),
      validateCoupon: jest.fn().mockResolvedValue({ valid: true, discountMinor: 100 })
    };
    const useCase = new ValidateCouponUseCase(mockRepo as any);
    
    const result = await useCase.execute('  save20  ', 1000);
    expect(mockRepo.validateCoupon).toHaveBeenCalledWith('SAVE20', 1000);
    expect(result).toEqual({ valid: true, discountMinor: 100 });
  });
});
