// RazorpayPaymentProvider.ts
// Handles WebView logic and extracting the untrusted payment_id from the redirect URL

export class RazorpayPaymentProvider {
  // We don't need a complex wrapper here since we are using WebView.
  // The UI layer (PaymentScreen) will render the WebView.
  // This provider can just provide the HTML/URL generation if needed,
  // but our Cloud Function returns the pre-built `checkoutUrl`.
  
  static extractPaymentIdFromUrl(url: string): string | null {
    try {
      // Razorpay callbacks typically include razorpay_payment_id in the query string
      // e.g. https://safaikart.com/return?razorpay_payment_id=pay_XXXXX&...
      const match = url.match(/[?&]razorpay_payment_id=([^&]+)/);
      if (match && match[1]) {
        return match[1];
      }
    } catch (e) {
      console.error('Error parsing payment URL', e);
    }
    return null;
  }

  static isCallbackUrl(url: string, expectedReturnHost = 'safaikart-checkout.web.app'): boolean {
    return url.includes(expectedReturnHost) || url.includes('razorpay_payment_id=');
  }
}
