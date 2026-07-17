import { httpsCallable } from "firebase/functions";
import { getFns } from "@/lib/firebase";

/**
 * Wrapper for the backend `adminUpdateOrderStatus` callable (region: asia-south1).
 *
 * Firestore security rules block direct client writes to `orders/*` for admins.
 * All status transitions MUST go through this callable — it enforces
 * transition rules, handles variable-price confirmation, and triggers
 * `sendOrderStatusNotification` so customers receive push updates.
 *
 * Do NOT bypass by calling `updateDoc(doc(db, "orders", id), { status })`.
 * If rules ever appear to allow it, that is a bug in rules — fix rules,
 * not this call site.
 */
export async function adminUpdateOrderStatus(
  orderId: string,
  status: string,
  extra?: Record<string, unknown>,
): Promise<unknown> {
  const fn = httpsCallable(getFns(), "adminUpdateOrderStatus");
  // The backend function expects newStatus instead of status
  const res = await fn({ orderId, newStatus: status, ...(extra ?? {}) });
  return res.data;
}

export async function adminAssignDriver(
  orderId: string,
  driverId: string
): Promise<unknown> {
  const fn = httpsCallable(getFns(), "adminAssignDriver");
  const res = await fn({ orderId, driverId });
  return res.data;
}

export async function adminSetOrderPhotos(
  orderId: string,
  photos: string[]
): Promise<unknown> {
  const fn = httpsCallable(getFns(), "adminSetOrderPhotos");
  const res = await fn({ orderId, photos });
  return res.data;
}
