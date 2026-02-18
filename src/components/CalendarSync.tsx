import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { syncCalendarEvents, shouldSync } from '@/services/calendarSync';
import { googleCalendarService } from '@/services/googleCalendar';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

interface CalendarSyncProps {
  isAdmin: boolean;
}

export function CalendarSync({ isAdmin }: CalendarSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [needsSync, setNeedsSync] = useState(false);

  useEffect(() => {
    const savedLastSync = localStorage.getItem('last_calendar_sync');
    setLastSync(savedLastSync);
    setNeedsSync(shouldSync());

    // Перевіряємо раз на хвилину чи потрібна синхронізація
    const interval = setInterval(() => {
      setNeedsSync(shouldSync());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!googleCalendarService.isAuthenticated()) {
      toast.error('Спочатку підключіть Google Calendar');
      return;
    }

    setIsSyncing(true);
    setProgress({ current: 0, total: 0 });

    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Отримуємо список календарів з env або localStorage
      const savedCalendars = localStorage.getItem('room_calendar_ids');
      const defaultCalendars = [
        'primary',
        import.meta.env.VITE_CALENDAR_MAIN_EMAIL,
        import.meta.env.VITE_CALENDAR_STANDART_EMAIL,
      ].filter(Boolean);
      const calendarIds = savedCalendars 
        ? JSON.parse(savedCalendars) 
        : defaultCalendars;

      const result = await syncCalendarEvents(
        calendarIds,
        monthStart,
        monthEnd,
        (current, total) => setProgress({ current, total })
      );

      const newLastSync = localStorage.getItem('last_calendar_sync');
      setLastSync(newLastSync);
      setNeedsSync(false);

      toast.success(
        `Синхронізація завершена! Додано ${result.success} подій${result.errors > 0 ? `, помилок: ${result.errors}` : ''}`
      );
    } catch (error: any) {
      toast.error('Помилка синхронізації: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (dateStr: string | null): string => {
    if (!dateStr) return 'Ніколи';
    const date = new Date(dateStr);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAdmin) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>Синхронізація доступна тільки для адміністраторів</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="w-5 h-5" />
          Синхронізація Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Остання синхронізація:</span>
          </div>
          <span className={needsSync ? 'text-yellow-500' : 'text-green-500'}>
            {formatLastSync(lastSync)}
          </span>
        </div>

        {needsSync && !isSyncing && (
          <div className="flex items-center gap-2 text-sm text-yellow-500">
            <AlertCircle className="w-4 h-4" />
            <span>Рекомендується оновити події</span>
          </div>
        )}

        {isSyncing && progress.total > 0 && (
          <div className="space-y-2">
            <Progress value={(progress.current / progress.total) * 100} />
            <p className="text-xs text-muted-foreground text-center">
              {progress.current} з {progress.total} подій...
            </p>
          </div>
        )}

        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full gap-2"
        >
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isSyncing ? 'Синхронізація...' : 'Синхронізувати зараз'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Події зберігаються в Firestore і доступні всім користувачам без підключення Google Calendar.
          <br />
          Синхронізація оновлює події за поточний місяць.
        </p>
      </CardContent>
    </Card>
  );
}
