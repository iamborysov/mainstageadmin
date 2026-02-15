import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROOMS, EQUIPMENT, PAYMENT_TYPES } from '@/types';
import type { Booking } from '@/types';
import {
  Calendar,
  Clock,
  Users,
  Home,
  Wallet,
  Package,
  CheckCircle,
  X,
  Edit,
  Trash2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';

interface BookingDialogProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
  onDelete: (bookingId: string) => void;
}

export function BookingDialog({
  booking,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: BookingDialogProps) {
  if (!booking) return null;

  const room = ROOMS.find((r) => r.id === booking.roomId);
  const paymentType = PAYMENT_TYPES.find((t) => t.value === booking.paymentType);
  const equipmentList = booking.equipment
    .map((eqId) => EQUIPMENT.find((e) => e.id === eqId))
    .filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Деталі запису в звіті
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Назва гурту */}
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">Назва гурту</p>
            <p className="text-xl font-bold">{booking.bandName}</p>
          </div>

          {/* Дата та час */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Дата</p>
                <p className="font-medium">
                  {format(parseISO(booking.date), 'd MMMM yyyy', { locale: uk })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Час</p>
                <p className="font-medium">
                  {booking.startTime} - {booking.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* Кімната */}
          <div className="flex items-start gap-2">
            <Home className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Кімната</p>
              <p className="font-medium">{room?.name}</p>
            </div>
          </div>

          {/* Резидент */}
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Статус</p>
              <div className="flex items-center gap-2">
                {booking.isResident ? (
                  <Badge variant="secondary">Резидент (знижка 20%)</Badge>
                ) : (
                  <Badge variant="outline">Не резидент</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Обладнання */}
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Додаткове обладнання</p>
              {equipmentList.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {equipmentList.map((eq) => {
                    const eqBooking = booking.equipmentBookings?.find(eb => eb.equipmentId === eq?.id);
                    return (
                      <div key={eq?.id} className="flex items-center justify-between">
                        <Badge variant="outline">{eq?.name}</Badge>
                        {eqBooking && (
                          <span className="text-xs text-muted-foreground">{eqBooking.hours} год</span>
                        )}
                      </div>
                    );
                  })}
                  {booking.equipmentHours && booking.equipmentHours !== booking.totalHours && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Загальні години обладнання: {booking.equipmentHours} год
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
          </div>

          {/* Тип оплати */}
          <div className="flex items-start gap-2">
            <Wallet className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Тип оплати</p>
              <p className="font-medium">{paymentType?.label}</p>
            </div>
          </div>

          {/* Розрахунок */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Кількість годин:</span>
              <span>{booking.totalHours} год</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Загальна сума:</span>
              <span className="text-primary">{booking.totalPrice} грн</span>
            </div>
          </div>

          {/* Нотатки */}
          {booking.notes && (
            <div className="p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Нотатки</p>
              <p className="text-sm">{booking.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Закрити
          </Button>
          <Button variant="destructive" onClick={() => onDelete(booking.id)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Видалити
          </Button>
          <Button onClick={() => onEdit(booking)}>
            <Edit className="w-4 h-4 mr-2" />
            Редагувати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
