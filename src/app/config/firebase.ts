import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Placeholder Firebase configuration
// REPLACE these values when setting up the actual Firebase project
const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "safaikart-placeholder.firebaseapp.com",
  projectId: "safaikart-placeholder",
  storageBucket: "safaikart-placeholder.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:placeholder123",
  measurementId: "G-PLACEHOLDER"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

export { app, db, auth };
