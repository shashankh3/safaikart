import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../../app/config/firebase';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermission() {
  if (isExpoGo) {
    console.log('Push notifications are not supported in Expo Go.');
    return false;
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return false;
  }

  const { status: existingStatus } = (await Notifications.getPermissionsAsync()) || {};
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }
  
  return true;
}

export async function getFcmToken() {
  if (isExpoGo) return null;
  
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
    if (!projectId) {
       console.log('Project ID not found in app.json');
    }
    
    // Using expo token or device token based on needs. 
    // For direct FCM from CF, device push token is often required if sending to native FCM HTTP v1.
    // However, if we use Expo's Push API, we need getExpoPushTokenAsync.
    // The user's CF uses admin.messaging().sendMulticast, which requires Native FCM tokens.
    const tokenData = await Notifications.getDevicePushTokenAsync();
    return tokenData.data;
  } catch (e) {
    console.log('Error getting push token:', e);
    return null;
  }
}

export async function saveFcmToken(token: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  
  try {
    const saveTokenFn = httpsCallable(getFunctions(), 'saveFcmToken');
    await saveTokenFn({ token, platform: Platform.OS });
    console.log('FCM Token saved successfully');
  } catch (e) {
    console.log('Failed to save FCM token', e);
  }
}

export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}
