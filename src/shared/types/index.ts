export interface Service {
  id: string;
  name: string;
  categoryId: string;
  gender: string;
  wearType: string;
  priceMinor: number;
  priceMaxMinor?: number;
  priceType: 'fixed' | 'variable';
  unit: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CartItem {
  serviceId: string;
  nameSnapshot: string;
  quantity: number;
  unit: string;
  priceType: 'fixed' | 'variable';
  priceMinor: number;
  priceMaxMinor?: number;
}

export interface Address {
  id: string;
  line1: string;
  city: string;
  pincode: string;
}

export interface PickupSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  serviceArea: string;
}

export type PaymentStatus =
  | 'NOT_STARTED'
  | 'CREATED'
  | 'PENDING'
  | 'CLIENT_CALLBACK_RECEIVED'
  | 'WEBHOOK_RECEIVED'
  | 'VERIFIED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type OrderStatus =
  | 'DRAFT'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'CLEANING_IN_PROGRESS'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  priceConfirmed: boolean;
  items: CartItem[];
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  taxMinor: number;
  finalAmountMinor: number;
  currency: string;
  couponCode?: string;
  addressId: string;
  addressSnapshot: Address;
  pickupSlotId: string;
  pickupSlotSnapshot: PickupSlot;
  createdAt: string;
  updatedAt: string;
}
