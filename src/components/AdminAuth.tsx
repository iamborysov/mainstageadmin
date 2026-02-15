import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/services/firebase';
import { type User } from 'firebase/auth';
import { 
  getUserRole, 
  subscribeToUserRoles,
  initializeUserRole,
  type UserRole 
} from '@/services/userRoles';
import { LogIn, LogOut, User as UserIcon, Shield, Crown } from 'lucide-react';

interface AdminAuthProps {
  onAuthChange: (user: User | null, role: UserRole | null) => void;
}

export function AdminAuth({ onAuthChange }: AdminAuthProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [rolesCache, setRolesCache] = useState<Map<string, UserRole>>(new Map());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Підписка на зміни ролей у Firestore
  useEffect(() => {
    const unsubscribe = subscribeToUserRoles((roles) => {
      setRolesCache(roles);
      // Оновлюємо роль поточного користувача
      if (user?.email) {
        const role = roles.get(user.email.toLowerCase()) || 'admin';
        setUserRole(role);
        onAuthChange(user, role);
      }
    });

    return () => unsubscribe();
  }, [user?.email, onAuthChange]);

  // Підписка на зміни автентифікації
  useEffect(() => {
    const unsubscribe = authApi.subscribe(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser?.email) {
        // Ініціалізуємо роль користувача при вході
        await initializeUserRole(currentUser.email, currentUser.uid);
        
        // Отримуємо роль з кешу або Firestore
        const cachedRole = rolesCache.get(currentUser.email.toLowerCase());
        if (cachedRole) {
          setUserRole(cachedRole);
          onAuthChange(currentUser, cachedRole);
        } else {
          const role = await getUserRole(currentUser.email);
          setUserRole(role);
          onAuthChange(currentUser, role);
        }
      } else {
        setUserRole(null);
        onAuthChange(null, null);
      }
    });

    return () => unsubscribe();
  }, [onAuthChange, rolesCache]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authApi.signIn(email, password);
      setEmail('');
      setPassword('');
      setShowLoginForm(false);
    } catch (err: any) {
      setError(err.message || 'Помилка авторизації');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (user) {
    const isOwner = userRole === 'owner';
    return (
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium flex items-center gap-1 justify-end">
            {isOwner ? (
              <Crown className="w-4 h-4 text-yellow-500" />
            ) : (
              <Shield className="w-4 h-4 text-green-500" />
            )}
            {user.email}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOwner ? 'Власник' : 'Адміністратор'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Вийти</span>
        </Button>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <Card className="w-[300px] bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            Вхід для адміна
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Пароль</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-8"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setShowLoginForm(false)}
              >
                Скасувати
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Увійти'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setShowLoginForm(true)} className="gap-2">
      <UserIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Вхід</span>
    </Button>
  );
}
