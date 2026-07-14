import { z } from 'zod';

export const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number')
    .transform(val => `+91${val}`)
});

export const addressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  line1: z.string().min(5, 'Address must be at least 5 characters'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a valid 6-digit pincode'),
  isDefault: z.boolean().default(false)
});

export type AddressForm = z.infer<typeof addressSchema>;

export const issueSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  issueType: z.enum(['quality', 'missing_item', 'delay', 'payment', 'other']),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description cannot exceed 500 characters'),
  photoUrl: z.string().url().optional()
});

export type IssueForm = z.infer<typeof issueSchema>;

export const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Please select a delivery address'),
  pickupSlotId: z.string().min(1, 'Please select a pickup slot'),
  couponCode: z.string().min(3).max(20).optional().or(z.literal('')),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters').optional(),
  acceptedTc: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
});

export type CheckoutForm = z.infer<typeof checkoutSchema>;

export const couponSchema = z.object({
  code: z.string().min(3, 'Coupon must be at least 3 characters').max(20, 'Coupon cannot exceed 20 characters')
});

export type CouponForm = z.infer<typeof couponSchema>;
