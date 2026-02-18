import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { googleCalendarService, type GoogleCalendarEvent } from '@/services/googleCalendar';
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
  parseISO,
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Home,
} from 'lucide-react';
import { toast } from 'sonner';

// === КАЛЕНДАРІ СТУДІЇ ===
// Налаштуйте в .env файлі: VITE_CALENDAR_STANDART_EMAIL та VITE_CALENDAR_MAIN_EMAIL
export const STUDIO_CALENDARS = [
  {
    id: 'standart',
    email: import.meta.env.VITE_CALENDAR_STANDART_EMAIL || '',
    name: 'Standart Room',
    color: 'bg-blue-600',
    borderColor: 'border-blue-400',
    roomId: 'standart',
  },
  {
    id: 'main',
    email: import.meta.env.VITE_CALENDAR_MAIN_EMAIL || '',
    name: 'Main Room',
    color: 'bg-red-600',
    borderColor: 'border-red-400',
    roomId: 'main',
  },
];

export interface CalendarEventData {
  summary: string;
  startTime: string;
  endTime: string;
  roomId: string;
  date: string;
  description?: string;
}

interface GoogleCalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  isAuthenticated: boolean;
  onEventClick?: (eventData: CalendarEventData) => void;
}

type CalendarView = 'month' | 'week';

