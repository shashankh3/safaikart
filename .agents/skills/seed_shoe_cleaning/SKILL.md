---
name: seed_shoe_cleaning
description: Seed the Shoe Cleaning category with a realistic price list into Firestore.
---
# Skill: Seed Shoe Cleaning Prices

## Objective
Seed the Shoe Cleaning category with a realistic price list into Firestore, matching the existing schema used by Dry Cleaning, Steam Press, and Sofa/Household Cleaning.

## Rules of Engagement
- **Target Collection**: `services` collection, where each service document has fields: `categoryId`, `name`, `description`, `priceType` (fixed/variable), `price` (number or null for variable), `unit`, `isActive` (boolean), `starchAddon` (boolean, false for shoes).
- **Artifact**: Save the seed script to `production_artifacts/shoe_cleaning_seed.ts`.
- **Approval Gate**: After writing the script, pause and show the user the price list for approval before executing.

## Instructions
1. Read existing service documents in the `services` collection to understand the exact schema (check Dry Cleaning items).
2. Generate a comprehensive shoe cleaning price list with at least 15 services covering:
   - Sneakers (basic, premium, luxury)
   - Formal shoes (leather, suede)
   - Boots (ankle, knee-high)
   - Sandals and floaters
   - Sports shoes
   - Heels and women's footwear
   - Kids' shoes
   - Add-on services (sole cleaning, deodorizing, color restoration, waterproofing)
3. Use `priceType: "fixed"` for most items. Use `priceType: "variable"` for luxury/restoration services where price depends on condition.
4. Set `categoryId: "shoe-cleaning"`, `isActive: true` for all.
5. Write the TypeScript seed script using Firebase Admin SDK to `production_artifacts/shoe_cleaning_seed.ts`.
6. Execute the script via terminal: `npx ts-node production_artifacts/shoe_cleaning_seed.ts`.
7. Verify the documents appear in Firestore by running a read query.
8. Output a summary table of all seeded services.
