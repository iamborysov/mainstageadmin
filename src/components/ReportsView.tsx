import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {

} from '@/components/ui/alert-dialog';
import { ROOMS, EQUIPMENT, PAYMENT_TYPES } from '@/types';
import { isEveningTariff } from '@/hooks/usePriceCalculator';
import { isWeekend, parseISO as parseISODate } from 'date-fns';
import type { ReportEntry } from '@/types/report';
import { subscribeToReports } from '@/services/reports';
import {
  FileText,
  Search,
  Download,
  TrendingUp,
  Calendar,
  Users,
  Home,
  Wallet,
  RotateCcw,
  Pencil,
  Trash2,
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

interface ReportsViewProps {
  isOwner?: boolean;
  adminEmail?: string;
  onEditBooking?: (booking: ReportEntry) => void;
  onDeleteBooking?: (reportId: string, bookingId?: string) => void;
}

export function ReportsView({ isOwner = false, adminEmail, onEditBooking, onDeleteBooking }: ReportsViewProps) {
  // Отримуємо звіти з колекції reports (тільки підтверджені записи)
  const [allReports, setAllReports] = useState<ReportEntry[]>([]);
  
  useEffect(() => {
    const unsubscribe = subscribeToReports((data) => {
      setAllReports(data);
    });
    return () => unsubscribe();
  }, []);
  
  // Фільтруємо звіти: овнер бачить все, адмін тільки свої
  const reports = useMemo(() => {
    if (isOwner) {
      return allReports;
    }
    // Адмін бачить тільки записи які він створив
    return allReports.filter(r => r.createdBy === adminEmail);
  }, [allReports, isOwner, adminEmail]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );


  // Функція для відображення email адміна
  const getAdminEmail = (adminId: string): string => {
    if (adminId === 'unknown' || adminId === 'null') return 'Невідомо';
    // adminId тепер це email
    return adminId;
  };

  // Поточний місяць для порівняння
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = filterMonth === currentMonth;

  // Форматування назви місяця
  const formatMonthName = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  };

  // Скидання до поточного місяця
  const handleResetToCurrentMonth = () => {
    setFilterMonth(currentMonth);
  };

  const filteredReports = useMemo(() => {
    const filtered = reports.filter((booking) => {
      // Пошук за назвою гурту
      const matchesSearch = booking.bandName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Фільтр за кімнатою
      const matchesRoom = filterRoom === 'all' || 
        booking.roomId === filterRoom ||
        (booking.roomBookings && booking.roomBookings.some(rb => rb.roomId === filterRoom));

      // Фільтр за типом оплати
      const matchesPaymentType =
        filterPaymentType === 'all' || booking.paymentType === filterPaymentType;

      // Фільтр за місяцем
      let matchesMonth = true;
      try {
        const bookingDate = parseISO(booking.date);
        const [year, month] = filterMonth.split('-').map(Number);
        const monthStart = startOfMonth(new Date(year, month - 1));
        const monthEnd = endOfMonth(new Date(year, month - 1));
        matchesMonth = isWithinInterval(bookingDate, {
          start: monthStart,
          end: monthEnd,
        });
      } catch {
        matchesMonth = false;
      }

      return matchesSearch && matchesRoom && matchesPaymentType && matchesMonth;
    });
    
    // Сортування: спочатку по даті (від новіших до старіших),
    // потім по часу додавання (від новіших до старіших)
    const sorted = filtered.sort((a, b) => {
      // Спочатку порівнюємо по даті
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;

      // Якщо дати однакові - порівнюємо по createdAt
      return b.createdAt.localeCompare(a.createdAt);
    });

    return sorted;
  }, [reports, searchTerm, filterRoom, filterPaymentType, filterMonth]);

  // Для звітів беремо всі записи (і з Telegram, і додані адміном вручну)
  const reportEntries = useMemo(() => {
    return filteredReports;
  }, [filteredReports]);

  // Розрахунок ЗП
  const calculateSalary = (reports: ReportEntry[]) => {
    const COMMISSION_RATE = 0.1; // 10% від суми
    const BASE_SALARY = 6000; // Ставка за півмісяця

    // Розділяємо на перші (1-15) та другі (16-31) півмісяця
    const firstHalfBookings = reports.filter((b) => {
      const day = parseInt(b.date.split('-')[2]);
      return day >= 1 && day <= 15;
    });

    const secondHalfBookings = reports.filter((b) => {
      const day = parseInt(b.date.split('-')[2]);
      return day >= 16;
    });

    // Розрахунок за перші півмісяця
    const firstHalfRevenue = firstHalfBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const firstHalfCommission = firstHalfRevenue * COMMISSION_RATE;
    const firstHalfTotal = firstHalfCommission + BASE_SALARY;

    // Розрахунок за другі півмісяця
    const secondHalfRevenue = secondHalfBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const secondHalfCommission = secondHalfRevenue * COMMISSION_RATE;
    const secondHalfTotal = secondHalfCommission + BASE_SALARY;

    return {
      firstHalf: {
        bookings: firstHalfBookings.length,
        revenue: firstHalfRevenue,
        commission: firstHalfCommission,
        baseSalary: firstHalfBookings.length > 0 ? BASE_SALARY : 0,
        total: firstHalfTotal,
      },
      secondHalf: {
        bookings: secondHalfBookings.length,
        revenue: secondHalfRevenue,
        commission: secondHalfCommission,
        baseSalary: secondHalfBookings.length > 0 ? BASE_SALARY : 0,
        total: secondHalfTotal,
      },
      total: firstHalfTotal + secondHalfTotal,
    };
  };

  // Статистика розраховується по всіх записах звіту
  const statistics = useMemo(() => {
    const totalRevenue = reportEntries.reduce(
      (sum, b) => sum + b.totalPrice,
      0
    );
    const totalHours = reportEntries.reduce((sum, b) => sum + b.totalHours, 0);
    const totalBookings = reportEntries.length;
    const residentBookings = reportEntries.filter((b) => b.isResident).length;

    // Для адміна - фільтруємо тільки його записи для розрахунку ЗП
    const adminReports = isOwner 
      ? reportEntries 
      : reportEntries.filter(b => b.createdBy === adminEmail);

    // Розрахунок ЗП (для адміна - тільки його записи, для овнера - всі)
    const salary = calculateSalary(adminReports);

    // Для овнера - розрахунок ЗП по кожному адміну окремо
    const salaryByAdmin = isOwner
      ? (() => {
          const grouped = reportEntries.reduce((acc, booking) => {
            const adminId = booking.createdBy || 'unknown';
            if (!acc[adminId]) {
              acc[adminId] = [];
            }
            acc[adminId].push(booking);
            return acc;
          }, {} as Record<string, ReportEntry[]>);

          return Object.entries(grouped).map(([adminId, adminBookings]) => ({
            adminId,
            bookingsCount: adminBookings.length,
            ...calculateSalary(adminBookings),
          }));
        })()
      : [];

    const revenueByRoom = ROOMS.map((room) => ({
      room,
      revenue: reportEntries
        .filter((b) => b.roomId === room.id)
        .reduce((sum, b) => sum + b.totalPrice, 0),
      hours: reportEntries
        .filter((b) => b.roomId === room.id)
        .reduce((sum, b) => sum + b.totalHours, 0),
    }));

    const revenueByPaymentType = PAYMENT_TYPES.map((type) => ({
      type,
      revenue: reportEntries
        .filter((b) => b.paymentType === type.value)
        .reduce((sum, b) => sum + b.totalPrice, 0),
      count: reportEntries.filter((b) => b.paymentType === type.value).length,
    }));

    return {
      totalRevenue,
      totalHours,
      totalBookings,
      residentBookings,
      revenueByRoom,
      revenueByPaymentType,
      salary,
      salaryByAdmin,
    };
  }, [reportEntries, isOwner, adminEmail]);

  const exportToCSV = () => {
    const headers = [
      'Дата',
      'Гурт',
      'Кімната',
      'Початок',
      'Кінець',
      'Годин',
      'Резидент',
      'Обладнання',
      'Тип оплати',
      ...(isOwner ? ['Сума'] : []),
    ];

    const rows = filteredReports.map((booking) => {
      const room = ROOMS.find((r) => r.id === booking.roomId);
      const equipment = booking.equipment
        .map((eqId) => EQUIPMENT.find((e) => e.id === eqId)?.name)
        .filter(Boolean)
        .join(', ');
      const paymentType = PAYMENT_TYPES.find((t) => t.value === booking.paymentType);

      return [
        booking.date,
        booking.bandName,
        room?.name || '',
        booking.startTime,
        booking.endTime,
        booking.totalHours,
        booking.isResident ? 'Так' : 'Ні',
        equipment || '-',
        paymentType?.label || '',
        ...(isOwner ? [booking.totalPrice] : []),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `звіт_${filterMonth}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Інформаційний рядок */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Звіт за:</span>
          <span className="font-medium">{formatMonthName(filterMonth)}</span>
          {!isCurrentMonth && (
            <span className="text-amber-500 text-xs">(архів)</span>
          )}
          {!isOwner && (
            <span className="text-blue-400">• Тільки мої записи</span>
          )}
        </div>
        {!isCurrentMonth && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleResetToCurrentMonth}
            className="gap-1 text-xs h-7"
          >
            <RotateCcw className="w-3 h-3" />
            Поточний місяць
          </Button>
        )}
      </div>

      {/* Фільтри */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Фільтри
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Пошук за гуртом</Label>
              <Input
                placeholder="Введіть назву гурту..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Місяць</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Кімната</Label>
              <Select value={filterRoom} onValueChange={setFilterRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Всі кімнати" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі кімнати</SelectItem>
                  {ROOMS.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тип оплати</Label>
              <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Всі типи" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі типи</SelectItem>
                  {PAYMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">
          Статистика за {formatMonthName(filterMonth)}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isOwner && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Загальний дохід</p>
                    <p className="text-2xl font-bold">{statistics.totalRevenue} грн</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Всього годин</p>
                  <p className="text-2xl font-bold">{statistics.totalHours} год</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Бронювань</p>
                  <p className="text-2xl font-bold">{statistics.totalBookings}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Резидентів</p>
                  <p className="text-2xl font-bold">{statistics.residentBookings}</p>
                </div>
                <Home className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Розрахунок ЗП */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {isOwner ? 'Зарплата адміністраторів' : 'Моя зарплата'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Перші півмісяця (1-15) */}
            <div className="p-4 border rounded-lg space-y-2">
              <p className="font-medium text-muted-foreground">1-15 число</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Репетицій:</span>
                  <span>{statistics.salary.firstHalf.bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Обіг:</span>
                  <span>{statistics.salary.firstHalf.revenue} грн</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>10%:</span>
                  <span>+{Math.round(statistics.salary.firstHalf.commission)} грн</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>Ставка:</span>
                  <span>+{statistics.salary.firstHalf.baseSalary} грн</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-lg">
                  <span>Всього:</span>
                  <span>{Math.round(statistics.salary.firstHalf.total)} грн</span>
                </div>
              </div>
            </div>

            {/* Другі півмісяця (16-31) */}
            <div className="p-4 border rounded-lg space-y-2">
              <p className="font-medium text-muted-foreground">16-31 число</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Репетицій:</span>
                  <span>{statistics.salary.secondHalf.bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Обіг:</span>
                  <span>{statistics.salary.secondHalf.revenue} грн</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>10%:</span>
                  <span>+{Math.round(statistics.salary.secondHalf.commission)} грн</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>Ставка:</span>
                  <span>+{statistics.salary.secondHalf.baseSalary} грн</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-lg">
                  <span>Всього:</span>
                  <span>{Math.round(statistics.salary.secondHalf.total)} грн</span>
                </div>
              </div>
            </div>

            {/* Загальна ЗП */}
            <div className="p-4 border rounded-lg bg-primary/5 space-y-2">
              <p className="font-medium text-primary">Загальна зарплата</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Репетицій всього:</span>
                  <span>{statistics.totalBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Обіг:</span>
                  <span>{statistics.totalRevenue} грн</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>10% від обігу:</span>
                  <span>+{Math.round((statistics.totalRevenue * 0.1))} грн</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>Ставка (2 півміс.):</span>
                  <span>+{statistics.salary.firstHalf.baseSalary + statistics.salary.secondHalf.baseSalary} грн</span>
                </div>
                <div className="pt-2 border-t border-primary/20 flex justify-between font-bold text-xl text-primary">
                  <span>До виплати:</span>
                  <span>{Math.round(statistics.salary.total)} грн</span>
                </div>
              </div>
            </div>
          </div>

          {/* Для овнера - деталізація по кожному адміну */}
          {isOwner && statistics.salaryByAdmin.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-4">Зарплата по адміністраторах</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Адмін</th>
                      <th className="text-center py-2">Реп.</th>
                      <th className="text-right py-2">1-15 (грн)</th>
                      <th className="text-right py-2">16-31 (грн)</th>
                      <th className="text-right py-2 font-bold">Всього (грн)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.salaryByAdmin.map((admin) => (
                      <tr key={admin.adminId} className="border-b border-zinc-800">
                        <td className="py-2 text-sm">{getAdminEmail(admin.adminId)}</td>
                        <td className="text-center py-2">{admin.bookingsCount}</td>
                        <td className="text-right py-2">{Math.round(admin.firstHalf.total)}</td>
                        <td className="text-right py-2">{Math.round(admin.secondHalf.total)}</td>
                        <td className="text-right py-2 font-bold text-green-400">{Math.round(admin.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Дохід за кімнатами - тільки для власника */}
      {isOwner && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Дохід за кімнатами
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statistics.revenueByRoom.map(({ room, revenue, hours }) => (
                <div key={room.id} className="p-4 border rounded-lg">
                  <p className="font-medium">{room.name}</p>
                  <p className="text-2xl font-bold text-primary">{revenue} грн</p>
                  <p className="text-sm text-muted-foreground">{hours} годин</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Дохід за типом оплати - тільки для власника */}
      {isOwner && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Дохід за типом оплати
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statistics.revenueByPaymentType.map(({ type, revenue, count }) => (
                <div key={type.value} className="p-4 border rounded-lg">
                  <p className="font-medium">{type.label}</p>
                  <p className="text-2xl font-bold text-primary">{revenue} грн</p>
                  <p className="text-sm text-muted-foreground">{count} платежів</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Таблиця бронювань */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isOwner ? 'Звіт всіх записів' : 'Звіт моїх записів'}
          </CardTitle>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Експорт CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Гурт</TableHead>
                  <TableHead>Кімната</TableHead>
                  <TableHead>Час</TableHead>
                  <TableHead>Годин</TableHead>
                  <TableHead>Резидент</TableHead>
                  <TableHead>Обладнання</TableHead>
                  <TableHead>Тип оплати</TableHead>
                  {isOwner && <TableHead className="text-right">Сума</TableHead>}
                  <TableHead className="text-center">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 10 : 9} className="text-center text-muted-foreground">
                      {isOwner 
                        ? 'Немає даних за обраний період' 
                        : 'У вас немає записів за обраний період'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((booking) => {
                    const room = ROOMS.find((r) => r.id === booking.roomId);
                    const paymentType = PAYMENT_TYPES.find(
                      (t) => t.value === booking.paymentType
                    );
                    const equipmentNames = (booking.equipment || [])
                      .map((eqId) => EQUIPMENT.find((e) => e.id === eqId)?.name)
                      .filter(Boolean);

                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          {booking.date ? format(parseISO(booking.date), 'dd.MM.yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {booking.bandName}
                        </TableCell>
                        <TableCell>
                          {/* Відображення кімнат */}
                          {booking.roomBookings && booking.roomBookings.length > 1 ? (
                            <div className="space-y-1">
                              {booking.roomBookings.map(rb => {
                                const r = ROOMS.find(room => room.id === rb.roomId);
                                return (
                                  <div key={rb.roomId} className="text-xs">
                                    {r?.name}: {rb.hours} год
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              {room?.name}
                              {room && booking.date && (() => {
                                const isEvening = isEveningTariff(booking.date, booking.startTime);
                                const isWeekendDay = isWeekend(parseISODate(booking.date));
                                return (
                                  <span className="text-xs text-muted-foreground block">
                                    {isEvening || isWeekendDay ? 'Вечірній' : 'Денний'}
                                    {booking.isResident && ' (рез.)'}
                                  </span>
                                );
                              })()}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.startTime} - {booking.endTime}
                        </TableCell>
                        <TableCell>
                          {Number(booking.totalHours)}
                        </TableCell>
                        <TableCell>
                          {booking.isResident ? (
                            <Badge variant="secondary">Так</Badge>
                          ) : (
                            <Badge variant="outline">Ні</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {equipmentNames.length > 0 ? (
                            <span className="text-sm">
                              {equipmentNames.join(', ')}
                              {booking.equipmentBookings && booking.equipmentBookings.length > 0 && (
                                <span className="text-xs text-muted-foreground block">
                                  {booking.equipmentBookings.map(eb => {
                                    const eq = EQUIPMENT.find(e => e.id === eb.equipmentId);
                                    return `${eq?.name}: ${eb.hours}год`;
                                  }).join(', ')}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.paymentType === 'mixed' && booking.mixedPayment ? (
                            <div className="text-xs">
                              <div>Готівка: {booking.mixedPayment.cashAmount} грн</div>
                              <div>Картка: {booking.mixedPayment.cardAmount} грн</div>
                            </div>
                          ) : (
                            paymentType?.label
                          )}
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-right font-semibold">
                            {booking.totalPrice} грн
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {onEditBooking && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditBooking(booking)}
                                className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {onDeleteBooking && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Видалити цей запис зі звіту?')) {
                                    onDeleteBooking(booking.id, booking.bookingId);
                                  }
                                }}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
