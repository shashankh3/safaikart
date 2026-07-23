import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '../../app/config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}

export async function getFcmToken() {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export async function saveFcmToken(token: string) {
  try {
    const saveTokenCallable = httpsCallable(functions, 'saveFcmToken');
    await saveTokenCallable({ token });
  } catch (error) {
    console.error('Failed to save FCM token:', error);
  }
}

export function setupNotificationListeners(
  onNotificationReceived: (notification: any) => void,
  onNotificationResponse: (response: any) => void
) {
  const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
    // Show local notification when app is in foreground
    if (remoteMessage.notification) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title,
          body: remoteMessage.notification.body,
          data: remoteMessage.data,
        },
        trigger: null,
      });
    }
    onNotificationReceived(remoteMessage);
  });

  const unsubscribeOnNotificationResponse = Notifications.addNotificationResponseReceivedListener(response => {
    onNotificationResponse(response);
  });

  // Handle background/quit state opens
  messaging().onNotificationOpenedApp(remoteMessage => {
    onNotificationResponse({ notification: { request: { content: { data: remoteMessage.data } } } });
  });

  messaging().getInitialNotification().then(remoteMessage => {
    if (remoteMessage) {
      onNotificationResponse({ notification: { request: { content: { data: remoteMessage.data } } } });
    }
  });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnNotificationResponse.remove();
  };
}
