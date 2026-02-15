// Типи для внутрішнього графіка роботи

export interface WorkingHours {
  // День тижня: 0 = неділя, 1 = понеділок, ..., 6 = субота
  dayOfWeek: number;
  // Час відкриття (наприклад, "10:00")
  openTime: string;
  // Час закриття (наприклад, "23:00")
  closeTime: string;
  // Чи працюємо цього дня
  isOpen: boolean;
}

export interface ScheduleSettings {
  // Графік по днях тижня
  workingHours: WorkingHours[];
  // Тривалість репетиції за замовчуванням (годин)
  defaultDuration: number;
  // Час між репетиціями (хвилин)
  bufferMinutes: number;
}

export const DEFAULT_SCHEDULE: ScheduleSettings = {
  workingHours: [
    { dayOfWeek: 1, openTime: '10:00', closeTime: '23:00', isOpen: true },   // Пн
    { dayOfWeek: 2, openTime: '10:00', closeTime: '23:00', isOpen: true },   // Вт
    { dayOfWeek: 3, openTime: '10:00', closeTime: '23:00', isOpen: true },   // Ср
    { dayOfWeek: 4, openTime: '10:00', closeTime: '23:00', isOpen: true },   // Чт
    { dayOfWeek: 5, openTime: '10:00', closeTime: '23:00', isOpen: true },   // Пт
    { dayOfWeek: 6, openTime: '10:00', closeTime: '23:00', isOpen: true },   // Сб
    { dayOfWeek: 0, openTime: '10:00', closeTime: '23:00', isOpen: true },   // Нд
  ],
  defaultDuration: 2,
  bufferMinutes: 0,
};

// Допоміжна функція для отримання графіку на конкретний день
export function getWorkingHoursForDay(settings: ScheduleSettings, dayOfWeek: number): WorkingHours | null {
  const day = settings.workingHours.find(d => d.dayOfWeek === dayOfWeek);
  return day?.isOpen ? day : null;
}

// Генерація часових слотів для дня
export function generateTimeSlots(
  workingHours: WorkingHours,
  durationHours: number,
  existingBookings: { startTime: string; endTime: string }[]
): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  
  const [openHour, openMinute] = workingHours.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = workingHours.closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const durationMinutes = durationHours * 60;
  
  // Генеруємо слоти з кроком 1 година
  for (let minutes = openMinutes; minutes + durationMinutes <= closeMinutes; minutes += 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    
    // Перевіряємо чи слот вільний
    const slotEndMinutes = minutes + durationMinutes;
    const slotEndTime = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}`;
    
    const isAvailable = !existingBookings.some(booking => {
      return timeStr < booking.endTime && slotEndTime > booking.startTime;
    });
    
    slots.push({ time: timeStr, available: isAvailable });
  }
  
  return slots;
}
