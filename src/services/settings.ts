// Сервіс для зберігання налаштувань (ціни на кімнати, обладнання тощо)
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { Room, Equipment } from '@/types';
import { DEFAULT_ROOMS, updateRoomPrices as updateGlobalRoomPrices, EQUIPMENT } from '@/types';

const SETTINGS_DOC_ID = 'app_settings';
const SETTINGS_COLLECTION = 'settings';

export interface AppSettings {
  rooms: Room[];
  equipment: Equipment[];
  updatedAt: string;
}

const defaultSettings: AppSettings = {
  rooms: DEFAULT_ROOMS,
  equipment: EQUIPMENT,
  updatedAt: new Date().toISOString(),
};

// Завантаження налаштувань з Firebase
export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const settings = docSnap.data() as AppSettings;
      updateGlobalRoomPrices(settings.rooms);
      return settings;
    }
    
    // Якщо налаштувань немає - створюємо з дефолтними значеннями
    await saveSettings(defaultSettings);
    updateGlobalRoomPrices(defaultSettings.rooms);
    return defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    // Fallback на localStorage
    const localSettings = localStorage.getItem('app_settings');
    if (localSettings) {
      const parsed = JSON.parse(localSettings);
      updateGlobalRoomPrices(parsed.rooms);
      return parsed;
    }
    return defaultSettings;
  }
};

// Збереження налаштувань
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    updateGlobalRoomPrices(settings.rooms);
    // Также зберігаємо в localStorage як backup
    localStorage.setItem('app_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    // Fallback на localStorage
    localStorage.setItem('app_settings', JSON.stringify(settings));
    updateGlobalRoomPrices(settings.rooms);
  }
};

// Підписка на зміни налаштувань (real-time)
export const subscribeToSettings = (callback: (settings: AppSettings) => void) => {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const settings = docSnap.data() as AppSettings;
      updateGlobalRoomPrices(settings.rooms);
      callback(settings);
    } else {
      callback(defaultSettings);
    }
  }, (error) => {
    console.error('Error subscribing to settings:', error);
    // Fallback на localStorage
    const localSettings = localStorage.getItem('app_settings');
    if (localSettings) {
      const parsed = JSON.parse(localSettings);
      updateGlobalRoomPrices(parsed.rooms);
      callback(parsed);
    } else {
      updateGlobalRoomPrices(defaultSettings.rooms);
      callback(defaultSettings);
    }
  });
};

// Оновлення цін на кімнати
export const updateRoomSettings = async (rooms: Room[]): Promise<void> => {
  const currentSettings = await loadSettings();
  await saveSettings({
    ...currentSettings,
    rooms,
  });
};

// Оновлення цін на обладнання
export const updateEquipmentPrices = async (equipment: Equipment[]): Promise<void> => {
  const currentSettings = await loadSettings();
  await saveSettings({
    ...currentSettings,
    equipment,
  });
};
