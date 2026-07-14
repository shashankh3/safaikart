import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../../app/config/firebase';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo';

export async function requestNotificationPermission() {
  console.log('Push notifications bypassed for Expo Go testing.');
  return false;
}

export async function getFcmToken() {
  return null;
}

export async function saveFcmToken(token: string) {
  return;
}

export function setupNotificationListeners(
  onNotificationReceived: any,
  onNotificationResponse: any
) {
  return () => {};
}

