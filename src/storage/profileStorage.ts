import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@user_profile';

export interface UserProfile {
  name: string;
  photoUri: string | null;
}

const defaultProfile: UserProfile = {
  name: 'Alex Driver',
  photoUri: null,
};

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const json = await AsyncStorage.getItem(PROFILE_KEY);
    return json ? JSON.parse(json) : defaultProfile;
  } catch (err) {
    console.error('Failed to get profile storage:', err);
    return defaultProfile;
  }
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile:', err);
  }
};
