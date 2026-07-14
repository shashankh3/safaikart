import { db, doc, getDoc, setDoc } from '../../../core/firebase/firestore';
import { Profile } from '../domain/Profile';

export class ProfileRepository {
  static async getProfile(userId: string): Promise<Profile | null> {
    const snap = await getDoc(doc(db, 'profiles', userId));
    return snap.exists() ? (snap.data() as Profile) : null;
  }
  static async updateProfile(userId: string, data: Partial<Profile>): Promise<void> {
    const allowedKeys: (keyof Profile)[] = ['displayName', 'photoURL', 'defaultAddressId', 'fcmTokens'];
    const safeData: any = {};
    for (const key of allowedKeys) {
      if (key in data) {
        safeData[key] = data[key];
      }
    }
    await setDoc(doc(db, 'profiles', userId), { ...safeData, updatedAt: new Date() }, { merge: true });
  }
}
