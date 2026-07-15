import { db } from './firestore';
import {collection, doc, writeBatch} from '@react-native-firebase/firestore';

export const CATEGORIES = [
  { id: "dry_cleaning", name: "Dry Cleaning", slug: "dry-cleaning", icon: "shirt-outline", isActive: true, sortOrder: 1 },
  { id: "steam_press", name: "Steam Press", slug: "steam-press", icon: "water-outline", isActive: true, sortOrder: 2 },
  { id: "shoes_cleaning", name: "Shoes Cleaning", slug: "shoes-cleaning", icon: "walk-outline", isActive: true, sortOrder: 3 }
];

export const SERVICES = [
  { id: "svc_0001", name: "Shirt", categoryId: "dry_cleaning", gender: "men", wearType: "top_wear", priceMinor: 9000, priceType: "fixed", unit: "piece", addons: [{ id: "starch", name: "Starch", priceMinor: 4000, isActive: true }], estimatedDurationHours: 48, isActive: true, sortOrder: 1 },
  { id: "svc_0002", name: "Pant", categoryId: "dry_cleaning", gender: "men", wearType: "bottom_wear", priceMinor: 9000, priceType: "fixed", unit: "piece", estimatedDurationHours: 48, isActive: true, sortOrder: 2 },
  { id: "svc_0100", name: "Saree (Light/Cotton)", categoryId: "dry_cleaning", gender: "women", wearType: "top_wear", priceMinor: 30000, priceType: "fixed", unit: "piece", estimatedDurationHours: 48, isActive: true, sortOrder: 3 },
  { id: "svc_0150", name: "Curtains 4x4", categoryId: "dry_cleaning", gender: "household", wearType: "household", priceMinor: 10000, priceType: "fixed", unit: "piece", estimatedDurationHours: 72, isActive: true, sortOrder: 4 },
  { id: "svc_0212", name: "Normal/Canvas/Net/Non-Leather/Sports Shoes", categoryId: "shoes_cleaning", gender: "unisex", wearType: "footwear", priceMinor: 35000, priceType: "fixed", unit: "piece", estimatedDurationHours: 72, isActive: true, sortOrder: 1, notes: "Sneakers, sports shoes..." },
  { id: "svc_0214", name: "Shoe Cleaning Monthly Package (8 Pairs)", categoryId: "shoes_cleaning", gender: "unisex", wearType: "footwear", priceMinor: 210000, priceType: "fixed", unit: "package", estimatedDurationHours: 72, isActive: true, sortOrder: 3, isPackage: true, packageQuantity: 8 },
];

export const seedCatalogToFirestore = async () => {
  try {
    const batch = writeBatch(db);
    
    CATEGORIES.forEach((category) => {
      const ref = doc(collection(db, 'categories'), category.id);
      batch.set(ref, category);
    });

    SERVICES.forEach((service) => {
      const ref = doc(collection(db, 'services'), service.id);
      batch.set(ref, service);
    });

    await batch.commit();
    console.log("Catalog seeded successfully!");
  } catch (error) {
    console.error("Error seeding catalog: ", error);
  }
};
