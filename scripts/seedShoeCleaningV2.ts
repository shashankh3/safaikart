import { db, getDoc, setDoc, doc } from '../src/core/firebase/firestore';

export const seedShoeCleaningV2 = async () => {
  try {
    console.log('Fetching V2 Catalog...');
    const docRef = doc(db, 'appConfig', 'catalog_v2');
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      console.error('Catalog V2 does not exist yet. Please run seedDatabaseV2 first.');
      return false;
    }

    const data = snapshot.data();
    
    // The new shoe cleaning service structure matching the V2 organization
    const shoeCleaningService = {
      id: "svc_shoe_cleaning",
      name: "Shoe Cleaning",
      imageRef: "footwear_revival",
      isActive: true, // You can flip this when prices are finalized
      categories: [
        {
          id: "cat_shoe_regular",
          name: "Standard Services",
          items: [
            { name: "Normal/Canvas/Net/Non leather/Sports shoes", price: 350, currency: "INR" },
            { name: "Leather sneakers", price: 450, currency: "INR" }
          ]
        },
        {
          id: "cat_shoe_packages",
          name: "Packages",
          items: [
            { name: "Shoe cleaning Monthly Package (8 pair cleaning)", price: 2100, currency: "INR" }
          ]
        }
      ],
      termsAndConditions: [
        "Please check your garments for any damage before placing the order.",
        "While SafaiKart handles every item with care, SafaiKart is not liable for normal wear and tear that may occur during the process.",
        "Stain removal is not guaranteed. Safaikart uses the best available cleaning agents to treat stains; however, if a stain persists after cleaning, Safaikart shall not be liable.",
        "Colour fading or loss may occur during the cleaning process. Safaikart shall not be liable for any such colour fading or loss.",
        "SafaiKart does not polish shoes."
      ]
    };

    // Replace or append the service
    const existingServices = data.services || [];
    const index = existingServices.findIndex((s: any) => s.id === shoeCleaningService.id);
    
    if (index >= 0) {
      existingServices[index] = shoeCleaningService;
      console.log('Updated existing Shoe Cleaning service.');
    } else {
      existingServices.push(shoeCleaningService);
      console.log('Added new Shoe Cleaning service.');
    }

    data.services = existingServices;

    console.log('Writing back to Firestore...');
    await setDoc(docRef, data);
    console.log('Successfully seeded Shoe Cleaning in V2 catalog!');
    return true;
  } catch (error) {
    console.error('Error seeding Shoe Cleaning catalog:', error);
    return false;
  }
};
