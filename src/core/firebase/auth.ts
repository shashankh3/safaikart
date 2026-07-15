import firebaseAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export const setupAuthListener = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  return firebaseAuth().onAuthStateChanged(callback);
};

export const logoutUser = () => firebaseAuth().signOut();

export const sendPhoneOtp = async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  return firebaseAuth().signInWithPhoneNumber(phoneNumber);
};
