import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { googleCalendarService } from '@/services/googleCalendar';
import type { GoogleUser } from '@/services/googleCalendar';
import { LogOut, User, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleAuthButtonProps {
  onAuthChange?: (isAuthenticated: boolean, user: GoogleUser | null) => void;
}

const AUTH_TIMEOUT = 30000; // 30 секунд таймаут на авторизацію

export function GoogleAuthButton({ onAuthChange }: GoogleAuthButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Ініціалізація Google Identity Services спочатку
    const initAndRestore = async () => {
      try {
        await googleCalendarService.initialize();
        
        // Перевіряємо чи сесія вже відновлена (наприклад, App.tsx вже відновив)
        if (googleCalendarService.isAuthenticated()) {
          // Просто оновлюємо свій локальний стан, не викликаємо onAuthChange
          setIsAuthenticated(true);
          setUser(googleCalendarService.getUser());
          return;
        }
        
        // Пробуємо відновити сесію з localStorage
        const restored = googleCalendarService.restoreSession();
        if (restored) {
          setIsAuthenticated(true);
          const user = googleCalendarService.getUser();
          setUser(user);
          // Оповіщаємо батьківський компонент про відновлення сесії
          onAuthChange?.(true, user);
        }
      } catch (error) {
        console.error('Google init error:', error);
      }
    };
    
    initAndRestore();
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onAuthChange?.(isAuthenticated, user);
  }, [isAuthenticated, user, onAuthChange]);

  const resetLoadingState = () => {
    setIsLoading(false);
    setHasError(true);
    toast.error('Авторизація не вдалася. Спробуйте ще раз.', {
      description: 'Можливо, ви закрили вікно авторизації або сталася помилка.',
    });
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setHasError(false);
    
    // Встановлюємо таймаут
    timeoutRef.current = setTimeout(() => {
      resetLoadingState();
    }, AUTH_TIMEOUT);
    
    try {
      const success = await googleCalendarService.signIn();
      // Скидаємо таймаут якщо успішно
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (success) {
        setIsAuthenticated(true);
        setUser(googleCalendarService.getUser());
        setHasError(false);
        toast.success('Google акаунт підключено!');
      } else {
        resetLoadingState();
      }
    } catch (error) {
      // Скидаємо таймаут при помилці
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      console.error('Auth error:', error);
      resetLoadingState();
    } finally {
      // Гарантуємо що isLoading буде false
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    googleCalendarService.signOut();
    setIsAuthenticated(false);
    setUser(null);
    toast.success('Вихід виконано');
  };

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline max-w-[120px] truncate">
              {user.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Вийти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Показуємо кнопку з помилкою
  if (hasError) {
    return (
      <Button
        onClick={handleSignIn}
        variant="outline"
        className="gap-2 text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Спробувати знову</span>
        <span className="sm:hidden">Повторити</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      {isLoading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span className="hidden sm:inline">Підключити Google</span>
      <span className="sm:hidden">Google</span>
    </Button>
  );
}
