import { httpsCallable } from "firebase/functions";
import { getFns } from "@/lib/firebase";

export type Coupon = {
  id: string;
  code: string;
  description?: string;
  type: "percent" | "flat";
  discountValue: number;
  minimumOrderAmount?: number;
  maxUsage?: number;
  usedCount?: number;
  usedBy?: string[];
  isActive: boolean;
  validUntil?: unknown;
};

export type CouponResult =
  | { ok: true; coupon: Pick<Coupon, "code">; discountMinor: number }
  | { ok: false; error: string };

export async function validateCoupon(code: string, subtotalMinor: number): Promise<CouponResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, error: "Enter a coupon code" };
  const fns = getFns();
  try {
    const validate = httpsCallable<
      { code: string; cartTotalMinor: number },
      { valid: boolean; discountMinor: number; message: string; newTotalMinor: number }
    >(fns, "validateCoupon");
    
    const { data } = await validate({ code: trimmed, cartTotalMinor: subtotalMinor });
    if (!data.valid) {
      return { ok: false, error: data.message || "Invalid coupon" };
    }
    return { ok: true, coupon: { code: trimmed }, discountMinor: data.discountMinor };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to validate coupon" };
  }
}
