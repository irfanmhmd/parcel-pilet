import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@parcels';

export type ParcelStatus = 'Pending' | 'Delivered' | 'Returned' | 'In Transit';

export interface Parcel {
  id: string;
  trackingId: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  status: ParcelStatus;
  notes: string;
  photoUri: string | null;
  createdAt: string;
}

export const generateId = () => `#PL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const getParcels = async (): Promise<Parcel[]> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (err) {
    console.error('Failed to parse parcels storage:', err);
    return [];
  }
};

export const saveParcel = async (parcel: Parcel): Promise<void> => {
  const parcels = await getParcels();
  const index = parcels.findIndex(p => p.id === parcel.id);
  if (index >= 0) {
    parcels[index] = parcel;
  } else {
    parcels.unshift(parcel);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parcels));
};

export const deleteParcel = async (id: string): Promise<void> => {
  const parcels = await getParcels();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parcels.filter(p => p.id !== id)));
};
