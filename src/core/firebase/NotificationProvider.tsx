import React, { useEffect, useRef, useState } from 'react';
import { requestNotificationPermission, getFcmToken, saveFcmToken, setupNotificationListeners } from './messaging';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../app/config/firebase';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const NotificationContext = React.createContext<{
  pushToken: string | null;
}>({
  pushToken: null,
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    const initNotifications = async (uid: string) => {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        const token = await getFcmToken();
        if (token) {
          setPushToken(token);
          await saveFcmToken(token);
        }
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        initNotifications(user.uid);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ pushToken }}>
      {children}
    </NotificationContext.Provider>
  );
};

