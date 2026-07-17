export function formatINR(amountMinor: number | undefined | null, currency = "INR"): string {
  const value = (amountMinor ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toFixed(2)}`;
  }
}

export function formatDate(input: unknown): string {
  if (!input) return "—";
  let d: Date | null = null;
  if (input instanceof Date) d = input;
  else if (typeof input === "object" && input !== null && "toDate" in input) {
    try {
      d = (input as { toDate: () => Date }).toDate();
    } catch {
      d = null;
    }
  } else if (typeof input === "string" || typeof input === "number") {
    d = new Date(input);
  }
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function toDate(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === "object" && input !== null && "toDate" in input) {
    try {
      return (input as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof input === "string" || typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export const ORDER_STATUSES = [
  "DRAFT",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "CLEANING_IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function statusColor(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "CANCELLED":
    case "REFUNDED":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "REFUND_PENDING":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "PAYMENT_PENDING":
    case "DRAFT":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "CONFIRMED":
    case "PICKUP_SCHEDULED":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "PICKED_UP":
    case "CLEANING_IN_PROGRESS":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "READY_FOR_DELIVERY":
    case "OUT_FOR_DELIVERY":
      return "bg-violet-100 text-violet-800 border-violet-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function paymentStatusColor(status: string): string {
  switch (status) {
    case "VERIFIED":
    case "PAID":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "FAILED":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "CREATED":
    case "PENDING":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
