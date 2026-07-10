import { CartItem } from '../../../shared/types';

export interface CheckoutDraft {
  cartItems: CartItem[];
  addressId: string | null;
  pickupSlotId: string | null;
  couponCode: string | null;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  taxMinor: number;
  estimatedTotalMinor: number;
  estimatedMinMinor?: number;  // for variable-price items
  estimatedMaxMinor?: number;  // for variable-price items
  currency: 'INR';
}
