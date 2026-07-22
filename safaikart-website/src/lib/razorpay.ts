import { httpsCallable } from "firebase/functions";
import { getFns } from "./firebase";

type RzpOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme?: { color?: string };
  handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
  method?: { upi?: boolean; card?: boolean; netbanking?: boolean; wallet?: boolean; emi?: boolean; paylater?: boolean };
  config?: { display?: { blocks?: Record<string, unknown>; sequence?: string[]; preferences?: { show_default_blocks?: boolean } } };
};

declare global {
  interface Window {
    Razorpay?: new (opts: RzpOptions) => { open: () => void };
  }
}

function loadCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export async function payWithRazorpay(params: {
  orderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountMinor: number;
  customerName: string;
  customerPhone: string;
  description: string;
}): Promise<{ ok: true }> {
  await loadCheckoutScript();
  const fns = getFns();
  
  const verify = httpsCallable<
    { orderId: string },
    { paymentStatus: string }
  >(fns, "verifyPaymentStatus");

  return new Promise((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error("Razorpay not loaded"));
    const options = {
      key: params.razorpayKeyId,
      amount: params.amountMinor,
      currency: "INR",
      name: "SafaiKart",
      description: params.description,
      order_id: params.razorpayOrderId,
      prefill: { name: params.customerName, contact: params.customerPhone },
      theme: { color: "#0f4d2a" },
      handler: async (r) => {
        try {
          await verify({ orderId: params.orderId });
          resolve({ ok: true });
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Verification failed"));
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}
