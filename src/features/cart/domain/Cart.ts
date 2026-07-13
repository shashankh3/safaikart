export interface CartItemAddon {
  id: string;
}

export interface CartItem {
  serviceId: string;
  nameSnapshot?: string;
  quantity: number;
  unit?: string;
  priceType?: 'fixed' | 'variable';
  priceMinor?: number;
  priceMaxMinor?: number | null;
  addons?: CartItemAddon[];
}

export interface Cart {
  userId?: string;
  items: CartItem[];
  updatedAt?: Date;
}
