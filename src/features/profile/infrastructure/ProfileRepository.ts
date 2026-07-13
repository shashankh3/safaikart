import { db, doc, getDoc, setDoc } from '../../../core/firebase/firestore';
import { Profile } from '../domain/Profile';

export class ProfileRepository {
  static async getProfile(userId: string): Promise<Profile | null> {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data() as Profile) : null;
  }
  static async updateProfile(userId: string, data: Partial<Profile>): Promise<void> {
    await setDoc(doc(db, 'users', userId), { ...data, updatedAt: new Date() }, { merge: true });
  }
}
