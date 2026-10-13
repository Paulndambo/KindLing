import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getSecret = (key: string) => Platform.OS === 'web'
  ? Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key))
  : SecureStore.getItemAsync(key);

export const setSecret = (key: string, value: string) => Platform.OS === 'web'
  ? Promise.resolve(typeof localStorage === 'undefined' ? undefined : localStorage.setItem(key, value))
  : SecureStore.setItemAsync(key, value);

export const deleteSecret = (key: string) => Platform.OS === 'web'
  ? Promise.resolve(typeof localStorage === 'undefined' ? undefined : localStorage.removeItem(key))
  : SecureStore.deleteItemAsync(key);
