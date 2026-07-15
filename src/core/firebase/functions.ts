import { functions } from '../../app/config/firebase';
import { httpsCallable } from '@react-native-firebase/functions';

export const callFunction = <T, R>(name: string) => httpsCallable<T, R>(functions, name);
