import { auth } from '../../app/config/firebase';
import { onAuthStateChanged, User, signOut, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

export const setupAuthListener = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const logoutUser = () => signOut(auth);

export const sendPhoneOtp = async (phoneNumber: string, appVerifier: any): Promise<ConfirmationResult> => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};
