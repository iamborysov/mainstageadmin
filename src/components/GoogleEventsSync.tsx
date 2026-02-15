import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { googleCalendarService } from '@/services/googleCalendar';
import type { GoogleCalendarEvent } from '@/services/googleCalendar';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Calendar, Clock, MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleEventsSyncProps {
  selectedDate: Date;
  isAuthenticated: boolean;
}

export function GoogleEventsSync({ selectedDate, isAuthenticated }: GoogleEventsSyncProps) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchEvents = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      const eventsData = await googleCalendarService.getEvents(
        monthStart.toISOString(),
        monthEnd.toISOString()
      );

      setEvents(eventsData);
      setLastSync(new Date());
    } catch (error) {
      toast.error('Помилка завантаження подій: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated, selectedDate]);

  // Фільтрація подій на вибраний день
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

  const dayEvents = getEventsForDay(selectedDate);

  const getEventTime = (event: GoogleCalendarEvent) => {
    if (event.start.dateTime) {
      return format(parseISO(event.start.dateTime), 'HH:mm');
    }
    return 'Весь день';
  };

  const getEventColor = (colorId?: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-blue-500',
      '2': 'bg-green-500',
      '3': 'bg-purple-500',
      '4': 'bg-red-500',
      '5': 'bg-yellow-500',
      '6': 'bg-orange-500',
      '7': 'bg-cyan-500',
      '8': 'bg-pink-500',
      '9': 'bg-indigo-500',
      '10': 'bg-gray-500',
      '11': 'bg-brown-500',
    };
    return colors[colorId || ''] || 'bg-gray-400';
  };

  if (!isAuthenticated) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Підключіть Google акаунт для перегляду подій з календаря
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Google Calendar
            {lastSync && (
              <span className="text-xs text-muted-foreground font-normal">
                (оновлено {format(lastSync, 'HH:mm')})
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchEvents}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Немає подій на {format(selectedDate, 'd MMMM', { locale: uk })}
          </p>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 border rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getEventColor(event.colorId)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getEventTime(event)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://calendar.google.com/calendar/event?eid=${btoa(
                      event.id
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
