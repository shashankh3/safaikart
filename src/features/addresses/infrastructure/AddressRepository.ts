import {collection, doc, getDoc, getDocs, query, where, orderBy, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, FirebaseFirestoreTypes} from '@react-native-firebase/firestore';
import { db } from '../../../app/config/firebase';
import { Address, AddressDraft } from '../domain/Address';

export class AddressRepository {
  private collectionPath = 'addresses';

  async listAddresses(userId: string): Promise<Address[]> {
    const q = query(
      collection(db, this.collectionPath),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Address));
    
    return addresses.sort((a: any, b: any) => {
      // Default addresses first
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      // Then newest first
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    });
  }

  async getAddress(addressId: string, userId: string): Promise<Address | null> {
    const docRef = doc(db, this.collectionPath, addressId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().userId === userId) {
      return { id: docSnap.id, ...docSnap.data() } as Address;
    }
    return null;
  }

  async addAddress(userId: string, draft: AddressDraft): Promise<Address> {
    const addressesRef = collection(db, this.collectionPath);
    const newDocRef = doc(addressesRef);
    const batch = writeBatch(db);

    if (draft.isDefault) {
      const q = query(addressesRef, where('userId', '==', userId));
      const userDocs = await getDocs(q);
      userDocs.forEach(d => {
        if (d.data()?.isDefault) {
          batch.update(d.ref, { isDefault: false, updatedAt: serverTimestamp() });
        }
      });
    }

    const newAddress = {
      ...draft,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(newDocRef, newAddress);
    await batch.commit();

    return { id: newDocRef.id, ...newAddress } as unknown as Address;
  }

  async updateAddress(addressId: string, userId: string, patch: Partial<AddressDraft>): Promise<void> {
    const address = await this.getAddress(addressId, userId);
    if (!address) throw new Error('Address not found or unauthorized');

    const batch = writeBatch(db);

    if (patch.isDefault === true) {
      const q = query(collection(db, this.collectionPath), where('userId', '==', userId));
      const userDocs = await getDocs(q);
      userDocs.forEach(d => {
        if (d.id !== addressId && d.data()?.isDefault) {
          batch.update(d.ref, { isDefault: false, updatedAt: serverTimestamp() });
        }
      });
    }

    const docRef = doc(db, this.collectionPath, addressId);
    batch.update(docRef, { ...patch, updatedAt: serverTimestamp() });
    
    await batch.commit();
  }

  async deleteAddress(addressId: string, userId: string): Promise<void> {
    const address = await this.getAddress(addressId, userId);
    if (!address) throw new Error('Address not found or unauthorized');
    await deleteDoc(doc(db, this.collectionPath, addressId));
  }
}
