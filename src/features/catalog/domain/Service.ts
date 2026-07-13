export interface Addon {
  id: string;
  name: string;
  priceMinor: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  gender: 'men' | 'women' | 'household' | 'unisex';
  wearType: 'top_wear' | 'bottom_wear' | 'dress' | 'household' | 'footwear';
  priceMinor: number;
  priceMaxMinor?: number;
  priceType: 'fixed' | 'variable';
  unit: 'piece' | 'sqft' | 'seat' | 'chair' | 'package';
  addons?: Addon[];
  estimatedDurationHours: number;
  isPackage?: boolean;
  packageQuantity?: number;
  isActive: boolean;
  sortOrder: number;
  notes?: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
