import { useState, useEffect, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { BookingForm } from '@/components/BookingForm';
import { GoogleCalendarView, type CalendarEventData } from '@/components/GoogleCalendarView';

// Lazy load heavy components
const ReportsView = lazy(() => import('@/components/ReportsView').then(m => ({ default: m.ReportsView })));
const Settings = lazy(() => import('@/components/Settings').then(m => ({ default: m.Settings })));

import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { googleCalendarService, type GoogleUser } from '@/services/googleCalendar';

import { AdminAuth } from '@/components/AdminAuth';
import type { Booking } from '@/types';

import { bookingsApi, type FirebaseBooking } from '@/services/firebase';
import { loadSettings, subscribeToSettings } from '@/services/settings';
import { addToReport } from '@/services/reports';
import type { UserRole } from '@/services/userRoles';
import { CalendarDays, BarChart3, Settings2, Loader2 } from 'lucide-react';

import type { User } from 'firebase/auth';

function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [_googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || userRole === 'owner';
  
  // Перевірка Google сесії при старті (незалежно від GoogleAuthButton)
  useEffect(() => {
    const hasSession = googleCalendarService.restoreSession();
    if (hasSession) {
      setIsGoogleAuth(true);
      setGoogleUser(googleCalendarService.getUser());
    }
  }, []);
  
  // Завантаження налаштувань (цін) при старті
  useEffect(() => {
    loadSettings();
    const unsubscribe = subscribeToSettings(() => {
      // Налаштування оновлено
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleAddBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    try {
      // Якщо editingBooking існує і це НЕ тимчасовий ID (тобто реальне редагування)
      if (editingBooking && !editingBooking.id.startsWith('temp-')) {
        // Оновлення існуючого запису в bookings
        await bookingsApi.update(editingBooking.id, bookingData);
        
        // Якщо запис був у звіті - оновлюємо і там
        if (editingBooking.reportId || bookingData.reportId) {
          const { updateDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/services/firebase');
          const reportId = editingBooking.reportId || bookingData.reportId;
          
          if (reportId) {
            try {
              // Формуємо оновлення без undefined значень
              const updateData: any = {
                bandName: bookingData.bandName,
                date: bookingData.date,
                roomId: bookingData.roomId,
                roomName: bookingData.roomId === 'standart' ? 'Standart' : 'Main',
                startTime: bookingData.startTime,
                endTime: bookingData.endTime,
                totalHours: bookingData.totalHours,
                totalPrice: bookingData.totalPrice,
                paymentType: bookingData.paymentType,
                isResident: bookingData.isResident,
                equipment: bookingData.equipment || [],
                equipmentHours: bookingData.equipmentHours || 0,
                equipmentBookings: bookingData.equipmentBookings || [],
                notes: bookingData.notes || null,
                updatedAt: new Date().toISOString(),
              };

              // Додаємо опціональні поля тільки якщо вони визначені
              if (bookingData.roomBookings && bookingData.roomBookings.length > 0) {
                updateData.roomBookings = bookingData.roomBookings;
              }
              
              if (bookingData.paymentType === 'mixed' && bookingData.mixedPayment) {
                updateData.mixedPayment = bookingData.mixedPayment;
              }

              await updateDoc(doc(db, 'reports', reportId), updateData);
            } catch (updateError) {
              console.error('Error updating report:', updateError);
            }
          }
        }
        
        toast.success('Запис оновлено!');
        setEditingBooking(null);
      } else {
        // Створення нового запису - додаємо в bookings
        const newBookingId = await bookingsApi.add(bookingData as Omit<FirebaseBooking, 'id'>, adminUser?.email);
        
        // Додаємо в звіт (reports колекцію)
        const newBooking: Booking = {
          id: newBookingId,
          ...bookingData,
          createdAt: new Date().toISOString(),
        };
        
        if (adminUser?.email) {
          await addToReport(newBooking, adminUser.email);
        }
        
        toast.success('Запис додано до звіту!');
        setEditingBooking(null);
      }
    } catch (error: any) {
      toast.error('Помилка: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingBooking(null);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setActiveTab('calendar');
  };

  // Обробка кліку на подію в Google Calendar
  const handleCalendarEventClick = (eventData: CalendarEventData) => {
    // Перераховуємо години на основі часу початку і кінця
    const calculateHours = (start: string, end: string) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      let diff = endMin - startMin;
      if (diff < 0) diff += 24 * 60;
      return Math.ceil(diff / 60);
    };
    
    const totalHours = calculateHours(eventData.startTime, eventData.endTime);
    
    // Створюємо тимчасове бронювання для редагування
    const tempBooking: Booking = {
      id: 'temp-google-event',
      bandName: eventData.summary,
      date: eventData.date,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      roomId: eventData.roomId,
      isResident: false,
      equipment: [],
      paymentType: 'cash',
      totalHours: totalHours,
      totalPrice: 0,
      notes: eventData.description,
      createdAt: new Date().toISOString(),
      source: 'manual',
    };
    
    // Залишаємось на календарі, форма в боковій панелі
    setSelectedDate(new Date(eventData.date));
    setEditingBooking(tempBooking);
    
    toast.success(`Завантажено: ${eventData.summary}. Перевірте дані в формі праворуч.`);
  };

  const handleAdminAuthChange = (user: User | null, role: UserRole | null) => {
    setAdminUser(user);
    setUserRole(role);
  };

  const handleGoogleAuthChange = (isAuthenticated: boolean, user: GoogleUser | null) => {
    setIsGoogleAuth(isAuthenticated);
    setGoogleUser(user);
  };

  // isAdmin та isOwner вже обчислені вище

  // Екран входу для незалогінених користувачів (нейтральний вигляд)
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white flex items-center justify-center">
        <Toaster position="top-right" richColors />
        <div className="text-center space-y-8 p-8 max-w-sm">
          <div className="w-32 h-32 mx-auto flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Logo" 
              width={120} 
              height={120}
              className="w-full h-full object-contain rounded-2xl" 
            />
          </div>
          <div className="pt-4">
            <AdminAuth onAuthChange={handleAdminAuthChange} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Studio Logo" 
                  width={64} 
                  height={64}
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-contain rounded-lg" 
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">Studio Admin</h1>
                <p className="text-sm text-muted-foreground">
                  Система управління бронюванням
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <GoogleAuthButton onAuthChange={handleGoogleAuthChange} />
              <AdminAuth onAuthChange={handleAdminAuthChange} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Календар</span>
            </TabsTrigger>
            {isAdmin ? (
              <>
                <TabsTrigger value="reports" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Аналітика</span>
                </TabsTrigger>
                {isOwner && (
                  <TabsTrigger value="settings" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Налаштування</span>
                  </TabsTrigger>
                )}
              </>
            ) : (
              <TabsTrigger value="reports" className="gap-2" disabled>
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Аналітика</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <GoogleCalendarView
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  isAuthenticated={isGoogleAuth}
                  onEventClick={handleCalendarEventClick}
                />
              </div>
              {isAdmin && (
                <div className="lg:col-span-1 space-y-4">
                  <BookingForm
                    onSubmit={handleAddBooking}
                    onCancel={editingBooking ? handleCancelEdit : undefined}
                    initialDate={selectedDate.toISOString().split('T')[0]}
                    initialData={editingBooking || undefined}
                    isEditing={!!editingBooking}
                    reportId={editingBooking?.reportId}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab - для всіх адмінів (аналітика) */}
          {isAdmin && (
            <TabsContent value="reports">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }>
                <ReportsView 
                  isOwner={isOwner} 
                  adminEmail={adminUser?.email || ''}
                  onEditBooking={(reportEntry) => {
                    // Перераховуємо години на основі часу початку і кінця
                    const calculateHours = (start: string, end: string) => {
                      const [sh, sm] = start.split(':').map(Number);
                      const [eh, em] = end.split(':').map(Number);
                      const startMin = sh * 60 + sm;
                      const endMin = eh * 60 + em;
                      let diff = endMin - startMin;
                      if (diff < 0) diff += 24 * 60;
                      return Math.ceil(diff / 60);
                    };
                    
                    const totalHours = reportEntry.totalHours > 0 
                      ? reportEntry.totalHours 
                      : calculateHours(reportEntry.startTime, reportEntry.endTime);
                    
                    // Конвертуємо ReportEntry в Booking для редагування
                    const bookingForEdit: Booking = {
                      id: reportEntry.bookingId || 'temp-edit',
                      bandName: reportEntry.bandName,
                      date: reportEntry.date,
                      startTime: reportEntry.startTime,
                      endTime: reportEntry.endTime,
                      roomId: reportEntry.roomId,
                      isResident: reportEntry.isResident,
                      equipment: reportEntry.equipment || [],
                      paymentType: reportEntry.paymentType,
                      totalHours: totalHours,
                      equipmentHours: reportEntry.equipmentHours || totalHours,
                      totalPrice: reportEntry.totalPrice,
                      notes: reportEntry.notes,
                      createdAt: reportEntry.createdAt,
                      source: reportEntry.source as 'telegram' | 'manual',
                      reportId: reportEntry.id,
                    };
                    
                    setSelectedDate(new Date(reportEntry.date));
                    setEditingBooking(bookingForEdit);
                    setActiveTab('calendar');
                    
                    toast.info('Редагування завантажено в форму календаря');
                  }}
                  onDeleteBooking={async (reportId, bookingId) => {
                    try {
                      // Використовуємо сервіс для видалення - він видалить з reports і оновить bookings
                      const { removeFromReport } = await import('@/services/reports');
                      await removeFromReport(reportId, bookingId);
                      
                      toast.success('Запис видалено зі звіту');
                    } catch (error: any) {
                      toast.error('Помилка видалення: ' + error.message);
                    }
                  }}
                />
              </Suspense>
            </TabsContent>
          )}

          {/* Settings Tab - Налаштування */}
          {isOwner && (
            <TabsContent value="settings">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }>
                <Settings isAdmin={isOwner} currentUser={adminUser} />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>

        {!isAdmin && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-2">Увійдіть як адміністратор для управління записами</p>
            <p className="text-sm">Календар доступний для перегляду всім користувачам</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
