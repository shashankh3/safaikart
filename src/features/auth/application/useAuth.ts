import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { setupAuthListener, logoutUser } from '../../../core/firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = setupAuthListener((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === process.env.EXPO_PUBLIC_ADMIN_EMAIL;

  return { user, loading, isAdmin, logout: logoutUser };
};
