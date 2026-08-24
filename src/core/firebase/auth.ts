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
      await removeFcmToken({ token }).catch(err => console.warn('Failed to remove FCM token:', err));

      // Delete local FCM token to ensure device no longer receives old push notifications
      await messaging().deleteToken().catch(err => console.warn('Failed to delete local FCM token:', err));
    }
  } catch (err) {
    console.warn('Error fetching FCM token on logout:', err);
  }
  return firebaseAuth().signOut();
};

/**
 * Sends a TRAI DLT-compliant SMS OTP via the custom Cloud Function backend
 */
export const sendPhoneOtp = async (phoneNumber: string): Promise<{ success: boolean; message: string }> => {
  const functions = getFunctions(app, 'asia-south1');
  const sendCustomOtp = httpsCallable(functions, 'sendCustomOtp');
  const response = await sendCustomOtp({ phoneNumber });
  return response.data as { success: boolean; message: string };
};

/**
 * Verifies the 6-digit OTP and authenticates with Firebase using a minted Custom Token
 */
export const verifyPhoneOtp = async (phoneNumber: string, otp: string): Promise<FirebaseAuthTypes.UserCredential> => {
  const functions = getFunctions(app, 'asia-south1');
  const verifyCustomOtp = httpsCallable(functions, 'verifyCustomOtp');
  const response = await verifyCustomOtp({ phoneNumber, otp });
  const data = response.data as { success: boolean; customToken: string; uid: string };

  if (!data?.customToken) {
    throw new Error('Failed to retrieve authentication token from verification service');
  }

  return firebaseAuth().signInWithCustomToken(data.customToken);
};
