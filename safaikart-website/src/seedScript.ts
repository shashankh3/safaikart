import { collection, doc, writeBatch, getDocs } from "firebase/firestore";
import { getDb } from "./lib/firebase";
import seedData from "./seedData.json";

export async function runSeed() {
  const db = getDb();
  
  let batch = writeBatch(db);
  let opCount = 0;
  
  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  // 1. Delete existing services and categories
  const existingServices = await getDocs(collection(db, "services"));
  for (const docSnap of existingServices.docs) {
    batch.delete(docSnap.ref);
    opCount++;
    if (opCount === 500) await commitBatch();
  }
  
  const existingCategories = await getDocs(collection(db, "categories"));
  for (const docSnap of existingCategories.docs) {
    batch.delete(docSnap.ref);
    opCount++;
    if (opCount === 500) await commitBatch();
  }
  await commitBatch();

  // 2. Map category string IDs to clean display names
  const categoryNames: Record<string, string> = {
    "top_wear": "Top Wear",
    "bottom_wear": "Bottom Wear",
    "shoes": "Shoes",
    "packages": "Packages",
    "common": "Common",
    "dress": "Dress",
    "items": "Items",
    "general": "General"
  };

  const createdCategoryIds = new Set<string>();

  // 3. Process seedData
  const rootServices = seedData.services as any;
  for (const [serviceType, stData] of Object.entries(rootServices)) {
    // Map serviceType keys to the ones in taxonomy (e.g., footwear -> shoe-care, dry_cleaning -> dry-cleaning, steam_press -> steam-press)
    let stKey = serviceType;
    if (stKey === "footwear") stKey = "shoe-care";
    if (stKey === "shoe_care") stKey = "shoe-care";
    if (stKey === "dry_cleaning") stKey = "dry-cleaning";
    if (stKey === "steam_press") stKey = "steam-press";
    if (stKey === "wash_and_fold") stKey = "laundry";
    if (stKey === "premium_care") stKey = "premium";
    if (stKey === "household") stKey = "household";

    const genders = stData.categories || {};
    for (const [gender, gData] of Object.entries(genders)) {
      // Map gender keys (common -> unisex, household -> home, general -> home)
      let gKey = gender;
      if (gKey === "common") gKey = "unisex";
      if (gKey === "household") gKey = "home";
      if (gKey === "general") gKey = "home";

      const subCategories = (gData as any).subCategories || {};
      for (const [categoryId, items] of Object.entries(subCategories)) {
        
        // Create category if not exists
        if (!createdCategoryIds.has(categoryId)) {
          const catRef = doc(collection(db, "categories"), categoryId);
          batch.set(catRef, {
            name: categoryNames[categoryId] || categoryId
          });
          createdCategoryIds.add(categoryId);
          opCount++;
          if (opCount === 500) await commitBatch();
        }

        // Add items
        for (const item of items as any[]) {
          const itemRef = doc(collection(db, "services"), item.id);
          
          let priceMinor = 0;
          if (item.price !== undefined) {
             priceMinor = Math.round(item.price * 100);
          } else if (item.minPrice !== undefined) {
             priceMinor = Math.round(item.minPrice * 100); // Or handle min/max differently if supported
          }

          batch.set(itemRef, {
            categoryId: categoryId,
            name: item.name,
            priceMinor: priceMinor,
            unit: item.unit.replace("per_", ""), // e.g., "per_piece" -> "piece"
            priceType: item.priceType,
            serviceType: stKey,
            gender: gKey,
            addons: [],
            isActive: item.isActive,
            note: item.note
          });
          opCount++;
          if (opCount === 500) await commitBatch();
        }
      }
    }
  }
  
  await commitBatch();
  console.log("Seed completed!");
}
