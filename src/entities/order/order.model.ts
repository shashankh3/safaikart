import { z } from 'zod';

export const OrderStatusEnum = z.enum([
  'PAYMENT_PENDING',
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'OUT_FOR_PICKUP',
  'PICKED_UP',
  'IN_PROCESSING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED',
]);

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusEnum,
  finalAmountMinor: z.number(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
