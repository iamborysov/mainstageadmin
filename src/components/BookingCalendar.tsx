import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Booking } from '@/types';
import { ROOMS } from '@/types';
import type { ScheduleSettings } from '@/types/schedule';
import { getWorkingHoursForDay, DEFAULT_SCHEDULE } from '@/types/schedule';
import { subscribeToSchedule } from '@/services/schedule';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  X,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  getDay,
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BookingPreviewDialog } from './BookingPreviewDialog';

interface BookingCalendarProps {
  bookings: Booking[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  isLoading?: boolean;
  onAddBooking?: (date: Date, time?: string) => void;
  onEditBooking?: (booking: Booking) => void;
  onDeleteBooking?: (bookingId: string) => void;
  onAddToReport?: (booking: Booking) => void;
  isAdmin?: boolean;
  isOwner?: boolean;
}

type CalendarView = 'month' | 'week';

export function BookingCalendar({
  bookings,
  onDateSelect,
  selectedDate,
  isLoading,
  onAddBooking,
  onEditBooking,
  onDeleteBooking,
  onAddToReport,
  isAdmin = false,
  isOwner = false,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [schedule, setSchedule] = useState<ScheduleSettings>(DEFAULT_SCHEDULE);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Підписка на графік роботи
  useEffect(() => {
    const unsubscribe = subscribeToSchedule((newSchedule) => {
      setSchedule(newSchedule);
    });
    return () => unsubscribe();
  }, []);

  // Розрахунок днів для місячного виду
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Розрахунок днів для тижневого виду
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Отримати бронювання для дня (без скасованих)
  const getBookingsForDay = (day: Date) => {
    return bookings.filter((booking) => {
      return booking.date === format(day, 'yyyy-MM-dd') && 
             booking.status !== 'cancelled';
    });
  };

  // Чи день робочий
  const isWorkingDay = (day: Date): boolean => {
    const dayOfWeek = getDay(day);
    const hours = getWorkingHoursForDay(schedule, dayOfWeek);
    return hours !== null;
  };

  // Отримати робочі години для дня
  const getWorkingHoursForDate = (day: Date) => {
    const dayOfWeek = getDay(day);
    return getWorkingHoursForDay(schedule, dayOfWeek);
  };

  // Колір для кімнати - тільки 2 кольори
  const getRoomColor = (roomId: string) => {
    switch (roomId) {
      case 'standart':
        return 'bg-blue-600 text-white border-blue-400';
      case 'main':
        return 'bg-red-600 text-white border-red-400';
      default:
        return 'bg-zinc-600 text-white border-zinc-400';
    }
  };

  // Іконка/позначка джерела
  const getSourceIndicator = (source?: string) => {
    if (source === 'telegram') {
      return '📱'; // Telegram
    }
    return '👤'; // Ручне додавання
  };

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      onDateSelect(subWeeks(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      onDateSelect(addWeeks(selectedDate, 1));
    }
  };

  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    
    // Овнер може редагувати
    if (isOwner && onEditBooking) {
      onEditBooking(booking);
    } 
    // Адмін відкриває превью для додавання у звіт
    else if (isAdmin && !isOwner && onAddToReport) {
      setShowPreviewDialog(true);
    }
    // Інші - просто перегляд
    else {
      setShowBookingDialog(true);
    }
  };

  const handleDeleteClick = (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Тільки овнер може видаляти
    if (isOwner && onDeleteBooking && confirm('Видалити це бронювання?')) {
      onDeleteBooking(bookingId);
    }
  };

  const handleAddToReportFromPreview = (updatedBooking: Booking) => {
    if (onAddToReport) {
      onAddToReport(updatedBooking);
    }
    setShowPreviewDialog(false);
    setSelectedBooking(null);
  };

  // Місячний вид
  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((day) => (
        <div key={day} className="text-center text-sm font-medium text-zinc-500 py-2">
          {day}
        </div>
      ))}
      {monthDays.map((day) => {
        const dayBookings = getBookingsForDay(day);
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isSelected = isSameDay(day, selectedDate);
        const isWorking = isWorkingDay(day);
        const workingHours = getWorkingHoursForDate(day);

        return (
          <button
            key={day.toString()}
            onClick={() => onDateSelect(day)}
            className={cn(
              'min-h-[80px] p-2 rounded-lg border text-left transition-all relative',
              isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
              !isCurrentMonth && 'opacity-50',
              !isWorking && 'bg-zinc-950/50'
            )}
          >
            <div className="flex justify-between items-start">
              <span
                className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-blue-400' : 'text-zinc-300',
                  !isWorking && 'text-zinc-600'
                )}
              >
                {format(day, 'd')}
              </span>
              {!isWorking && (
                <span className="text-[10px] text-zinc-600">Вихідний</span>
              )}
            </div>
            
            {workingHours && (
              <div className="text-[10px] text-zinc-500 mt-1">
                {workingHours.openTime}-{workingHours.closeTime}
              </div>
            )}
            
            {dayBookings.length > 0 && (
              <div className="mt-2 space-y-1">
                {dayBookings.slice(0, 2).map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded truncate border flex items-center gap-1',
                      getRoomColor(booking.roomId)
                    )}
                  >
                    <span>{getSourceIndicator(booking.source)}</span>
                    <span>{booking.startTime} {booking.bandName.slice(0, 6)}...</span>
                  </div>
                ))}
                {dayBookings.length > 2 && (
                  <div className="text-[10px] text-zinc-500 px-1.5">
                    +{dayBookings.length - 2} ще
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  // Тижневий вид
  const renderWeekView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 10); // 10:00 - 23:00

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-8 gap-1">
          <div className="text-center text-sm font-medium text-zinc-500 py-2">
            Час
          </div>
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isWorking = isWorkingDay(day);
            const workingHours = getWorkingHoursForDate(day);

            return (
              <button
                key={day.toString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'text-center py-2 rounded-lg border transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
                  !isWorking && 'bg-zinc-950/50'
                )}
              >
                <div className={cn('text-sm font-medium', !isWorking && 'text-zinc-600')}>
                  {format(day, 'EEE', { locale: uk })}
                </div>
                <div className={cn('text-lg', isSelected ? 'text-blue-400' : 'text-zinc-300', !isWorking && 'text-zinc-600')}>
                  {format(day, 'd')}
                </div>
                {workingHours && (
                  <div className="text-[10px] text-zinc-500">
                    {workingHours.openTime}-{workingHours.closeTime}
                  </div>
                )}
                {!isWorking && (
                  <div className="text-[10px] text-zinc-600">Вихідний</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-8 gap-1">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="text-right pr-2 text-sm text-zinc-500 py-3">
                {String(hour).padStart(2, '0')}:00
              </div>
              {weekDays.map((day) => {
                const workingHours = getWorkingHoursForDate(day);
                const hourStart = hour;
                const hourEnd = hour + 1;
                
                // Чи цей час в робочих годинах
                const isInWorkingHours = workingHours && 
                  hourStart >= parseInt(workingHours.openTime.split(':')[0]) &&
                  hourEnd <= parseInt(workingHours.closeTime.split(':')[0]);

                const dayBookings = getBookingsForDay(day).filter((b) => {
                  const bookingStart = parseInt(b.startTime.split(':')[0]);
                  const bookingEnd = parseInt(b.endTime.split(':')[0]);
                  return hourStart < bookingEnd && hourEnd > bookingStart;
                });

                const isSelected = isSameDay(day, selectedDate);

                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn(
                      'min-h-[60px] p-1 rounded border transition-all relative',
                      isSelected
                        ? 'border-zinc-700 bg-zinc-800/50'
                        : 'border-zinc-800/50 bg-zinc-900/30',
                      !isInWorkingHours && 'bg-zinc-950/30'
                    )}
                  >
                    {isInWorkingHours && isAdmin && dayBookings.length === 0 && (
                      <button
                        onClick={() => onAddBooking?.(day, `${String(hour).padStart(2, '0')}:00`)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-blue-500/10 rounded transition-all"
                      >
                        <Plus className="w-4 h-4 text-blue-400" />
                      </button>
                    )}
                    
                    {dayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        onClick={(e) => handleBookingClick(booking, e)}
                        className={cn(
                          'text-[10px] px-1.5 py-1 rounded mb-1 cursor-pointer border hover:opacity-90',
                          getRoomColor(booking.roomId)
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate flex items-center gap-1">
                            <span>{getSourceIndicator(booking.source)}</span>
                            <span>{booking.bandName}</span>
                          </span>
                          {/* Тільки овнер може видаляти */}
                          {isOwner && (
                            <button
                              onClick={(e) => handleDeleteClick(booking.id, e)}
                              className="ml-1 text-white/70 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-zinc-400">
                          {booking.startTime}-{booking.endTime}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            Календар бронювань
            {isLoading && (
              <span className="text-sm font-normal text-zinc-500">(завантаження...)</span>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
              <TabsList className="bg-zinc-800">
                <TabsTrigger value="week" className="data-[state=active]:bg-zinc-700">
                  Тиждень
                </TabsTrigger>
                <TabsTrigger value="month" className="data-[state=active]:bg-zinc-700">
                  Місяць
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Легенда */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cyan-500 border border-cyan-400 shadow shadow-cyan-500/30"></div>
            <span className="text-zinc-400">Standart (Telegram)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500 border border-orange-400 shadow shadow-orange-500/30"></div>
            <span className="text-zinc-400">Main (Telegram)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600 border border-blue-400"></div>
            <span className="text-zinc-400">Standart (ручне)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-600 border border-red-400"></div>
            <span className="text-zinc-400">Main (ручне)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-zinc-950/50 border border-zinc-800"></div>
            <span className="text-zinc-400">Вихідний / Закрито</span>
          </div>
        </div>
        
        {/* Легенда джерел */}
        <div className="flex flex-wrap gap-4 mt-2 text-sm border-t border-zinc-800 pt-2">
          <div className="flex items-center gap-2">
            <span>📱</span>
            <span className="text-zinc-400">Telegram</span>
          </div>
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span className="text-zinc-400">Адмін (не в звіті)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {view === 'month' ? renderMonthView() : renderWeekView()}
      </CardContent>

      {/* Діалог перегляду бронювання */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Деталі бронювання</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">Гурт</Label>
                <div className="text-lg font-medium">{selectedBooking.bandName}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400">Дата</Label>
                  <div>{selectedBooking.date}</div>
                </div>
                <div>
                  <Label className="text-zinc-400">Час</Label>
                  <div>{selectedBooking.startTime} - {selectedBooking.endTime}</div>
                </div>
              </div>
              <div>
                <Label className="text-zinc-400">Кімната</Label>
                <div>{ROOMS.find(r => r.id === selectedBooking.roomId)?.name}</div>
              </div>
              {selectedBooking.notes && (
                <div>
                  <Label className="text-zinc-400">Примітки</Label>
                  <div className="text-zinc-300">{selectedBooking.notes}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Діалог превью для адміна (додавання у звіт) */}
      <BookingPreviewDialog
        booking={selectedBooking}
        isOpen={showPreviewDialog}
        onClose={() => {
          setShowPreviewDialog(false);
          setSelectedBooking(null);
        }}
        onAddToReport={handleAddToReportFromPreview}

      />
    </Card>
  );
}
