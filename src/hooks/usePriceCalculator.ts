import { useMemo } from 'react';
import type { Room, Equipment, EquipmentBooking } from '@/types';
import { isWeekend, parseISO } from 'date-fns';

interface PriceCalculationParams {
  room: Room | null;
  date: string;
  startTime: string;
  endTime: string;
  isResident: boolean;
  selectedEquipment: Equipment[];
  equipmentBookings?: EquipmentBooking[];
  useSeparateEquipmentHours?: boolean;
}

interface PriceCalculationResult {
  totalHours: number;
  equipmentHours: number;
  roomPrice: number;
  equipmentPrice: number;
  totalPrice: number;
  hourlyRate: number;
  isEveningRate: boolean;
  breakdown: {
    roomHourly: number;
    equipmentHourly: number;
  };
}

// Перевірка чи є вечірній тариф (для конкретного часу)
function isEveningTariff(date: string, time: string): boolean {
  const dateObj = parseISO(date);
  const [hours] = time.split(':').map(Number);
  
  // Вихідні та свята - завжди вечірній тариф
  if (isWeekend(dateObj)) {
    return true;
  }
  
  // Будні після 17:00 - вечірній тариф
  if (hours >= 17) {
    return true;
  }
  
  return false;
}

// Розрахунок ціни з урахуванням переходу через 17:00
function calculateMixedRate(
  room: Room,
  date: string,
  startTime: string,
  endTime: string,
  isResident: boolean
): { totalPrice: number; breakdown: { dayHours: number; eveningHours: number; dayRate: number; eveningRate: number } } {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  let diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  
  const dateObj = parseISO(date);
  const isWeekendDay = isWeekend(dateObj);
  
  // На вихідних завжди вечірній тариф
  if (isWeekendDay) {
    const eveningRate = isResident ? room.tariffs.weekdayEveningResidentPrice : room.tariffs.weekdayEveningPrice;
    const totalHours = diffMinutes / 60;
    return {
      totalPrice: eveningRate * totalHours,
      breakdown: { dayHours: 0, eveningHours: totalHours, dayRate: 0, eveningRate }
    };
  }
  
  // Границя 17:00 у хвилинах
  const eveningStartMinutes = 17 * 60;
  
  // Розрахунок годин до та після 17:00
  let dayMinutes = 0;
  let eveningMinutes = 0;
  
  if (endTotalMinutes <= eveningStartMinutes) {
    // Вся репетиція до 17:00
    dayMinutes = diffMinutes;
  } else if (startTotalMinutes >= eveningStartMinutes) {
    // Вся репетиція після 17:00
    eveningMinutes = diffMinutes;
  } else {
    // Репетиція переходить через 17:00
    dayMinutes = eveningStartMinutes - startTotalMinutes;
    eveningMinutes = endTotalMinutes - eveningStartMinutes;
  }
  
  const dayHours = dayMinutes / 60;
  const eveningHours = eveningMinutes / 60;
  
  const dayRate = isResident ? room.tariffs.weekdayDayResidentPrice : room.tariffs.weekdayDayPrice;
  const eveningRate = isResident ? room.tariffs.weekdayEveningResidentPrice : room.tariffs.weekdayEveningPrice;
  
  const totalPrice = (dayHours * dayRate) + (eveningHours * eveningRate);
  
  return {
    totalPrice,
    breakdown: { dayHours, eveningHours, dayRate, eveningRate }
  };
}

// Отримання актуальної ціни за годину
function getHourlyRate(room: Room, date: string, startTime: string, isResident: boolean): number {
  const isEvening = isEveningTariff(date, startTime);
  
  if (isEvening) {
    return isResident ? room.tariffs.weekdayEveningResidentPrice : room.tariffs.weekdayEveningPrice;
  } else {
    return isResident ? room.tariffs.weekdayDayResidentPrice : room.tariffs.weekdayDayPrice;
  }
}

export function usePriceCalculator({
  room,
  date,
  startTime,
  endTime,
  isResident,
  selectedEquipment,
  equipmentBookings,
  useSeparateEquipmentHours = false,
}: PriceCalculationParams): PriceCalculationResult {
  return useMemo(() => {
    if (!room || !date || !startTime || !endTime) {
      return {
        totalHours: 0,
        equipmentHours: 0,
        roomPrice: 0,
        equipmentPrice: 0,
        totalPrice: 0,
        hourlyRate: 0,
        isEveningRate: false,
        breakdown: { roomHourly: 0, equipmentHourly: 0 },
      };
    }

    // Розрахунок кількості годин
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    let diffMinutes = endTotalMinutes - startTotalMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Якщо час закінчення наступного дня
    }
    
    const totalHours = Math.ceil(diffMinutes / 60);

    // Розрахунок ціни кімнати з урахуванням переходу через 17:00
    const roomCalc = calculateMixedRate(room, date, startTime, endTime, isResident);
    const roomPrice = roomCalc.totalPrice;
    const isEveningRate = roomCalc.breakdown.eveningHours > 0;

    // Розрахунок ціни обладнання (резидентство НЕ діє на обладнання)
    let equipmentPrice = 0;
    let equipmentHours = totalHours;
    
    if (useSeparateEquipmentHours && equipmentBookings && equipmentBookings.length > 0) {
      // Окремі години для кожного обладнання
      equipmentPrice = equipmentBookings.reduce((sum, eqBooking) => {
        const eq = selectedEquipment.find(e => e.id === eqBooking.equipmentId);
        return sum + (eq?.pricePerHour || 0) * eqBooking.hours;
      }, 0);
      equipmentHours = equipmentBookings.reduce((sum, eq) => sum + eq.hours, 0);
    } else {
      // Традиційний розрахунок - обладнання на ті ж години, що й кімната
      const equipmentHourlyPrice = selectedEquipment.reduce(
        (sum, eq) => sum + eq.pricePerHour,
        0
      );
      equipmentPrice = equipmentHourlyPrice * totalHours;
    }

    // Загальна ціна
    const totalPrice = roomPrice + equipmentPrice;

    // Середній тариф за годину для відображення
    const avgHourlyRate = totalHours > 0 ? roomPrice / totalHours : 0;

    return {
      totalHours,
      equipmentHours,
      roomPrice,
      equipmentPrice,
      totalPrice,
      hourlyRate: avgHourlyRate,
      isEveningRate,
      breakdown: {
        roomHourly: avgHourlyRate,
        equipmentHourly: selectedEquipment.reduce((sum, eq) => sum + eq.pricePerHour, 0),
      },
    };
  }, [room, date, startTime, endTime, isResident, selectedEquipment, equipmentBookings, useSeparateEquipmentHours]);
}

// Допоміжна функція для форматування інформації про тариф
export function getTariffLabel(isEveningRate: boolean, isResident: boolean, isWeekendDay: boolean): string {
  if (isWeekendDay) {
    return isResident ? 'Вихідний/свято (резидент)' : 'Вихідний/свято';
  }
  if (isEveningRate) {
    return isResident ? 'Вечірній тариф (резидент)' : 'Вечірній тариф';
  }
  return isResident ? 'Денний тариф (резидент)' : 'Денний тариф';
}

export { isEveningTariff, getHourlyRate };
