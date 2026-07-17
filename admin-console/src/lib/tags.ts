export type CustomerTag = "vip" | "at-risk" | "new" | "complainer";

export function computeTags(input: {
  createdAt: Date | null | undefined;
  orderCount: number;
  lastOrderAt: Date | null | undefined;
  complaintCount: number;
}): CustomerTag[] {
  const now = Date.now();
  const tags: CustomerTag[] = [];
  if (input.orderCount > 10) tags.push("vip");
  if (input.lastOrderAt && now - input.lastOrderAt.getTime() > 45 * 24 * 60 * 60 * 1000) {
    tags.push("at-risk");
  }
  if (input.createdAt && now - input.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
    tags.push("new");
  }
  if (input.complaintCount >= 1) tags.push("complainer");
  return tags;
}
