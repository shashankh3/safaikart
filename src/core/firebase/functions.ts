import { functions } from '../../app/config/firebase';
import { httpsCallable } from 'firebase/functions';

export const callFunction = <T, R>(name: string) => httpsCallable<T, R>(functions, name);
