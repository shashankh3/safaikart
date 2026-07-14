// New Hierarchical Catalog Data Models

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  maxPrice?: number;
  isRange?: boolean;
  unit?: string;
  // Fallback for older code using priceMinor
  priceMinor?: number; 
}

export interface CatalogSubcategory {
  id: string;
  name: string;
  items: CatalogItem[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  subcategories: CatalogSubcategory[];
}

export interface CatalogService {
  id: string;
  name: string;
  imageRef?: string;
  termsAndConditions?: string[];
  categories: CatalogCategory[];
}

export interface CatalogV2 {
  businessInfo: {
    name: string;
  };
  services: CatalogService[];
}

// Keeping the old Service interface for any legacy components temporarily
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
