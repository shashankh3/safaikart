import {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';
import { OrderStatus } from './OrderStatus';

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: string;
  priceConfirmed: boolean;
  items: OrderItem[];
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  taxMinor: number;
  finalAmountMinor: number;
  currency: 'INR';
  couponCode: string | null;
  addressId: string;
  addressSnapshot: AddressSnapshot;
  pickupSlotId: string;
  pickupSlotSnapshot: PickupSlotSnapshot;
  editableUntil?: FirebaseFirestoreTypes.Timestamp;
  estimatedDeliveryDate?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface OrderItem {
  serviceId: string;
  nameSnapshot: string;
  quantity: number;
  unit: string;
  priceType: 'fixed' | 'variable';
  unitPriceMinor: number | null;
  lineTotalMinor: number | null;
  addons?: { id: string, name: string, priceMinor: number }[];
  estimatedMinMinor?: number;
  estimatedMaxMinor?: number;
}

export interface AddressSnapshot {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface PickupSlotSnapshot {
  date: string;
  startTime: string;
  endTime: string;
}
