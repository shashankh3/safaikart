import { isRevenueGeneratingStatus } from './metrics';

describe('Metrics', () => {
  describe('isRevenueGeneratingStatus', () => {
    it('should ignore NON_REVENUE_STATUSES', () => {
      expect(isRevenueGeneratingStatus('DRAFT')).toBe(false);
      expect(isRevenueGeneratingStatus('CANCELLED')).toBe(false);
      expect(isRevenueGeneratingStatus('FAILED')).toBe(false);
      expect(isRevenueGeneratingStatus('REFUNDED')).toBe(false);
      expect(isRevenueGeneratingStatus('REFUND_PENDING')).toBe(false);
    });

    it('should include revenue generating statuses', () => {
      expect(isRevenueGeneratingStatus('PAYMENT_PENDING')).toBe(true);
      expect(isRevenueGeneratingStatus('PAYMENT_CAPTURED')).toBe(true);
      expect(isRevenueGeneratingStatus('PICKUP_SCHEDULED')).toBe(true);
      expect(isRevenueGeneratingStatus('CLEANING_IN_PROGRESS')).toBe(true);
      expect(isRevenueGeneratingStatus('OUT_FOR_DELIVERY')).toBe(true);
      expect(isRevenueGeneratingStatus('COMPLETED')).toBe(true);
    });

    it('should handle undefined or null gracefully', () => {
      expect(isRevenueGeneratingStatus(undefined)).toBe(true);
      expect(isRevenueGeneratingStatus(null)).toBe(true);
    });
  });
});
