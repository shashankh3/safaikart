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
  iconName?: string;
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
  userId?: string;
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

export interface Profile {
  userId: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  defaultAddressId?: string;
  isBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminRole = 'superadmin' | 'admin' | 'support' | 'finance' | 'ops';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
}

export interface Issue {
  id: string;
  userId: string;
  orderId?: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface IssueMessage {
  id: string;
  senderId: string;
  text: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Review {
  id: string; // userId_serviceId
  userId: string;
  serviceId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface OrderLog {
  id: string;
  action: string;
  actorId: string;
  actorRole: string; // 'system', 'customer', 'admin', etc.
  timestamp: string;
  details?: string;
}
