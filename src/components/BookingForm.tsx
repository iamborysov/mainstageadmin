import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAYMENT_TYPES, ROOMS, EQUIPMENT } from '@/types';
import type { Booking, PaymentType, RoomBooking, MixedPayment, Equipment } from '@/types';
import { Clock, Users, Wallet, Package, Home, Calculator, Loader2 } from 'lucide-react';
import { isWeekend, parseISO } from 'date-fns';
import { loadCurrentPrices } from '@/services/settings';

interface BookingFormProps {
  onSubmit: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialDate?: string;
  initialData?: Booking;
  isEditing?: boolean;
  reportId?: string;
}

// Розрахунок ціни для кімнати
function calculateRoomPrice(
  roomId: string,
  hours: number,
  date: string,
  startTime: string,
  isResident: boolean
): number {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return 0;

  const dateObj = parseISO(date);
  const isWeekendDay = isWeekend(dateObj);
  const [startHour] = startTime.split(':').map(Number);
  const isEvening = startHour >= 17 || isWeekendDay;

  if (isResident) {
    return hours * (isEvening ? room.tariffs.weekdayEveningResidentPrice : room.tariffs.weekdayDayResidentPrice);
  }
  return hours * (isEvening ? room.tariffs.weekdayEveningPrice : room.tariffs.weekdayDayPrice);
}

