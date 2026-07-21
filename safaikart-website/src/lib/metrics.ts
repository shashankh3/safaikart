const NON_REVENUE_STATUSES = new Set(["DRAFT", "CANCELLED", "FAILED", "REFUNDED", "REFUND_PENDING"]);

export function isRevenueGeneratingStatus(status?: string | null): boolean {
  if (!status) return true; // Assume valid if no status (legacy)
  return !NON_REVENUE_STATUSES.has(status);
}
