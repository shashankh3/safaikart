import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { db } from '../../../app/config/firebase';

export interface AppConfig {
  maintenanceMode: boolean;
  minAppVersion: string;
  deliveryFeeMinor: number;
  [key: string]: any;
}

export const fetchAppConfig = async (): Promise<AppConfig | null> => {
  try {
    const d = await getDoc(doc(db, 'appConfig', 'public'));
    if (d.exists) {
      return d.data() as AppConfig;
    }
  } catch (e) {
    console.warn('Failed to fetch app config', e);
  }
  return null;
};

export const useAppConfig = () => {
  const { data: config, isLoading: loading } = useQuery({
    queryKey: ['appConfig'],
    queryFn: fetchAppConfig,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours cache
  });
  
  return { config, loading };
};
