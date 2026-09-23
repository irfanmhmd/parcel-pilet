import AsyncStorage from '@react-native-async-storage/async-storage';
import { getParcels, Parcel } from './parcelStorage';

const HISTORY_KEY = '@history_days';
const LAST_ACTIVE_DATE_KEY = '@last_active_date';
const TODAY_CALLS_KEY = '@total_calls';
const PARCELS_KEY = '@parcels'; // from parcelStorage

export interface DaySummary {
  date: string;
  totalScanned: number;
  delivered: number;
  pending: number;
  returned: number;
  totalCalls: number;
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const getHistory = async (): Promise<DaySummary[]> => {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (err) {
    console.error('Failed to get history storage:', err);
    return [];
  }
};

export const getTodayCallCount = async (): Promise<number> => {
  try {
    const count = await AsyncStorage.getItem(TODAY_CALLS_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (err) {
    console.error('Failed to get today calls:', err);
    return 0;
  }
};

export const incrementCallCount = async (): Promise<void> => {
  try {
    const current = await getTodayCallCount();
    await AsyncStorage.setItem(TODAY_CALLS_KEY, (current + 1).toString());
  } catch (err) {
    console.error('Failed to increment calls:', err);
  }
};

export const clearTodayParcels = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PARCELS_KEY);
    await AsyncStorage.setItem(TODAY_CALLS_KEY, '0');
  } catch (err) {
    console.error('Failed to clear today parcels:', err);
  }
};

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
};

export const checkAndArchive = async (): Promise<void> => {
  try {
    const todayStr = getTodayDateString();
    const lastActiveDate = await AsyncStorage.getItem(LAST_ACTIVE_DATE_KEY);

    if (!lastActiveDate) {
      // First time running this new feature
      await AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayStr);
      return;
    }

    if (lastActiveDate !== todayStr) {
      // It's a new day! Archive yesterday's parcels
      const parcels = await getParcels();
      
      // We only archive if there were actually parcels or calls yesterday
      const totalCalls = await getTodayCallCount();
      
      if (parcels.length > 0 || totalCalls > 0) {
        const delivered = parcels.filter(p => p.status === 'Delivered').length;
        const returned = parcels.filter(p => p.status === 'Returned').length;
        const pending = parcels.filter(p => p.status === 'Pending' || p.status === 'In Transit').length;

        const summary: DaySummary = {
          date: lastActiveDate,
          totalScanned: parcels.length,
          delivered,
          pending,
          returned,
          totalCalls,
        };

        const history = await getHistory();
        history.unshift(summary); // Add to beginning
        
        // Keep only last 7 days
        if (history.length > 7) {
          history.length = 7;
        }

        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      }

      // Reset today's active data
      await clearTodayParcels();
      // Update last active date to today
      await AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayStr);
    }
  } catch (err) {
    console.error('Failed during checkAndArchive:', err);
  }
};
