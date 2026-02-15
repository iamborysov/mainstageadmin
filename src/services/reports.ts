// Сервіс для роботи зі звітами

import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import type { ReportEntry } from '@/types/report';
import type { Booking } from '@/types';

const REPORTS_COLLECTION = 'reports';

// Додати запис у звіт
export async function addToReport(
  booking: Booking,
  adminEmail: string
): Promise<string> {
  // Розрахунок ціни кімнат
  const roomPrice = booking.roomBookings?.reduce((sum, rb) => {
    const room = rb.roomId === 'standart' ? 
      { name: 'Standart', price: 250 } : 
      { name: 'Main', price: 300 };
    return sum + (rb.hours * room.price);
  }, 0) || (booking.totalPrice - (booking.equipmentBookings?.reduce((sum, eq) => {
    return sum + (eq.hours * 100);
  }, 0) || 0));

  // Формуємо дані без undefined значень, явно перетворюємо в числа
  const reportData: any = {
    bookingId: booking.id,
    bandName: booking.bandName,
    date: booking.date,
    roomId: booking.roomId,
    roomName: booking.roomId === 'standart' ? 'Standart' : 'Main',
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalHours: Number(booking.totalHours),
    totalPrice: Number(booking.totalPrice),
    paymentType: booking.paymentType,
    isResident: booking.isResident,
    equipmentPrice: Number(booking.equipmentBookings?.reduce((sum, eq) => sum + (eq.hours * 100), 0) || 0),
    roomPrice: Number(roomPrice),
    equipment: booking.equipment || [],
    equipmentHours: Number(booking.equipmentHours || 0),
    equipmentBookings: booking.equipmentBookings || [],
    createdBy: adminEmail,
    createdAt: new Date().toISOString(),
    source: booking.source || 'manual',
    notes: booking.notes || null,
  };

  // Додаємо опціональні поля тільки якщо вони визначені
  if (booking.roomBookings && booking.roomBookings.length > 0) {
    reportData.roomBookings = booking.roomBookings;
  }
  
  if (booking.paymentType === 'mixed' && booking.mixedPayment) {
    reportData.mixedPayment = booking.mixedPayment;
  }

  try {
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
    console.log('Report created with ID:', docRef.id);
    
    // Оновлюємо бронювання - позначаємо як додане в звіт
    if (booking.id) {
      try {
        await updateDoc(doc(db, 'bookings', booking.id), {
          reportStatus: 'reported',
          reportId: docRef.id,
        });
        console.log('Booking updated with report status');
      } catch (updateError) {
        console.error('Error updating booking (non-critical):', updateError);
        // Не кидаємо помилку, бо звіт вже створено
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error in addToReport:', error);
    throw error;
  }
}

// Видалити запис зі звіту
export async function removeFromReport(
  reportId: string,
  bookingId?: string
): Promise<void> {
  await deleteDoc(doc(db, REPORTS_COLLECTION, reportId));
  
  // Оновлюємо бронювання - знімаємо позначку
  if (bookingId) {
    await updateDoc(doc(db, 'bookings', bookingId), {
      reportStatus: 'pending',
      reportId: null,
    });
  }
}

// Підписка на звіти
export function subscribeToReports(
  callback: (reports: ReportEntry[]) => void
) {
  const q = query(collection(db, REPORTS_COLLECTION));
  
  return onSnapshot(q, (snapshot) => {
    const reports: ReportEntry[] = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() } as ReportEntry);
    });
    callback(reports);
  });
}

// Отримати звіти за місяць
export async function getReportsByMonth(
  year: number,
  month: number
): Promise<ReportEntry[]> {
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
  
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where('date', '>=', startOfMonth),
    where('date', '<=', endOfMonth)
  );
  
  const snapshot = await getDocs(q);
  const reports: ReportEntry[] = [];
  snapshot.forEach((doc) => {
    reports.push({ id: doc.id, ...doc.data() } as ReportEntry);
  });
  
  return reports;
}