export function GoogleCalendarView({
  selectedDate,
  onDateSelect,
  isAuthenticated,
  onEventClick,
}: GoogleCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null);

  // Завантаження подій з Google Calendar
  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);

      // Використовуємо email з STUDIO_CALENDARS
      const emails = STUDIO_CALENDARS.map(cal => cal.email);

      const allEvents = await googleCalendarService.getEventsFromMultipleCalendars(
        monthStart.toISOString(),
        monthEnd.toISOString(),
        emails
      );

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Помилка завантаження подій: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentMonth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [fetchEvents, isAuthenticated]);

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

  // Отримати події для дня
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = event.start.dateTime || event.start.date;
      if (!eventStart) return false;
      const eventDate = parseISO(eventStart);
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      );
    });
  };

  // Отримати події для години
  const getEventsForHour = (day: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = event.start.dateTime;
      if (!eventStart) return false;
      const eventDate = parseISO(eventStart);
      const eventHour = eventDate.getHours();
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear() &&
        eventHour === hour
      );
    });
  };

  // Визначити кімнату за calendarId
  const getRoomByCalendarId = (calendarId?: string) => {
    return STUDIO_CALENDARS.find(cal => 
      calendarId?.includes(cal.id) || calendarId?.includes(cal.email)
    );
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

  const getEventTimeRange = (event: GoogleCalendarEvent) => {
    if (event.start.dateTime) {
      const start = format(parseISO(event.start.dateTime), 'HH:mm');
      const end = event.end?.dateTime 
        ? format(parseISO(event.end.dateTime), 'HH:mm')
        : '';
      return end ? `${start} - ${end}` : start;
    }
    return 'Весь день';
  };

  const getEventColor = (calendarId?: string) => {
    const room = getRoomByCalendarId(calendarId);
    if (room) {
      return `${room.color} ${room.borderColor}`;
    }
    return 'bg-zinc-600 border-zinc-400';
  };

  // Обробка кліку на подію
  const handleEventClick = (event: GoogleCalendarEvent) => {
    const room = getRoomByCalendarId(event.calendarId);
    
    if (!event.start.dateTime) {
      toast.error('Це подія на весь день - немає точного часу');
      return;
    }

    const eventDate = parseISO(event.start.dateTime);
    const endTime = event.end?.dateTime 
      ? format(parseISO(event.end.dateTime), 'HH:mm')
      : '';

    const eventData: CalendarEventData = {
      summary: event.summary,
      startTime: format(eventDate, 'HH:mm'),
      endTime: endTime,
      roomId: room?.roomId || 'standart',
      date: format(eventDate, 'yyyy-MM-dd'),
      description: event.description,
    };

    if (onEventClick) {
      onEventClick(eventData);
      toast.success('Дані події завантажено в форму');
    } else {
      setSelectedEvent(event);
    }
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
        const dayEvents = getEventsForDay(day);
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isSelected = isSameDay(day, selectedDate);

        return (
          <button
            key={day.toString()}
            onClick={() => onDateSelect(day)}
            className={cn(
              'min-h-[100px] p-2 rounded-lg border text-left transition-all relative',
              isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
              !isCurrentMonth && 'opacity-50'
            )}
          >
            <div className="flex justify-between items-start">
              <span
                className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-blue-400' : 'text-zinc-300'
                )}
              >
                {format(day, 'd')}
              </span>
            </div>

            {dayEvents.length > 0 && (
              <div className="mt-2 space-y-1">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div
                    key={`${event.id}-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded truncate border text-white cursor-pointer hover:opacity-80',
                      getEventColor(event.calendarId)
                    )}
                  >
                    {getEventTimeRange(event)} {event.summary.slice(0, 8)}...
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-zinc-500 px-1.5">
                    +{dayEvents.length - 3} ще
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

            return (
              <button
                key={day.toString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'text-center py-2 rounded-lg border transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                )}
              >
                <div className="text-sm font-medium text-zinc-300">
                  {format(day, 'EEE', { locale: uk })}
                </div>
                <div className={cn('text-lg', isSelected ? 'text-blue-400' : 'text-zinc-300')}>
                  {format(day, 'd')}
                </div>
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
                const hourEvents = getEventsForHour(day, hour);
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn(
                      'min-h-[60px] p-1 rounded border transition-all relative',
                      isSelected
                        ? 'border-zinc-700 bg-zinc-800/50'
                        : 'border-zinc-800/50 bg-zinc-900/30'
                    )}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={cn(
                          'text-[10px] px-1.5 py-1 rounded mb-1 cursor-pointer border text-white hover:opacity-90',
                          getEventColor(event.calendarId)
                        )}
                      >
                        <div className="font-medium truncate">{event.summary}</div>
                        <div className="text-zinc-200 text-[9px]">
                          {getEventTimeRange(event)}
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

  if (!isAuthenticated) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <CalendarIcon className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <p className="text-muted-foreground mb-4">
            Підключіть Google акаунт для перегляду календаря
          </p>
          <p className="text-sm text-zinc-500">
            Натисніть "Підключити Google" в правому верхньому кутку
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            Google Calendar
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
              <Button
                variant="outline"
                size="icon"
                onClick={fetchEvents}
                disabled={isLoading}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <CalendarIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Легенда кімнат */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm border-t border-zinc-800 pt-4">
          {STUDIO_CALENDARS.map((cal) => (
            <div key={cal.id} className="flex items-center gap-2">
              <div className={cn('w-4 h-4 rounded border', cal.color, cal.borderColor)}></div>
              <span className="text-zinc-400 flex items-center gap-1">
                <Home className="w-3 h-3" />
                {cal.name}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {view === 'month' ? renderMonthView() : renderWeekView()}
      </CardContent>

      {/* Діалог деталей події */}
      {selectedEvent && !onEventClick && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold">{selectedEvent.summary}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-500 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="w-4 h-4" />
                <span>
                  {selectedEvent.start.dateTime
                    ? (() => {
                        const start = format(parseISO(selectedEvent.start.dateTime), 'dd MMMM yyyy HH:mm', {
                          locale: uk,
                        });
                        const end = selectedEvent.end?.dateTime
                          ? format(parseISO(selectedEvent.end.dateTime), 'HH:mm')
                          : '';
                        return end ? `${start} - ${end}` : start;
                      })()
                    : 'Весь день'}
                </span>
              </div>
              {selectedEvent.calendarName && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Home className="w-4 h-4" />
                  <span>
                    {getRoomByCalendarId(selectedEvent.calendarId)?.name || selectedEvent.calendarName}
                  </span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="text-zinc-300 mt-2 p-3 bg-zinc-800 rounded">
                  {selectedEvent.description}
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={`https://calendar.google.com/calendar/event?eid=${btoa(
                  selectedEvent.id
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Відкрити в Google
                </Button>
              </a>
              <Button onClick={() => setSelectedEvent(null)} className="flex-1">
                Закрити
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
