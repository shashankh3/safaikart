import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import {doc, getDoc} from '@react-native-firebase/firestore';
import { db } from '../../app/config/firebase';
import Constants from 'expo-constants';

export async function checkUpdates() {
  if (__DEV__) return; // Don't run in development

  try {
    const configDoc = await getDoc(doc(db, 'appConfig', 'public'));
    const minAppVersion = configDoc.exists() ? configDoc.data().minAppVersion : '1.0.0';
    const currentVersion = Constants.expoConfig?.version || '1.0.0';

    if (currentVersion < minAppVersion) {
      Alert.alert(
        'Update Required',
        'Your version of SafaiKart is out of date. Please update the app from the Play Store to continue using our services.',
        [{ text: 'Update Now', onPress: () => {} }], // In a real app, open Play Store URL
        { cancelable: false }
      );
      return;
    }

    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert(
        'New Version Available',
        'A new version of SafaiKart is available. Would you like to restart the app to apply the update?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Update', 
            onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            }
          }
        ]
      );
    }
  } catch (error) {
    console.warn('Error checking for updates', error);
  }
}
