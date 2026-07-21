import { useState, useEffect } from 'react';
import {FirebaseAuthTypes} from '@react-native-firebase/auth';
import { setupAuthListener, logoutUser } from '../../../core/firebase/auth';
import {doc, getDoc} from '@react-native-firebase/firestore';
import { db } from '../../../app/config/firebase';

import { CartStorage } from '../../cart/infrastructure/CartStorage';

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = setupAuthListener(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsBlocked(data?.isBlocked === true);
          } else {
            setIsBlocked(false);
          }

          const tokenResult = await firebaseUser.getIdTokenResult();
          setIsAdmin(!!tokenResult.claims.admin);
        } catch (e) {
          setIsAdmin(false);
          setIsBlocked(false);
        }
      } else {
        setIsAdmin(false);
        setIsBlocked(false);
        // Clear local cart storage when session drops
        CartStorage.clearLocal().catch(() => {});
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, isAdmin, isBlocked, logout: logoutUser };
};
