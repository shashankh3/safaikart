import { test, expect } from '@playwright/test';

test.describe('SafaiKart User Journey E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local Expo web server if testing web, or setup detox/maestro for native
    // For this playwright skeleton, we assume a web-based React Native simulation
    await page.goto('http://localhost:8081');
  });

  test('Complete Authentication Flow', async ({ page }) => {
    // Verify splash screen
    await expect(page.getByText('SafaiKart', { exact: false })).toBeVisible();

    // Phone number entry
    const phoneInput = page.getByPlaceholder('Phone Number');
    await phoneInput.fill('9999999999');
    await page.getByRole('button', { name: 'Send OTP' }).click();

    // OTP entry
    await expect(page.getByText('Enter OTP')).toBeVisible();
    const otpInput = page.getByPlaceholder('123456');
    await otpInput.fill('123456');
    await page.getByRole('button', { name: 'Verify' }).click();

    // Verify home screen loaded
    await expect(page.getByText('Dry Cleaning')).toBeVisible();
  });

  test('Catalog Browsing and Add to Cart', async ({ page }) => {
    // Navigate to Shoe Cleaning
    await page.getByText('Shoe Cleaning').click();
    
    // Verify services load
    const sneakerService = page.getByText('Sneaker Deep Clean');
    await expect(sneakerService).toBeVisible();

    // Add item to cart
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    
    // Verify cart badge increments (Assuming a badge element exists)
    await expect(page.locator('text=1 item')).toBeVisible();
  });

  test('Direct Checkout (Buy Now)', async ({ page }) => {
    await page.getByText('Shoe Cleaning').click();
    
    // Use Buy Now
    await page.getByRole('button', { name: 'Buy Now' }).last().click();
    
    // Verify it jumps straight to checkout, bypassing cart
    await expect(page.getByText('Checkout')).toBeVisible();
  });

  test('Checkout and Payment Flow', async ({ page }) => {
    // Assuming we are on the Checkout screen
    await expect(page.getByText('Select Address')).toBeVisible();
    await page.getByText('Home').click();
    
    // Select Pickup Slot
    await expect(page.getByText('Select Pickup Slot')).toBeVisible();
    await page.getByText('Tomorrow').click();
    
    // Apply Coupon
    const couponInput = page.getByPlaceholder('Enter Coupon Code');
    await couponInput.fill('TEST50');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Discount Applied')).toBeVisible();
    
    // Pay Now
    await page.getByRole('button', { name: 'Pay Now' }).click();
    
    // Razorpay Mock Interaction
    await expect(page.getByText('Razorpay Checkout')).toBeVisible();
    await page.getByText('UPI').click();
    await page.getByRole('button', { name: 'Pay' }).click();
    
    // Payment Success Validation
    await expect(page.getByText('Payment Processing')).toBeVisible();
    await expect(page.getByText('Payment Success')).toBeVisible({ timeout: 10000 });
  });

  test('Order Tracking and Cancellation', async ({ page }) => {
    // Navigate to Orders
    await page.getByText('Go to Orders').click();
    
    // Open most recent order
    await page.getByText('Order Placed').first().click();
    
    // Verify tracking timeline
    await expect(page.getByText('Order Tracking')).toBeVisible();
    
    // Cancel Order (within 3 min window)
    await page.getByRole('button', { name: 'Cancel Order' }).click();
    await page.getByRole('button', { name: 'Yes, Cancel' }).click();
    
    // Verify cancellation
    await expect(page.getByText('Order Cancelled')).toBeVisible();
  });
});
