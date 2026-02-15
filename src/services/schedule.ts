// Сервіс для роботи з графіком роботи (замість Google Calendar)

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { ScheduleSettings } from '@/types/schedule';
import { DEFAULT_SCHEDULE } from '@/types/schedule';

const SCHEDULE_DOC_ID = 'main';

// Отримати графік роботи
export async function getSchedule(): Promise<ScheduleSettings> {
  try {
    const docRef = doc(db, 'schedule', SCHEDULE_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as ScheduleSettings;
    }
    
    // Якщо немає — створюємо за замовчуванням
    await setDoc(docRef, DEFAULT_SCHEDULE);
    return DEFAULT_SCHEDULE;
  } catch (error) {
    console.error('Error getting schedule:', error);
    return DEFAULT_SCHEDULE;
  }
}

// Оновити графік роботи (тільки для овнера)
export async function updateSchedule(settings: ScheduleSettings): Promise<void> {
  const docRef = doc(db, 'schedule', SCHEDULE_DOC_ID);
  await setDoc(docRef, settings);
}

// Підписка на зміни графіка
export function subscribeToSchedule(callback: (settings: ScheduleSettings) => void) {
  const docRef = doc(db, 'schedule', SCHEDULE_DOC_ID);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as ScheduleSettings);
    } else {
      callback(DEFAULT_SCHEDULE);
    }
  });
}

// Ініціалізація графіка (викликати при старті)
export async function initializeSchedule(): Promise<void> {
  const docRef = doc(db, 'schedule', SCHEDULE_DOC_ID);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    await setDoc(docRef, DEFAULT_SCHEDULE);
  }
}
