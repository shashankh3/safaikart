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

  return { user, loading, logout: logoutUser };
};
