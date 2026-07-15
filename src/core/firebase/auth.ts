import firebaseAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { app } from '../../app/config/firebase';

export const setupAuthListener = (callback: (user: FirebaseAuthTypes.User | null) => void) => {
  return firebaseAuth().onAuthStateChanged(callback);
};

export const logoutUser = async () => {
  try {
    const token = await messaging().getToken();
    if (token) {
      const functions = getFunctions(app, 'asia-south1');
      const removeFcmToken = httpsCallable(functions, 'removeFcmToken');
      // Fire-and-forget, gracefully handle failure
      removeFcmToken({ token }).catch(err => console.warn('Failed to remove FCM token:', err));
    }
  } catch (err) {
    console.warn('Error fetching FCM token on logout:', err);
  }
  return firebaseAuth().signOut();
};

export const sendPhoneOtp = async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  return firebaseAuth().signInWithPhoneNumber(phoneNumber);
};
