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

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'CONFIRMED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'CLEANING_IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  PAYMENT_PENDING: 'Payment Pending',
  CONFIRMED: 'Order Confirmed',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP: 'Picked Up',
  CLEANING_IN_PROGRESS: 'Cleaning in Progress',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund Pending',
  REFUNDED: 'Refunded',
};

// Using Ionicons names
export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  CONFIRMED: 'checkmark-circle',
  PICKUP_SCHEDULED: 'calendar',
  PICKED_UP: 'bicycle',
  CLEANING_IN_PROGRESS: 'water',
  READY_FOR_DELIVERY: 'checkmark-done-circle',
  OUT_FOR_DELIVERY: 'car',
  DELIVERED: 'home',
  CANCELLED: 'close-circle',
  REFUND_PENDING: 'cash',
  REFUNDED: 'cash',
  DRAFT: 'document',
  PAYMENT_PENDING: 'time',
};
