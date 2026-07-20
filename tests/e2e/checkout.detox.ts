import { by, device, element, expect } from 'detox';

describe('Checkout and Payment Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete a full order placement and redirect to tracking', async () => {
    // 1. Navigate to Catalog & Add Item
    await expect(element(by.id('catalog-screen'))).toBeVisible();
    await element(by.id('add-item-premium-wash')).tap();
    await element(by.id('view-cart-button')).tap();

    // 2. Checkout flow
    await expect(element(by.id('cart-screen'))).toBeVisible();
    await element(by.id('proceed-to-checkout-button')).tap();

    // 3. Address Selection
    await expect(element(by.id('address-selection-screen'))).toBeVisible();
    await element(by.id('select-address-0')).tap();
    await element(by.id('continue-button')).tap();

    // 4. Pickup Slot Selection
    await expect(element(by.id('slot-selection-screen'))).toBeVisible();
    await element(by.text('Tomorrow')).tap();
    await element(by.text('10:00 AM - 12:00 PM')).tap();
    await element(by.id('continue-button')).tap();

    // 5. Payment Screen
    await expect(element(by.id('payment-screen'))).toBeVisible();
    await element(by.id('pay-now-button')).tap();

    // At this point, the app transitions to Razorpay Gateway (Webview/Native SDK).
    // In detox, mocking third-party webviews is complex, so we expect the deep link
    // to bring us back and navigate to OrderTracking.
    
    // Simulate incoming deep link callback
    const simulatedOrderId = 'test_order_123';
    await device.openURL({ url: `safaikart://payment/${simulatedOrderId}/success` });

    // 6. Verify Tracking Screen
    await expect(element(by.id('order-tracking-screen'))).toBeVisible();
    await expect(element(by.text('Payment Successful'))).toBeVisible();
  });
});
