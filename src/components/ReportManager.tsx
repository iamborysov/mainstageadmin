import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  CheckCircle,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { Booking } from '@/types';
import type { ReportEntry } from '@/types/report';
import { addToReport, removeFromReport, subscribeToReports } from '@/services/reports';
import { ROOMS } from '@/types';

import { toast } from 'sonner';

interface ReportManagerProps {
  bookings: Booking[];
  adminEmail: string;
  isOwner?: boolean;
}

export function ReportManager({ bookings, adminEmail }: ReportManagerProps) {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reported'>('pending');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Підписка на звіти
  useEffect(() => {
    const unsubscribe = subscribeToReports((data) => {
      setReports(data);
    });
    return () => unsubscribe();
  }, []);

  // Бронювання, які ще не в звіті
  const pendingBookings = bookings.filter(
    (b) => !b.reportStatus || b.reportStatus === 'pending'
  );

  // Бронювання, які вже в звіті
  const reportedBookings = bookings.filter((b) => b.reportStatus === 'reported');

  // Додати в звіт
  const handleAddToReport = async (booking: Booking) => {
    console.log('Adding to report:', booking, 'admin:', adminEmail);
    try {
      const reportId = await addToReport(booking, adminEmail);
      console.log('Successfully added, report ID:', reportId);
      toast.success('Додано в звіт');
    } catch (error: any) {
      console.error('Error adding to report:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      toast.error('Помилка: ' + (error?.message || 'Невідома помилка'));
    }
  };

  // Видалити зі звіту
  const handleRemoveFromReport = async (reportId: string, bookingId?: string) => {
    try {
      await removeFromReport(reportId, bookingId);
      toast.success('Видалено зі звіту');
    } catch (error) {
      toast.error('Помилка при видаленні зі звіту');
    }
  };

  // Статистика по звітах
  const totalReported = reports.reduce((sum, r) => sum + r.totalPrice, 0);

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{pendingBookings.length}</div>
            <div className="text-sm text-zinc-400">Очікує додавання</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">{reportedBookings.length}</div>
            <div className="text-sm text-zinc-400">У звіті</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-400">{Math.round(totalReported)}</div>
            <div className="text-sm text-zinc-400">Сума в звіті (грн)</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблиця бронювань */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Управління звітом
            </CardTitle>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'reported')}>
              <TabsList className="bg-zinc-800">
                <TabsTrigger value="pending" className="data-[state=active]:bg-zinc-700">
                  Очікує ({pendingBookings.length})
                </TabsTrigger>
                <TabsTrigger value="reported" className="data-[state=active]:bg-zinc-700">
                  У звіті ({reportedBookings.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'pending' ? (
            pendingBookings.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Всі бронювання додані в звіт</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Дата/Час</TableHead>
                    <TableHead className="text-zinc-400">Гурт</TableHead>
                    <TableHead className="text-zinc-400">Кімната</TableHead>
                    <TableHead className="text-zinc-400">Сума</TableHead>
                    <TableHead className="text-zinc-400">Джерело</TableHead>
                    <TableHead className="text-zinc-400 text-right">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBookings.map((booking) => (
                    <TableRow key={booking.id} className="border-zinc-800">
                      <TableCell>
                        <div className="text-white">{booking.date}</div>
                        <div className="text-sm text-zinc-500">
                          {booking.startTime}-{booking.endTime}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {booking.bandName}
                      </TableCell>
                      <TableCell>
                        {ROOMS.find((r) => r.id === booking.roomId)?.name}
                      </TableCell>
                      <TableCell className="text-green-400">
                        {Math.round(booking.totalPrice)} грн
                      </TableCell>
                      <TableCell>
                        {booking.source === 'telegram' ? (
                          <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                            📱 Telegram
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-zinc-500 text-zinc-400">
                            👤 Ручне
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleAddToReport(booking)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Додати
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            reportedBookings.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Немає записів у звіті</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Дата/Час</TableHead>
                    <TableHead className="text-zinc-400">Гурт</TableHead>
                    <TableHead className="text-zinc-400">Кімната</TableHead>
                    <TableHead className="text-zinc-400">Сума</TableHead>
                    <TableHead className="text-zinc-400 text-right">Дії</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportedBookings.map((booking) => (
                    <TableRow key={booking.id} className="border-zinc-800 bg-green-500/5">
                      <TableCell>
                        <div className="text-white">{booking.date}</div>
                        <div className="text-sm text-zinc-500">
                          {booking.startTime}-{booking.endTime}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {booking.bandName}
                      </TableCell>
                      <TableCell>
                        {ROOMS.find((r) => r.id === booking.roomId)?.name}
                      </TableCell>
                      <TableCell className="text-green-400">
                        {Math.round(booking.totalPrice)} грн
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleRemoveFromReport(booking.reportId!, booking.id)
                          }
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Видалити
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
