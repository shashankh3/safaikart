import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions } from '@react-native-firebase/functions';
import { getStorage } from '@react-native-firebase/storage';

// In React Native Firebase, the default app is initialized automatically from google-services.json
const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, 'asia-south1');
const storage = getStorage(app);

export { app, db, auth, functions, storage };
