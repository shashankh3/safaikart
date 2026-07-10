import { Timestamp } from 'firebase/firestore';

export interface Address {
  id: string;
  userId: string;
  label: string;
  name: string;
  phoneNumber: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  geo?: { lat: number; lng: number };
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AddressDraft = Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
