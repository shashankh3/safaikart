import { z } from 'zod';

export const addressSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(5).max(10),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export const orderItemSchema = z.object({
  serviceId: z.string(),
  categoryId: z.string().optional(),
  name: z.string().optional(),
  priceMinor: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).max(99),
  image: z.string().optional()
});

export const createOrderDraftRequest = z.object({
  addressId: z.string().min(1),
  pickupSlotId: z.string().min(1),
  directItems: z.array(orderItemSchema).optional().nullable(),
  couponCode: z.string().optional().nullable(),
  idempotencyKey: z.string().optional()
});

export const editOrderItemsRequest = z.object({
  orderId: z.string().min(1),
  items: z.array(orderItemSchema).min(1)
});

export const submitReviewRequest = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});

export const checkServiceabilityRequest = z.object({
  pincode: z.string().min(5).max(10)
});