export function BookingForm({ onSubmit, onCancel, initialDate, initialData, isEditing, reportId }: BookingFormProps) {
  const [bandName, setBandName] = useState(initialData?.bandName || '');
  const [date, setDate] = useState(initialData?.date || initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialData?.startTime || '18:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '20:00');
  
  // Вибір кімнат - можна вибрати одну або обидві
  const [selectedRooms, setSelectedRooms] = useState<RoomBooking[]>(
    initialData?.roomBookings || (initialData?.roomId ? [{ roomId: initialData.roomId, hours: initialData.totalHours || 2 }] : [])
  );
  
  const [isResident, setIsResident] = useState(initialData?.isResident || false);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>(initialData?.equipment || []);
  const [paymentType, setPaymentType] = useState<PaymentType>(initialData?.paymentType || 'cash');
  const [mixedPayment, setMixedPayment] = useState<MixedPayment>(
    initialData?.mixedPayment || { cashAmount: 0, cardAmount: 0 }
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  // Стан для обладнання з актуальними цінами
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(EQUIPMENT);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  // Завантаження актуальних цін при монтуванні
  useEffect(() => {
    loadCurrentPrices().then(eq => {
      setEquipmentList(eq);
      setIsLoadingPrices(false);
    });
  }, []);

  // Оновлюємо дані коли initialData змінюється
  useEffect(() => {
    if (initialData) {
      setBandName(initialData.bandName || '');
      setDate(initialData.date || initialDate || new Date().toISOString().split('T')[0]);
      setStartTime(initialData.startTime || '18:00');
      setEndTime(initialData.endTime || '20:00');
      setSelectedRooms(
        initialData.roomBookings || 
        (initialData.roomId ? [{ roomId: initialData.roomId, hours: initialData.totalHours || 2 }] : [])
      );
      setIsResident(initialData.isResident || false);
      setSelectedEquipmentIds(initialData.equipment || []);
      setPaymentType(initialData.paymentType || 'cash');
      setMixedPayment(initialData.mixedPayment || { cashAmount: 0, cardAmount: 0 });
      setNotes(initialData.notes || '');
    }
  }, [initialData, initialDate]);

  // Перерахунок годин на основі часу
  const calculateHours = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    let diff = endMin - startMin;
    if (diff < 0) diff += 24 * 60;
    return Math.ceil(diff / 60);
  };

  const baseHours = calculateHours();

  // Розрахунок ціни
  const priceCalculation = (() => {
    // Ціна за кімнати
    let roomPrice = 0;
    selectedRooms.forEach(roomBooking => {
      roomPrice += calculateRoomPrice(roomBooking.roomId, roomBooking.hours, date, startTime, isResident);
    });

    // Ціна за обладнання
    const selectedEquipment = EQUIPMENT.filter(eq => selectedEquipmentIds.includes(eq.id));
    const equipmentHourlyPrice = selectedEquipment.reduce((sum, eq) => sum + eq.pricePerHour, 0);
    // Обладнання йде на максимальну кількість годин з вибраних кімнат
    const maxHours = selectedRooms.length > 0 ? Math.max(...selectedRooms.map(r => r.hours)) : baseHours;
    const equipmentPrice = equipmentHourlyPrice * maxHours;

    const totalPrice = roomPrice + equipmentPrice;
    const totalHours = selectedRooms.reduce((sum, r) => sum + r.hours, 0);

    return {
      roomPrice,
      equipmentPrice,
      totalPrice,
      totalHours,
      maxHours,
    };
  })();

  // Обробка вибору кімнати
  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev => {
      const exists = prev.find(r => r.roomId === roomId);
      if (exists) {
        // Видаляємо кімнату
        return prev.filter(r => r.roomId !== roomId);
      } else {
        // Додаємо кімнату з типовими годинами
        return [...prev, { roomId, hours: baseHours }];
      }
    });
  };

  // Зміна годин для кімнати
  const handleRoomHoursChange = (roomId: string, hours: number) => {
    setSelectedRooms(prev =>
      prev.map(r =>
        r.roomId === roomId ? { ...r, hours: Math.max(1, hours) } : r
      )
    );
  };

  // Обладнання
  const handleEquipmentToggle = (equipmentId: string) => {
    setSelectedEquipmentIds(prev => {
      if (prev.includes(equipmentId)) {
        return prev.filter(id => id !== equipmentId);
      }
      return [...prev, equipmentId];
    });
  };

  // Перевірка чи вихідний
  const isWeekendDay = isWeekend(parseISO(date));
  const [startHour] = startTime.split(':').map(Number);
  const isEveningRate = startHour >= 17 || isWeekendDay;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRooms.length === 0) return;

    // Визначаємо основну кімнату (для сумісності)
    const primaryRoom = selectedRooms[0];

    // Формуємо дані без undefined
    const bookingData: Omit<Booking, 'id' | 'createdAt'> = {
      bandName,
      date,
      startTime,
      endTime,
      roomId: primaryRoom.roomId,
      roomBookings: selectedRooms.map(r => ({ roomId: r.roomId, hours: Number(r.hours) })),
      isResident,
      equipment: selectedEquipmentIds,
      paymentType,
      totalHours: Number(priceCalculation.totalHours),
      totalPrice: Number(priceCalculation.totalPrice),
      notes: notes || '',
      source: 'manual',
      createdBy: 'admin',
    };

    // Додаємо опціональні поля тільки якщо вони потрібні
    if (paymentType === 'mixed') {
      bookingData.mixedPayment = mixedPayment;
    }
    
    if (reportId || initialData?.reportId) {
      bookingData.reportId = reportId || initialData?.reportId;
    }

    onSubmit(bookingData);

    // Reset form
    setBandName('');
    setSelectedRooms([]);
    setSelectedEquipmentIds([]);
    setIsResident(false);
    setMixedPayment({ cashAmount: 0, cardAmount: 0 });
    setNotes('');
  };

  return (
    <Card className="w-full bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          {isEditing ? 'Редагувати запис' : 'Новий запис в звіт'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Назва гурту */}
          <div className="space-y-2">
            <Label htmlFor="bandName" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Назва гурту
            </Label>
            <Input
              id="bandName"
              value={bandName}
              onChange={(e) => setBandName(e.target.value)}
              placeholder="Введіть назву гурту"
              required
            />
          </div>

          {/* Дата */}
          <div className="space-y-2">
            <Label htmlFor="date">Дата</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Час */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Початок
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Кінець</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Кімнати - можна вибрати декілька */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Кімнати (можна вибрати обидві)
            </Label>
            <div className="space-y-2 p-3 border rounded-lg bg-zinc-800/50">
              {ROOMS.map((room) => {
                const roomBooking = selectedRooms.find(r => r.roomId === room.id);
                const isSelected = !!roomBooking;
                
                return (
                  <div key={room.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`room-${room.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleRoomToggle(room.id)}
                        />
                        <Label htmlFor={`room-${room.id}`} className="cursor-pointer font-medium">
                          {room.name}
                        </Label>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Годин:</Label>
                          <Input
                            type="number"
                            min={1}
                            max={24}
                            value={roomBooking.hours}
                            onChange={(e) => handleRoomHoursChange(room.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-sm"
                          />
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="text-xs text-muted-foreground pl-6">
                        {isEveningRate || isWeekendDay ? 'Вечірній тариф' : 'Денний тариф'}: 
                        {isResident 
                          ? (isEveningRate || isWeekendDay ? room.tariffs.weekdayEveningResidentPrice : room.tariffs.weekdayDayResidentPrice)
                          : (isEveningRate || isWeekendDay ? room.tariffs.weekdayEveningPrice : room.tariffs.weekdayDayPrice)
                        } грн/год
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedRooms.length === 0 && (
              <p className="text-xs text-red-400">Оберіть хоча б одну кімнату</p>
            )}
          </div>

          {/* Резидент */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
            <Checkbox
              id="resident"
              checked={isResident}
              onCheckedChange={(checked) => setIsResident(checked as boolean)}
            />
            <Label htmlFor="resident" className="cursor-pointer">
              Резидент (знижка на кімнату)
            </Label>
          </div>

          {/* Обладнання */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Додаткове обладнання
            </Label>
            <div className="space-y-2 p-3 border rounded-lg">
              {isLoadingPrices ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Завантаження цін...
                </div>
              ) : (
                equipmentList.map((eq) => (
                  <div key={eq.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={eq.id}
                      checked={selectedEquipmentIds.includes(eq.id)}
                      onCheckedChange={() => handleEquipmentToggle(eq.id)}
                    />
                    <Label htmlFor={eq.id} className="text-sm cursor-pointer">
                      {eq.name} ({eq.pricePerHour} грн/год)
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Тип оплати */}
          <div className="space-y-2">
            <Label htmlFor="paymentType" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Тип оплати
            </Label>
            <Select
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as PaymentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Змішана оплата - поля для сум */}
          {paymentType === 'mixed' && (
            <div className="p-3 border rounded-lg bg-zinc-800/50 space-y-3">
              <Label className="text-sm font-medium">Розподіл оплати:</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Готівка</Label>
                  <Input
                    type="number"
                    min={0}
                    max={priceCalculation.totalPrice}
                    value={mixedPayment.cashAmount}
                    onChange={(e) => {
                      const cash = parseInt(e.target.value) || 0;
                      setMixedPayment({
                        cashAmount: cash,
                        cardAmount: priceCalculation.totalPrice - cash,
                      });
                    }}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Картка</Label>
                  <Input
                    type="number"
                    min={0}
                    max={priceCalculation.totalPrice}
                    value={mixedPayment.cardAmount}
                    onChange={(e) => {
                      const card = parseInt(e.target.value) || 0;
                      setMixedPayment({
                        cashAmount: priceCalculation.totalPrice - card,
                        cardAmount: card,
                      });
                    }}
                    className="h-8"
                  />
                </div>
              </div>
              {mixedPayment.cashAmount + mixedPayment.cardAmount !== priceCalculation.totalPrice && (
                <p className="text-xs text-amber-400">
                  Сума готівки + картки має дорівнювати {priceCalculation.totalPrice} грн
                </p>
              )}
            </div>
          )}

          {/* Нотатки */}
          <div className="space-y-2">
            <Label htmlFor="notes">Додаткові нотатки</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Опціональні нотатки..."
            />
          </div>

          {/* Розрахунок ціни */}
          {selectedRooms.length > 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="pt-4 space-y-2">
                <h4 className="font-semibold text-primary">Розрахунок вартості:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Тариф:</span>
                    <span>{isEveningRate || isWeekendDay ? 'Вечірній/вихідний' : 'Денний'}</span>
                  </div>
                  
                  {/* Деталі по кімнатах */}
                  {selectedRooms.map(roomBooking => {
                    const room = ROOMS.find(r => r.id === roomBooking.roomId);
                    const roomPrice = calculateRoomPrice(roomBooking.roomId, roomBooking.hours, date, startTime, isResident);
                    return (
                      <div key={roomBooking.roomId} className="flex justify-between">
                        <span>{room?.name} ({roomBooking.hours} год):</span>
                        <span className="font-medium">{roomPrice} грн</span>
                      </div>
                    );
                  })}
                  
                  {priceCalculation.equipmentPrice > 0 && (
                    <div className="flex justify-between">
                      <span>Обладнання:</span>
                      <span className="font-medium">{priceCalculation.equipmentPrice} грн</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold text-primary">
                    <span>Загальна сума:</span>
                    <span>{priceCalculation.totalPrice} грн</span>
                  </div>
                  
                  {paymentType === 'mixed' && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Готівка:</span>
                        <span>{mixedPayment.cashAmount} грн</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Картка:</span>
                        <span>{mixedPayment.cardAmount} грн</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            {isEditing && onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
              >
                Скасувати
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={!bandName || selectedRooms.length === 0}
            >
              {isEditing ? 'Зберегти зміни' : 'Додати в звіт'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
