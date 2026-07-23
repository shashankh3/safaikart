import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@/lib/firebase";
import { normaliseRole, type Role } from "@/lib/rbac";

export type AdminProfile = {
  uid: string;
  email: string | null;
  name?: string;
  photoURL?: string;
  role: Role;
};

export type CustomerProfile = {
  uid: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  photoURL?: string;
  isBlocked?: boolean;
};

type AuthContextValue = {
  user: User | null;
  admin: AdminProfile | null;
  customer: CustomerProfile | null;
  role: "admin" | "customer" | "error" | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<{ role: "admin" | "customer" }>;
  signUpEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  startPhoneOtp: (phoneE164: string, recaptchaContainerId: string) => Promise<ConfirmationResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureCustomerDoc(u: User): Promise<CustomerProfile> {
  const db = getDb();
  const ref = doc(db, "profiles", u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data() as any;
    return {
      uid: u.uid,
      name: d.displayName || d.name || u.displayName || undefined,
      email: d.email ?? u.email,
      phone: d.phoneNumber ?? d.phone ?? u.phoneNumber,
      photoURL: d.photoURL || u.photoURL || undefined,
      isBlocked: d.isBlocked === true,
    };
  }
  const seed = {
    userId: u.uid,
    uid: u.uid,
    displayName: u.displayName || (u.email ? u.email.split("@")[0] : "Customer"),
    name: u.displayName || (u.email ? u.email.split("@")[0] : "Customer"),
    email: u.email || null,
    phoneNumber: u.phoneNumber || null,
    phone: u.phoneNumber || null,
    photoURL: u.photoURL || null,
    isBlocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, seed);
  return {
    uid: u.uid,
    name: seed.name,
    email: seed.email,
    phone: seed.phone,
    photoURL: seed.photoURL || undefined,
    isBlocked: seed.isBlocked,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let adminUnsub: (() => void) | undefined;

    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (adminUnsub) {
        adminUnsub();
        adminUnsub = undefined;
      }

      if (!u) {
        setUser(null);
        setAdmin(null);
        setCustomer(null);
        setLoading(false);
        return;
      }

      try {
        const db = getDb();
        adminUnsub = onSnapshot(doc(db, "adminUsers", u.uid), async (adminSnap) => {
          try {
            if (adminSnap.exists()) {
              const data = adminSnap.data() as Partial<AdminProfile>;
              const role = normaliseRole((data as { role?: string }).role);

              if (role) {
                setUser(u);
                setAdmin({
                  uid: u.uid,
                  email: u.email,
                  name: data.name || u.displayName || u.email?.split("@")[0] || "Admin",
                  photoURL: data.photoURL || u.photoURL || undefined,
                  role,
                });
                setCustomer(null);
                setLoading(false);
              } else {
                const cust = await ensureCustomerDoc(u);
                setUser(u);
                setAdmin(null);
                setCustomer(cust);
                setLoading(false);
              }
            } else {
              const cust = await ensureCustomerDoc(u);
              setUser(u);
              setAdmin(null);
              setCustomer(cust);
              setLoading(false);
            }
          } catch (callbackErr: any) {
            console.error("Auth snapshot callback error:", callbackErr);
            setError(callbackErr);
            setUser(u);
            setAdmin(null);
            setCustomer(null);
            setLoading(false);
          }
        }, async (err: any) => {
          if (err.code === "permission-denied") {
            try {
              const cust = await ensureCustomerDoc(u);
              setUser(u);
              setAdmin(null);
              setCustomer(cust);
              setError(null);
              setLoading(false);
            } catch (custErr: any) {
              console.error("Customer fallback error:", custErr);
              setError(custErr);
              setUser(u);
              setAdmin(null);
              setCustomer(null);
              setLoading(false);
            }
          } else {
            console.error("Admin snapshot error:", err);
            setError(err);
            setUser(u);
            setAdmin(null);
            setCustomer(null);
            setLoading(false);
          }
        });
      } catch (err: any) {
        console.error("Auth context error:", err);
        setError(err);
        setUser(u);
        setAdmin(null);
        setCustomer(null);
        setLoading(false);
      }
    });
    return () => {
      unsub();
      if (adminUnsub) adminUnsub();
    };
  }, []);

  const role: "admin" | "customer" | "error" | null = error ? "error" : admin ? "admin" : customer ? "customer" : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      admin,
      customer,
      role,
      loading,
      error,
      async signIn(email, password) {
        const auth = getFirebaseAuth();
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const db = getDb();
        try {
          const snap = await getDoc(doc(db, "adminUsers", cred.user.uid));
          return { role: snap.exists() ? "admin" : "customer" };
        } catch (e: any) {
          if (e.code === 'permission-denied') return { role: "customer" };
          throw e;
        }
      },
      async signUpEmail(email, password, name) {
        const auth = getFirebaseAuth();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = name?.trim() || email.split("@")[0] || "Customer";
        if (displayName) await updateProfile(cred.user, { displayName });
        await setDoc(
          doc(getDb(), "profiles", cred.user.uid),
          {
            displayName,
            name: displayName,
            email: cred.user.email || email,
            phoneNumber: cred.user.phoneNumber || null,
            phone: cred.user.phoneNumber || null,
            photoURL: cred.user.photoURL || null,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      },
      async signInWithGoogle() {
        const auth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        
        // Use redirect on mobile to avoid popup blockers, especially in in-app browsers
        const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
        if (isMobile) {
          const { signInWithRedirect } = await import("firebase/auth");
          await signInWithRedirect(auth, provider);
        } else {
          await signInWithPopup(auth, provider);
        }
      },
      async startPhoneOtp(phoneE164, recaptchaContainerId) {
        const auth = getFirebaseAuth();
        const w = window as unknown as { __skRecaptcha?: RecaptchaVerifier };

        if (w.__skRecaptcha) {
          try {
            w.__skRecaptcha.clear();
          } catch (_) { }
          w.__skRecaptcha = undefined;
        }

        const containerEl = document.getElementById(recaptchaContainerId);
        if (!containerEl) {
          throw new Error(`reCAPTCHA container #${recaptchaContainerId} not found in DOM`);
        }

        const verifier = new RecaptchaVerifier(auth, containerEl, {
          size: "normal",
          callback: () => {
            console.log("reCAPTCHA checkbox solved successfully");
          },
          "expired-callback": () => {
            console.warn("reCAPTCHA expired");
          }
        });

        await verifier.render();
        w.__skRecaptcha = verifier;

        try {
          return await signInWithPhoneNumber(auth, phoneE164, verifier);
        } catch (phoneErr: any) {
          console.error("signInWithPhoneNumber failed:", phoneErr);
          throw phoneErr;
        }
      },
      async logout() {
        await signOut(getFirebaseAuth());
      },
    }),
    [user, admin, customer, role, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
