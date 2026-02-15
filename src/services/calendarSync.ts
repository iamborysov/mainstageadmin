// Сервіс для синхронізації Google Calendar з Firestore
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { googleCalendarService, type GoogleCalendarEvent } from './googleCalendar';

const SYNCED_EVENTS_COLLECTION = 'calendar_events';

export interface SyncedCalendarEvent {
  id?: string;
  googleEventId: string;
  calendarId: string;
  calendarName: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  roomType: 'standart' | 'main' | 'other';
  syncedAt: Date;
}

// Конвертація Google події у формат для Firestore
const convertGoogleEvent = (event: GoogleCalendarEvent): Omit<SyncedCalendarEvent, 'id'> | null => {
  const startTime = event.start.dateTime || event.start.date;
  const endTime = event.end?.dateTime || event.end?.date;
  
  if (!startTime) return null;

  // Визначаємо тип кімнати
  const calendarId = event.calendarId || '';
  const calendarName = (event.calendarName || '').toLowerCase();
  let roomType: 'standart' | 'main' | 'other' = 'other';
  
  if (calendarId.includes('main') || calendarName.includes('main')) {
    roomType = 'main';
  } else if (calendarId.includes('standart') || calendarName.includes('standart')) {
    roomType = 'standart';
  }

  return {
    googleEventId: event.id,
    calendarId: event.calendarId || 'primary',
    calendarName: event.calendarName || 'Календар',
    summary: event.summary || 'Без назви',
    description: event.description,
    start: new Date(startTime),
    end: endTime ? new Date(endTime) : new Date(startTime),
    location: event.location,
    roomType,
    syncedAt: new Date(),
  };
};

// Синхронізація подій з Google Calendar
export const syncCalendarEvents = async (
  calendarIds: string[],
  timeMin: Date,
  timeMax: Date,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; errors: number }> => {
  if (!googleCalendarService.isAuthenticated()) {
    throw new Error('Google Calendar не підключено');
  }

  let successCount = 0;
  let errorCount = 0;

  try {
    // Отримуємо події з усіх календарів
    const events = await googleCalendarService.getEventsFromMultipleCalendars(
      timeMin.toISOString(),
      timeMax.toISOString(),
      calendarIds
    );

    console.log(`Syncing ${events.length} events...`);

    // Очищаємо старі події за цей період
    const syncedCollection = collection(db, SYNCED_EVENTS_COLLECTION);
    const oldEventsQuery = query(
      syncedCollection,
      where('start', '>=', Timestamp.fromDate(timeMin)),
      where('start', '<=', Timestamp.fromDate(timeMax))
    );
    const oldEventsSnapshot = await getDocs(oldEventsQuery);
    
    // Видаляємо старі події
    const deletePromises = oldEventsSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, SYNCED_EVENTS_COLLECTION, docSnapshot.id))
    );
    await Promise.all(deletePromises);
    console.log(`Cleared ${oldEventsSnapshot.docs.length} old events`);

    // Додаємо нові події
    const total = events.length;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const syncedEvent = convertGoogleEvent(event);
      
      if (syncedEvent) {
        try {
          await addDoc(syncedCollection, {
            ...syncedEvent,
            start: Timestamp.fromDate(syncedEvent.start),
            end: Timestamp.fromDate(syncedEvent.end),
            syncedAt: Timestamp.fromDate(syncedEvent.syncedAt),
          });
          successCount++;
        } catch (error) {
          console.error('Error adding event:', error);
          errorCount++;
        }
      }
      
      onProgress?.(i + 1, total);
    }

    // Зберігаємо час останньої синхронізації
    localStorage.setItem('last_calendar_sync', new Date().toISOString());
    
    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
};

// Отримання синхронізованих подій з Firestore
export const getSyncedEvents = async (
  timeMin: Date,
  timeMax: Date
): Promise<SyncedCalendarEvent[]> => {
  const syncedCollection = collection(db, SYNCED_EVENTS_COLLECTION);
  const q = query(
    syncedCollection,
    where('start', '>=', Timestamp.fromDate(timeMin)),
    where('start', '<=', Timestamp.fromDate(timeMax))
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      googleEventId: data.googleEventId,
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      summary: data.summary,
      description: data.description,
      start: data.start.toDate(),
      end: data.end.toDate(),
      location: data.location,
      roomType: data.roomType,
      syncedAt: data.syncedAt.toDate(),
    };
  });
};

// Підписка на синхронізовані події (real-time)
import { onSnapshot } from 'firebase/firestore';

export const subscribeToSyncedEvents = (
  timeMin: Date,
  timeMax: Date,
  callback: (events: SyncedCalendarEvent[]) => void
) => {
  const syncedCollection = collection(db, SYNCED_EVENTS_COLLECTION);
  const q = query(
    syncedCollection,
    where('start', '>=', Timestamp.fromDate(timeMin)),
    where('start', '<=', Timestamp.fromDate(timeMax))
  );
  
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        googleEventId: data.googleEventId,
        calendarId: data.calendarId,
        calendarName: data.calendarName,
        summary: data.summary,
        description: data.description,
        start: data.start.toDate(),
        end: data.end.toDate(),
        location: data.location,
        roomType: data.roomType,
        syncedAt: data.syncedAt.toDate(),
      };
    });
    callback(events);
  });
};

// Перевірка чи потрібна синхронізація
export const shouldSync = (): boolean => {
  const lastSync = localStorage.getItem('last_calendar_sync');
  if (!lastSync) return true;
  
  const lastSyncDate = new Date(lastSync);
  const now = new Date();
  const hoursSinceLastSync = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
  
  // Синхронізуємо раз на годину
  return hoursSinceLastSync >= 1;
};
