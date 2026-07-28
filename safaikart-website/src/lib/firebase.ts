import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// SafaiKart Firebase config. apiKey is publishable (safe in client code).
console.log("DEBUG: VITE_FIREBASE_API_KEY is", import.meta.env.VITE_FIREBASE_API_KEY);
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "safaikart-6c4e4.firebaseapp.com",
  projectId: "safaikart-6c4e4",
  storageBucket: "safaikart-6c4e4.firebasestorage.app",
  messagingSenderId: "1050255060517",
  appId: "1:1050255060517:web:eb8f4dd4c7305050f119cc",
  measurementId: "G-7FXWW2QRHL",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _functions: Functions | null = null;
let _storage: FirebaseStorage | null = null;

import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

function ensureApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  if (typeof window !== 'undefined') {
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'RECAPTCHA_V3_SITE_KEY_PLACEHOLDER';

    // Skip App Check entirely on localhost — it conflicts with Phone Auth's reCAPTCHA
    if (!isLocalhost && siteKey !== 'RECAPTCHA_V3_SITE_KEY_PLACEHOLDER') {
      initializeAppCheck(_app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true
      });
    }
  }

  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(ensureApp());
  }
  return _auth;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(ensureApp());
  return _db;
}

export function getFns(): Functions {
  if (!_functions) _functions = getFunctions(ensureApp(), "asia-south1");
  return _functions;
}

export function getBucket(): FirebaseStorage {
  if (!_storage) _storage = getStorage(ensureApp());
  return _storage;
}
