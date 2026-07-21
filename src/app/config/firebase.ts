import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions } from '@react-native-firebase/functions';
import { getStorage } from '@react-native-firebase/storage';
import { Platform } from 'react-native';

const app = getApp();
const db = getFirestore(app);

// Catalog prices must never be stale — admin updates must show immediately on Android
if (Platform.OS !== 'web') {
  (db as any).settings({
    persistence: false,
  });
}

const auth = getAuth(app);
const functions = getFunctions(app, 'asia-south1');
const storage = getStorage(app);

export { app, db, auth, functions, storage };
