import { useState, useEffect } from 'react';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { db } from '../../../app/config/firebase';

export interface AppConfig {
  maintenanceMode: boolean;
  minAppVersion: number;
  deliveryFeeMinor: number;
  [key: string]: any;
}

export const useAppConfig = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const d = await getDoc(doc(db, 'appConfig', 'public'));
        if (d.exists) {
          setConfig(d.data() as AppConfig);
        }
      } catch (e) {
        console.warn('Failed to fetch app config', e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);
  
  return { config, loading };
};
