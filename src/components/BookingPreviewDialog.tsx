import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Booking } from '@/types';
import { ROOMS, EQUIPMENT, PAYMENT_TYPES } from '@/types';
import { Calculator, Package, Plus } from 'lucide-react';
import { usePriceCalculator } from '@/hooks/usePriceCalculator';

interface BookingPreviewDialogProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToReport: (updatedBooking: Booking) => void;

}

export function BookingPreviewDialog({
  booking,
  isOpen,
  onClose,
  onAddToReport,
}: BookingPreviewDialogProps) {
  const [notes, setNotes] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [equipmentHours, setEquipmentHours] = useState<number>(0);

  // Скидаємо стан при відкритті
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNotes('');
      setSelectedEquipment([]);
      setEquipmentHours(0);
      onClose();
    }
  };

  const room = booking ? ROOMS.find((r) => r.id === booking.roomId) : null;
  
  // Розрахунок ціни з доданим обладнанням
  const priceCalc = usePriceCalculator({
    room: room || null,
    date: booking?.date || '',
    startTime: booking?.startTime || '',
    endTime: booking?.endTime || '',
    isResident: booking?.isResident || false,
    selectedEquipment: EQUIPMENT.filter((eq) =>
      selectedEquipment.includes(eq.id)
    ),
    equipmentBookings: equipmentHours > 0 
      ? selectedEquipment.map(id => ({ equipmentId: id, hours: equipmentHours }))
      : undefined,
    useSeparateEquipmentHours: equipmentHours > 0,
  });

  if (!booking) return null;

  const toggleEquipment = (equipId: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipId)
        ? prev.filter((id) => id !== equipId)
        : [...prev, equipId]
    );
  };

  const handleAddToReport = () => {
    const updatedBooking: Booking = {
      ...booking,
      notes: notes || booking.notes,
      equipment: selectedEquipment.length > 0 
        ? [...(booking.equipment || []), ...selectedEquipment]
        : booking.equipment,
      equipmentHours: equipmentHours > 0 ? equipmentHours : booking.equipmentHours,
      equipmentBookings: equipmentHours > 0
        ? selectedEquipment.map(id => ({ equipmentId: id, hours: equipmentHours }))
        : booking.equipmentBookings,
      totalPrice: priceCalc.totalPrice,
    };
    onAddToReport(updatedBooking);
    handleOpenChange(false);
  };

  const paymentType = PAYMENT_TYPES.find((t) => t.value === booking.paymentType);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-500" />
            Перегляд бронювання
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Основна інформація (тільки для читання) */}
          <div className="space-y-3 bg-zinc-800/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-zinc-400">Основна інформація</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-500 text-xs">Гурт</Label>
                <div className="text-white font-medium">{booking.bandName}</div>
              </div>
              <div>
                <Label className="text-zinc-500 text-xs">Дата</Label>
                <div className="text-white">{booking.date}</div>
              </div>
              <div>
                <Label className="text-zinc-500 text-xs">Час</Label>
                <div className="text-white">{booking.startTime} - {booking.endTime}</div>
              </div>
              <div>
                <Label className="text-zinc-500 text-xs">Кімната</Label>
                <div className="text-white">{room?.name}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Badge variant="outline" className="border-zinc-600">
                {paymentType?.label}
              </Badge>
              {booking.isResident && (
                <Badge variant="outline" className="border-green-600 text-green-400">
                  Резидент
                </Badge>
              )}
              {booking.source === 'telegram' ? (
                <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                  📱 Telegram
                </Badge>
              ) : (
                <Badge variant="outline" className="border-zinc-600">
                  👤 Ручне
                </Badge>
              )}
            </div>
          </div>

          {/* Додати обладнання */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Додати обладнання (якщо потрібно)
            </h3>
            
            <div className="space-y-2">
              {EQUIPMENT.map((equip) => (
                <div
                  key={equip.id}
                  onClick={() => toggleEquipment(equip.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedEquipment.includes(equip.id)
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedEquipment.includes(equip.id)}
                      className="border-zinc-600 data-[state=checked]:bg-orange-500 pointer-events-none"
                    />
                    <span className="text-sm text-white">{equip.name}</span>
                  </div>
                  <span className="text-xs text-zinc-400">{equip.pricePerHour} грн/год</span>
                </div>
              ))}
            </div>

            {selectedEquipment.length > 0 && (
              <div className="pt-2">
                <Label className="text-zinc-400 text-xs mb-1 block">
                  Години обладнання (якщо відрізняються від кімнати)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={equipmentHours}
                  onChange={(e) => setEquipmentHours(parseInt(e.target.value) || 0)}
                  placeholder="Години"
                  className="bg-zinc-800 border-zinc-700 w-32"
                />
              </div>
            )}
          </div>

          {/* Примітки */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Примітки / Корекції</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Додайте примітки якщо потрібно..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            {booking.notes && (
              <div className="text-xs text-zinc-500">
                Оригінальні примітки: {booking.notes}
              </div>
            )}
          </div>

          {/* Розрахунок ціни */}
          <div className="bg-zinc-800/50 p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">Розрахунок вартості</h3>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Кімната ({priceCalc.totalHours} год)</span>
              <span className="text-white">{Math.round(priceCalc.roomPrice)} грн</span>
            </div>
            {priceCalc.equipmentPrice > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Обладнання</span>
                <span className="text-white">{Math.round(priceCalc.equipmentPrice)} грн</span>
              </div>
            )}
            <div className="border-t border-zinc-700 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-zinc-300 font-medium">Всього</span>
                <span className="text-xl font-bold text-green-400">
                  {Math.round(priceCalc.totalPrice)} грн
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="border-zinc-700">
            Скасувати
          </Button>
          <Button 
            onClick={handleAddToReport}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Додати в звіт
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
