// Типи для звітів
import type { PaymentType, MixedPayment, RoomBooking } from '@/types';

export interface ReportEntry {
  id: string;
  // Посилання на оригінальне бронювання (якщо є)
  bookingId?: string;
  // Дані для звіту
  bandName: string;
  date: string;
  roomId: string;
  roomName: string;
  roomBookings?: RoomBooking[]; // для бронювання декількох кімнат
  startTime: string;
  endTime: string;
  totalHours: number;
  totalPrice: number;
  paymentType: PaymentType;
  mixedPayment?: MixedPayment; // для змішаної оплати
  isResident: boolean;
  equipmentPrice: number;
  roomPrice: number;
  // Обладнання
  equipment: string[];
  equipmentHours?: number;
  equipmentBookings?: { equipmentId: string; hours: number }[];
  // Хто створив запис
  createdBy: string;
  createdAt: string;
  // Джерело: 'telegram' | 'manual'
  source: string;
  // Примітки
  notes?: string;
}

// Статус бронювання щодо звіту
export type ReportStatus = 'pending' | 'reported' | 'rejected';

// Розширення Booking
export interface BookingWithReportStatus {
  reportStatus?: ReportStatus;
  reportId?: string;
}
