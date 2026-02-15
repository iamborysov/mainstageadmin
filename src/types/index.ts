export interface RoomTariff {
  // Будні до 17:00
  weekdayDayPrice: number;
  weekdayDayResidentPrice: number;
  // Будні після 17:00 та вихідні
  weekdayEveningPrice: number;
  weekdayEveningResidentPrice: number;
}

export interface Room {
  id: string;
  name: string;
  tariffs: RoomTariff;
}

export interface Equipment {
  id: string;
  name: string;
  pricePerHour: number;
}

export interface EquipmentBooking {
  equipmentId: string;
  hours: number;
}

export interface RoomBooking {
  roomId: string;
  hours: number;
}

export interface Booking {
  id: string;
  bandName: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomBookings?: RoomBooking[]; // для бронювання декількох кімнат
  isResident: boolean;
  equipment: string[]; // масив ID обладнання (для зворотної сумісності)
  equipmentBookings?: EquipmentBooking[]; // обладнання з окремими годинами
  paymentType: PaymentType;
  mixedPayment?: MixedPayment; // для змішаної оплати
  totalHours: number;
  equipmentHours?: number; // загальні години обладнання (якщо окремо від кімнати)
  totalPrice: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  source?: 'telegram' | 'manual'; // telegram - з веб-апп, manual - додано адміном
  // Статус щодо звіту
  reportStatus?: 'pending' | 'reported' | 'rejected';
  reportId?: string;
  // Статус бронювання
  status?: 'active' | 'cancelled';
  cancelledAt?: string;
  cancelledBy?: string;
  // Для Telegram повідомлень
  telegramUserId?: number;
  telegramNotificationSent?: boolean;
}

export interface PaymentReport {
  id: string;
  bookingId: string;
  bandName: string;
  date: string;
  hours: number;
  roomPrice: number;
  equipmentPrice: number;
  totalPrice: number;
  paymentType: 'cash' | 'card' | 'transfer' | 'other';
  isResident: boolean;
  roomName: string;
  equipmentNames: string[];
}

export type PaymentType = 'cash' | 'card' | 'mixed';

export interface MixedPayment {
  cashAmount: number;
  cardAmount: number;
}

export const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'cash', label: 'Готівка' },
  { value: 'card', label: 'Картка' },
  { value: 'mixed', label: 'Готівка + Картка' },
];

export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'standart',
    name: 'Standart',
    tariffs: {
      weekdayDayPrice: 230,           // Будні до 17:00
      weekdayDayResidentPrice: 190,   // Будні до 17:00 резидент
      weekdayEveningPrice: 280,       // Будні після 17:00 та вихідні
      weekdayEveningResidentPrice: 230, // Будні після 17:00 та вихідні резидент
    }
  },
  {
    id: 'main',
    name: 'Main',
    tariffs: {
      weekdayDayPrice: 270,           // Будні до 17:00
      weekdayDayResidentPrice: 220,   // Будні до 17:00 резидент
      weekdayEveningPrice: 330,       // Будні після 17:00 та вихідні
      weekdayEveningResidentPrice: 270, // Будні після 17:00 та вихідні резидент
    }
  },
];

// Для зворотної сумісності - буде оновлюватися з localStorage/Firebase
export let ROOMS: Room[] = [...DEFAULT_ROOMS];

// Функція для оновлення цін на кімнати
export const updateRoomPrices = (rooms: Room[]) => {
  ROOMS = rooms;
};

export const EQUIPMENT: Equipment[] = [
  { id: 'guitar', name: 'Електро-гітара', pricePerHour: 100 },
  { id: 'bass', name: 'Бас-гітара', pricePerHour: 100 },
  { id: 'cymbals', name: 'Тарілки', pricePerHour: 100 },
  { id: 'cymbal-one', name: 'Тарілка одна', pricePerHour: 50 },
];
