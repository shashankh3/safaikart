import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@/lib/firebase";
import { normaliseRole, type Role } from "@/lib/rbac";

export type AdminProfile = {
  uid: string;
  email: string | null;
  name?: string;
  photoURL?: string;
  role: Role;
};

type AuthContextValue = {
  user: User | null;
  admin: AdminProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Admin gate is ENFORCED. Every signed-in user must have a document at
// `adminUsers/{uid}` in Firestore, or they are signed out immediately.
const DEV_BYPASS_ADMIN_CHECK = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (!u) {
        setUser(null);
        setAdmin(null);
        setLoading(false);
        return;
      }
      try {
        let data: Partial<AdminProfile> = {};
        if (!DEV_BYPASS_ADMIN_CHECK) {
          const tokenResult = await u.getIdTokenResult();
          if (tokenResult.claims.admin !== true) {
            await signOut(auth);
            setUser(null);
            setAdmin(null);
            setLoading(false);
            throw new Error("Unauthorized: your account is not an admin.");
          }
          
          const db = getDb();
          const snap = await getDoc(doc(db, "adminUsers", u.uid));
          if (snap.exists()) {
             data = snap.data() as Partial<AdminProfile>;
          }
        }
        setUser(u);
        setAdmin({
          uid: u.uid,
          email: u.email,
          name: data.name || u.displayName || u.email?.split("@")[0] || "Admin",
          photoURL: data.photoURL || u.photoURL || undefined,
          role: normaliseRole((data as { role?: string }).role),
        });
      } catch (err) {
        console.error(err);
        setUser(null);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      admin,
      loading,
      async signIn(email, password) {
        const auth = getFirebaseAuth();
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (DEV_BYPASS_ADMIN_CHECK) return;
        
        // Force token refresh to pick up claims if they were just set
        const tokenResult = await cred.user.getIdTokenResult(true);
        if (tokenResult.claims.admin !== true) {
          await signOut(auth);
          throw new Error("Unauthorized Access: this account is not an admin.");
        }
      },
      async logout() {
        await signOut(getFirebaseAuth());
      },
    }),
    [user, admin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
