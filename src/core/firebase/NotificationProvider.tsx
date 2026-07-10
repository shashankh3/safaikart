import React, { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission, getFcmToken, saveFcmToken, setupNotificationListeners } from './messaging';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../app/config/firebase';

export const NotificationContext = React.createContext<{
  pushToken: string | null;
}>({
  pushToken: null,
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

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

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Show custom in-app banner or let system handle it
      console.log('Foreground notification:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Navigate to tracking screen here if needed using a global navigation ref
    });

    return () => {
      unsubscribeAuth();
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ pushToken }}>
      {children}
    </NotificationContext.Provider>
  );
};
